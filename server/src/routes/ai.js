import { Router } from 'express';
import { supabase } from '../services/supabase.js';
import requireAuth from '../middleware/auth.js';
import {
  openai,
  generateExecBriefing,
  generateMitigationSuggestion,
  generateWeeklyDigest,
} from '../services/openai.js';

const router = Router();

// All AI endpoints require authentication (exec and pm roles can access)
router.use(requireAuth);

// ---------------------------------------------------------------------------
// POST /api/ai/exec-briefing
// Fetches open Critical/High RAID items and generates a steering committee
// briefing via GPT-4o using the LTC exec briefing prompt template.
// ---------------------------------------------------------------------------
router.post('/exec-briefing', async (req, res, next) => {
  try {
    const { data: items, error } = await supabase
      .from('raid_items')
      .select(
        'id, category, title, description, stage, workstream, owner, priority, status, due_date, business_impact'
      )
      .in('priority', ['Critical', 'High'])
      .not('status', 'in', '(Resolved,Closed)')
      .order('priority')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!items || items.length === 0) {
      return res.json({
        briefing: 'No open Critical or High priority items found. Programme risk posture is healthy.',
      });
    }

    const briefing = await generateExecBriefing(items);
    res.json({ briefing, item_count: items.length });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/suggest-mitigation
// Body: { title, stage, workstream, description }
// Returns a 2-3 sentence LTC-specific mitigation strategy.
// ---------------------------------------------------------------------------
router.post('/suggest-mitigation', async (req, res, next) => {
  try {
    const { title, stage, workstream, description } = req.body ?? {};

    if (!title || !description) {
      return res.status(400).json({ error: 'title and description are required' });
    }

    const suggestion = await generateMitigationSuggestion({
      title,
      stage: stage ?? 'Unknown',
      workstream: workstream ?? 'Unknown',
      description,
    });

    res.json({ suggestion });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/weekly-digest
// Aggregates programme stats then generates a stakeholder email draft.
// ---------------------------------------------------------------------------
router.post('/weekly-digest', async (req, res, next) => {
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const todayStr = now.toISOString().slice(0, 10);
    const twoWeeksStr = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const [totalRes, criticalRes, resolvedRes, dueSoonRes] = await Promise.all([
      // Total open items
      supabase
        .from('raid_items')
        .select('id', { count: 'exact', head: true })
        .not('status', 'in', '(Resolved,Closed)'),

      // Critical priority or Escalated status (open)
      supabase
        .from('raid_items')
        .select('id', { count: 'exact', head: true })
        .not('status', 'in', '(Resolved,Closed)')
        .or('priority.eq.Critical,status.eq.Escalated'),

      // Resolved/Closed in the last 7 days
      supabase
        .from('raid_items')
        .select('id', { count: 'exact', head: true })
        .in('status', ['Resolved', 'Closed'])
        .gte('resolved_at', weekAgo),

      // Items due in the next 14 days
      supabase
        .from('raid_items')
        .select('title, due_date, priority, status')
        .not('status', 'in', '(Resolved,Closed)')
        .gte('due_date', todayStr)
        .lte('due_date', twoWeeksStr)
        .order('due_date')
        .limit(5),
    ]);

    if (totalRes.error) throw totalRes.error;
    if (criticalRes.error) throw criticalRes.error;
    if (resolvedRes.error) throw resolvedRes.error;
    if (dueSoonRes.error) throw dueSoonRes.error;

    const dueSoonText =
      dueSoonRes.data?.length > 0
        ? dueSoonRes.data.map(i => `${i.title} [${i.due_date}]`).join('; ')
        : 'None in the next 14 days';

    const stats = {
      total: totalRes.count ?? 0,
      critical: criticalRes.count ?? 0,
      resolved: resolvedRes.count ?? 0,
      due_soon: dueSoonText,
    };

    const digest = await generateWeeklyDigest(stats);
    res.json({ digest, stats });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/query
// Body: { question: string }
// Fetches all RAID items, then streams a GPT-4o answer via SSE.
// Client reads: data: {"token":"..."} lines, terminated by data: [DONE]
// ---------------------------------------------------------------------------
router.post('/query', async (req, res, next) => {
  const { question } = req.body ?? {};

  if (!question?.trim()) {
    return res.status(400).json({ error: 'question is required' });
  }

  try {
    const { data: items, error: dbErr } = await supabase
      .from('raid_items')
      .select(
        'id, category, title, status, priority, stage, workstream, owner, due_date, business_impact'
      )
      .order('created_at', { ascending: false });

    if (dbErr) throw dbErr;

    // Set up SSE stream
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      stream: true,
      temperature: 0.3,
      max_tokens: 600,
      messages: [
        {
          role: 'system',
          content:
            'You are a programme governance assistant for a Lead to Cash ' +
            'transformation programme. You have access to the full RAID register. ' +
            'Answer the user\'s question clearly and concisely based on the data ' +
            'provided. Format your response in a clean readable way — use bullet ' +
            'points or a short table where appropriate. Always include item title, ' +
            'status, owner and stage in your answers.',
        },
        {
          role: 'user',
          content:
            `RAID register (${items.length} items):\n` +
            `${JSON.stringify(items, null, 2)}\n\n` +
            `Question: ${question}`,
        },
      ],
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content ?? '';
      if (token) {
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    } else {
      next(err);
    }
  }
});

export default router;
