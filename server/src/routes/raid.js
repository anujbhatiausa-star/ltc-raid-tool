import { Router } from 'express';
import { supabase } from '../services/supabase.js';
import requireAuth, { requirePM } from '../middleware/auth.js';

const router = Router();

// All RAID endpoints require a valid JWT
router.use(requireAuth);

// Fields that are user-editable and tracked in change_log
const TRACKED_FIELDS = [
  'category', 'title', 'description', 'mitigation', 'stage',
  'workstream', 'owner', 'priority', 'status', 'likelihood',
  'impact_score', 'business_impact', 'due_date', 'depends_on',
];

// Fields accepted on create / update (whitelist to prevent mass-assignment)
const WRITABLE_FIELDS = [...TRACKED_FIELDS];

const VALID_STATUSES = ['Open', 'In Progress', 'Escalated', 'Resolved', 'Closed'];

// ---------------------------------------------------------------------------
// GET /api/raid
// Query params: category, stage, workstream, priority, status, search
// ---------------------------------------------------------------------------
router.get('/', async (req, res, next) => {
  try {
    let query = supabase
      .from('raid_items')
      .select('*')
      .order('created_at', { ascending: false });

    const FILTER_COLS = ['category', 'stage', 'workstream', 'priority', 'status'];
    for (const col of FILTER_COLS) {
      if (req.query[col]) query = query.eq(col, req.query[col]);
    }

    if (req.query.search) {
      // ilike on title and description
      query = query.or(
        `title.ilike.%${req.query.search}%,description.ilike.%${req.query.search}%`
      );
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/raid/:id  — item + comments + change_log
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res, next) => {
  try {
    const [itemRes, commentsRes, logRes] = await Promise.all([
      supabase.from('raid_items').select('*').eq('id', req.params.id).single(),
      supabase
        .from('comments')
        .select('*')
        .eq('raid_item_id', req.params.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('change_log')
        .select('*')
        .eq('raid_item_id', req.params.id)
        .order('changed_at', { ascending: false }),
    ]);

    if (itemRes.error) {
      if (itemRes.error.code === 'PGRST116') {
        return res.status(404).json({ error: 'RAID item not found' });
      }
      throw itemRes.error;
    }

    res.json({
      ...itemRes.data,
      comments: commentsRes.data ?? [],
      change_log: logRes.data ?? [],
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/raid  — create item (PM only)
// ---------------------------------------------------------------------------
router.post('/', requirePM, async (req, res, next) => {
  try {
    const { category, title, stage, workstream, owner, priority } = req.body;

    // Required field check
    if (!category || !title || !stage || !workstream || !owner || !priority) {
      return res.status(400).json({
        error: 'category, title, stage, workstream, owner, and priority are required',
      });
    }

    const payload = {};
    for (const field of WRITABLE_FIELDS) {
      if (req.body[field] !== undefined) payload[field] = req.body[field];
    }

    payload.status = payload.status ?? 'Open';
    payload.created_by = req.user.id;
    payload.audit_log = [
      {
        action: 'created',
        by: req.userName,
        at: new Date().toISOString(),
      },
    ];

    const { data, error } = await supabase
      .from('raid_items')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PUT /api/raid/:id  — update item, log every changed field (PM only)
// ---------------------------------------------------------------------------
router.put('/:id', requirePM, async (req, res, next) => {
  try {
    // Fetch current state to diff against
    const { data: current, error: fetchErr } = await supabase
      .from('raid_items')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchErr) {
      if (fetchErr.code === 'PGRST116') {
        return res.status(404).json({ error: 'RAID item not found' });
      }
      throw fetchErr;
    }

    const updates = {};
    const changeLogRows = [];
    const auditEntries = Array.isArray(current.audit_log) ? [...current.audit_log] : [];
    const now = new Date().toISOString();

    for (const field of TRACKED_FIELDS) {
      if (req.body[field] === undefined) continue;

      const oldVal = current[field];
      const newVal = req.body[field];

      // Coerce to string for comparison (handles null, numbers, etc.)
      if (String(oldVal ?? '') === String(newVal ?? '')) continue;

      updates[field] = newVal;

      changeLogRows.push({
        raid_item_id: req.params.id,
        field,
        old_value: oldVal != null ? String(oldVal) : null,
        new_value: newVal != null ? String(newVal) : null,
        changed_by: req.userName,
        changed_at: now,
      });

      auditEntries.push({
        action: 'field_changed',
        field,
        from: oldVal != null ? String(oldVal) : null,
        to: newVal != null ? String(newVal) : null,
        by: req.userName,
        at: now,
      });
    }

    if (Object.keys(updates).length === 0) {
      return res.json(current); // nothing to update
    }

    // Auto-manage resolved_at when status changes
    if (updates.status) {
      if (updates.status === 'Resolved' || updates.status === 'Closed') {
        if (!current.resolved_at) updates.resolved_at = now;
      } else {
        updates.resolved_at = null;
      }
    }

    updates.audit_log = auditEntries;

    // Write change_log rows and the updated item atomically-ish
    // (Supabase doesn't support multi-table transactions via the JS client,
    //  so we write change_log first; if the item update fails the log rows
    //  are orphaned but harmless — the item remains unchanged.)
    if (changeLogRows.length > 0) {
      const { error: logErr } = await supabase.from('change_log').insert(changeLogRows);
      if (logErr) throw logErr;
    }

    const { data, error } = await supabase
      .from('raid_items')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/raid/:id  (PM only)
// ---------------------------------------------------------------------------
router.delete('/:id', requirePM, async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('raid_items')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/raid/bulk-status  — update status on multiple items (PM only)
// Body: { ids: string[], status: string }
// ---------------------------------------------------------------------------
router.patch('/bulk-status', requirePM, async (req, res, next) => {
  try {
    const { ids, status } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids must be a non-empty array' });
    }
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `status must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    // Fetch current statuses so change_log can record old values
    const { data: currentItems, error: fetchErr } = await supabase
      .from('raid_items')
      .select('id, status')
      .in('id', ids);

    if (fetchErr) throw fetchErr;

    const now = new Date().toISOString();
    const itemUpdates = { status };
    if (status === 'Resolved' || status === 'Closed') {
      itemUpdates.resolved_at = now;
    } else {
      itemUpdates.resolved_at = null;
    }

    const { data: updated, error: updateErr } = await supabase
      .from('raid_items')
      .update(itemUpdates)
      .in('id', ids)
      .select('id');

    if (updateErr) throw updateErr;

    // Build change_log rows using the fetched old statuses
    const currentMap = Object.fromEntries((currentItems ?? []).map(i => [i.id, i.status]));
    const changeLogRows = ids
      .filter(id => currentMap[id] !== status) // skip items already at target status
      .map(id => ({
        raid_item_id: id,
        field: 'status',
        old_value: currentMap[id] ?? null,
        new_value: status,
        changed_by: req.userName,
        changed_at: now,
      }));

    if (changeLogRows.length > 0) {
      await supabase.from('change_log').insert(changeLogRows);
    }

    res.json({ updated: updated?.length ?? 0 });
  } catch (err) {
    next(err);
  }
});

export default router;
