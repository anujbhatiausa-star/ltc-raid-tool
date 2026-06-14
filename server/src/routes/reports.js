import { Router } from 'express';
import { supabase } from '../services/supabase.js';
import requireAuth from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// Columns included in CSV export — in display order
const CSV_COLUMNS = [
  'id',
  'category',
  'title',
  'description',
  'mitigation',
  'stage',
  'workstream',
  'owner',
  'priority',
  'status',
  'likelihood',
  'impact_score',
  'business_impact',
  'due_date',
  'created_at',
  'updated_at',
  'resolved_at',
];

// Friendly header labels matching column order above
const CSV_HEADERS = [
  'ID',
  'Category',
  'Title',
  'Description',
  'Mitigation',
  'Stage',
  'Workstream',
  'Owner',
  'Priority',
  'Status',
  'Likelihood (1-5)',
  'Impact Score (1-5)',
  'Business Impact',
  'Due Date',
  'Created At',
  'Updated At',
  'Resolved At',
];

function csvCell(val) {
  if (val == null) return '';
  const str = String(val);
  // Wrap in double-quotes if the value contains commas, quotes, or newlines
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ---------------------------------------------------------------------------
// GET /api/reports/export-csv
// Optional query params: category, stage, workstream, priority, status
// Returns a UTF-8 CSV file with all matching RAID items.
// ---------------------------------------------------------------------------
router.get('/export-csv', async (req, res, next) => {
  try {
    let query = supabase
      .from('raid_items')
      .select(CSV_COLUMNS.join(','))
      .order('stage')
      .order('priority')
      .order('created_at');

    const FILTER_COLS = ['category', 'stage', 'workstream', 'priority', 'status'];
    for (const col of FILTER_COLS) {
      if (req.query[col]) query = query.eq(col, req.query[col]);
    }

    const { data, error } = await query;
    if (error) throw error;

    const header = CSV_HEADERS.map(csvCell).join(',');
    const rows = (data ?? []).map(item =>
      CSV_COLUMNS.map(col => csvCell(item[col])).join(',')
    );

    const csv = [header, ...rows].join('\r\n');
    const filename = `ltc-raid-export-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // Prepend UTF-8 BOM so Excel opens the file correctly without import wizard
    res.send('﻿' + csv);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/reports/export-pdf  — placeholder for Phase 2
// ---------------------------------------------------------------------------
router.get('/export-pdf', (req, res) => {
  res.status(501).json({
    error: 'PDF export is not yet implemented. Use /export-csv or the AI exec briefing endpoint.',
  });
});

export default router;
