import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useWeeklyDigest } from '../hooks/useAI.js';
import { useRAIDItems } from '../hooks/useRAID.js';
import ExecBriefing from '../components/ai/ExecBriefing.jsx';
import MitigationSuggest from '../components/ai/MitigationSuggest.jsx';

const CATEGORY_PILL = {
  R: 'bg-red-100 text-red-700',
  A: 'bg-purple-100 text-purple-700',
  I: 'bg-orange-100 text-orange-700',
  D: 'bg-blue-100 text-blue-700',
};
const PRIORITY_PILL = {
  Critical: 'bg-red-100 text-red-700',
  High:     'bg-amber-100 text-amber-700',
  Medium:   'bg-sky-100 text-sky-700',
  Low:      'bg-green-100 text-green-700',
};
const STATUS_PILL = {
  Open:          'bg-gray-100 text-gray-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  Escalated:     'bg-red-100 text-red-700',
  Resolved:      'bg-green-100 text-green-700',
  Closed:        'bg-gray-200 text-gray-500',
};

const SUGGESTED_QUERIES = [
  'Show me all resolved and closed risks',
  'Which critical items are overdue?',
  'What is Karin Maday responsible for?',
  'Summarise all open issues in Billing',
  'Which stages have the most open items?',
  'What decisions are still pending?',
];

function Section({ title, description, children }) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function Divider() {
  return <hr className="border-gray-200" />;
}

// ── Markdown renderer (no external libs) ─────────────────────────────────
function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
      : part
  );
}

function parseCells(line) {
  return line.split('|').slice(1, -1).map((c) => c.trim());
}

function isSeparator(line) {
  return parseCells(line).every((c) => /^[-:\s]+$/.test(c));
}

function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let i = 0, key = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines.filter((l) => !isSeparator(l)).map(parseCells);
      if (rows.length >= 1) {
        const [header, ...body] = rows;
        elements.push(
          <div key={key++} className="my-3 overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  {header.map((cell, j) => (
                    <th key={j} className="border-b border-gray-200 px-2.5 py-1.5 text-left font-medium text-gray-700 whitespace-nowrap">
                      {renderInline(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 1 ? 'bg-gray-50' : 'bg-white'}>
                    {row.map((cell, j) => (
                      <td key={j} className="border-b border-gray-100 px-2.5 py-1.5 text-gray-700">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }
    if (/^[-•]\s/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^[-•]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-•]\s/, ''));
        i++;
      }
      elements.push(
        <ul key={key++} className="my-2 list-disc space-y-0.5 pl-5">
          {items.map((item, j) => (
            <li key={j} className="text-sm text-gray-800">{renderInline(item)}</li>
          ))}
        </ul>
      );
      continue;
    }
    if (trimmed === '' || /^-{3,}$/.test(trimmed)) { i++; continue; }
    if (trimmed.startsWith('#')) {
      elements.push(
        <p key={key++} className="my-1 text-sm font-semibold text-gray-900">
          {renderInline(trimmed.replace(/^#+\s*/, ''))}
        </p>
      );
      i++; continue;
    }
    elements.push(
      <p key={key++} className="my-1 text-sm text-gray-800">{renderInline(line)}</p>
    );
    i++;
  }
  return elements;
}

// ── Query history entry ───────────────────────────────────────────────────
function HistoryEntry({ entry }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-gray-100 bg-white overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-xs text-gray-600 truncate flex-1 mr-3">{entry.question}</span>
        <svg
          className={`w-3.5 h-3.5 flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-gray-100 px-4 py-3 leading-relaxed">
          {renderMarkdown(entry.answer)}
        </div>
      )}
    </div>
  );
}

// ── AI Query Assistant ────────────────────────────────────────────────────
function QueryAssistant() {
  const { session } = useAuth();
  const [question, setQuestion] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [current, setCurrent] = useState(null); // { question, answer }
  const [history, setHistory] = useState([]);   // max 5 completed entries
  const [error, setError] = useState('');
  const responseRef = useRef(null);

  // Scroll new response into view
  useEffect(() => {
    if (current?.question && responseRef.current) {
      responseRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [current?.question]);

  async function submit(q) {
    const text = (q ?? question).trim();
    if (!text || streaming) return;

    // Archive completed response into history before starting a new one
    if (current?.answer) {
      setHistory((prev) => [current, ...prev].slice(0, 5));
    }

    setQuestion('');
    setError('');
    setCurrent({ question: text, answer: '' });
    setStreaming(true);

    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${base}/api/ai/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ question: text }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullAnswer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') continue;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.token) {
              fullAnswer += parsed.token;
              setCurrent((prev) => ({ ...prev, answer: fullAnswer }));
            }
          } catch (e) {
            if (e.constructor.name !== 'SyntaxError') throw e;
          }
        }
      }
    } catch (err) {
      setError(err.message);
      setCurrent(null);
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Input card */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) submit(); }}
            placeholder="e.g. Show me all resolved risks,  What are the critical items in Billing,  Which items does Karin Maday own?"
            disabled={streaming}
            className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
          />
          <button
            onClick={() => submit()}
            disabled={!question.trim() || streaming}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {streaming ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            )}
            {streaming ? 'Asking…' : 'Ask'}
          </button>
        </div>

        {/* Suggestion chips */}
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTED_QUERIES.map((sq) => (
            <button
              key={sq}
              onClick={() => submit(sq)}
              disabled={streaming}
              className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sq}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Current response card */}
      {current && (
        <div ref={responseRef} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          {/* Response header */}
          <div className="flex items-center justify-between border-l-4 border-blue-500 bg-blue-50 px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              {streaming && (
                <div className="h-3 w-3 flex-shrink-0 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              )}
              <p className="text-sm font-medium text-gray-800 truncate">{current.question}</p>
            </div>
            <div className="ml-3 flex flex-shrink-0 items-center gap-2">
              <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">GPT-4o</span>
              {!streaming && current.answer && (
                <button
                  onClick={() => navigator.clipboard?.writeText(current.answer)}
                  title="Copy answer"
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  </svg>
                  Copy
                </button>
              )}
            </div>
          </div>
          {/* Response body */}
          <div className="p-4 leading-relaxed">
            {current.answer
              ? (
                <>
                  {renderMarkdown(current.answer)}
                  {streaming && (
                    <span className="ml-0.5 inline-block h-[1em] w-1.5 animate-pulse rounded-sm bg-blue-500 align-text-bottom" />
                  )}
                </>
              )
              : streaming && <span className="text-sm text-gray-400 italic">Thinking…</span>
            }
          </div>
        </div>
      )}

      {/* Query history */}
      {history.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Previous queries
          </p>
          <div className="space-y-2">
            {history.map((entry, i) => (
              <HistoryEntry key={i} entry={entry} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Weekly Digest ─────────────────────────────────────────────────────────
function WeeklyDigest() {
  const { mutate, data, isPending, error, reset } = useWeeklyDigest();
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Weekly Stakeholder Digest</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Generates a stakeholder email draft with programme status summary.
          </p>
        </div>
        <span className="flex-shrink-0 rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">GPT-4o</span>
      </div>

      <button
        onClick={() => { reset(); mutate(); }}
        disabled={isPending}
        className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
        {isPending ? 'Generating…' : 'Generate Digest'}
      </button>

      {isPending && (
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          Aggregating stats and drafting email…
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error.message}</div>
      )}

      {data && (
        <div className="mt-4 space-y-3">
          {data.stats && (
            <div className="flex flex-wrap gap-3">
              {[
                { label: 'Open items',         value: data.stats.total },
                { label: 'Critical/Escalated', value: data.stats.critical, cls: 'text-red-600' },
                { label: 'Resolved this week', value: data.stats.resolved, cls: 'text-green-600' },
              ].map(({ label, value, cls }) => (
                <span key={label} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs">
                  <span className={`font-bold text-sm ${cls ?? 'text-gray-900'}`}>{value}</span>
                  <span className="ml-1 text-gray-500">{label}</span>
                </span>
              ))}
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Email Draft</p>
              <button
                onClick={() => navigator.clipboard?.writeText(data.digest)}
                className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
                Copy
              </button>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed font-mono">
              {data.digest}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Dependency Graph ──────────────────────────────────────────────────────
function DependencyGraph() {
  const { data: items = [], isLoading } = useRAIDItems({});

  if (isLoading) {
    return <div className="h-32 rounded-lg bg-gray-100 animate-pulse" />;
  }

  const itemMap = new Map(items.map((i) => [i.id, i]));

  const blockerMap = new Map();
  for (const item of items) {
    for (const depId of (item.depends_on ?? [])) {
      if (!blockerMap.has(depId)) blockerMap.set(depId, []);
      blockerMap.get(depId).push(item);
    }
  }

  const blockerIds = [...blockerMap.keys()];

  if (blockerIds.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <p className="text-sm text-gray-400">No dependencies have been configured yet.</p>
        <p className="text-xs text-gray-400 mt-1">Add dependencies to RAID items using the edit form in the RAID Log.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="space-y-3">
        {blockerIds.map((blockerId) => {
          const blocker = itemMap.get(blockerId);
          if (!blocker) return null;
          const dependents = blockerMap.get(blockerId);
          const isResolved = ['Resolved', 'Closed'].includes(blocker.status);
          return (
            <div key={blockerId} className="overflow-hidden rounded-lg border border-gray-100">
              <div className={`flex items-center gap-2 px-4 py-3 ${isResolved ? 'bg-green-50' : 'bg-red-50'}`}>
                <svg className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <span className={`flex-shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold ${CATEGORY_PILL[blocker.category]}`}>
                  {blocker.category}
                </span>
                <span className={`flex-1 min-w-0 text-sm font-medium truncate ${isResolved ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                  {blocker.title}
                </span>
                <span className={`flex-shrink-0 rounded px-2 py-0.5 text-xs font-medium ${STATUS_PILL[blocker.status]}`}>
                  {blocker.status}
                </span>
              </div>
              <ul className="divide-y divide-gray-50 bg-white">
                {dependents.map((dep) => (
                  <li key={dep.id} className="flex items-center gap-2 px-4 py-2.5 pl-10">
                    <svg className="w-3 h-3 flex-shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    <span className={`flex-shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold ${CATEGORY_PILL[dep.category]}`}>
                      {dep.category}
                    </span>
                    <span className="flex-1 min-w-0 truncate text-sm text-gray-700">{dep.title}</span>
                    <span className={`flex-shrink-0 rounded px-2 py-0.5 text-xs font-medium ${STATUS_PILL[dep.status]}`}>
                      {dep.status}
                    </span>
                    <span className={`flex-shrink-0 rounded px-2 py-0.5 text-xs font-medium ${PRIORITY_PILL[dep.priority]}`}>
                      {dep.priority}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-gray-400">
        Locked items at the top must be resolved before their dependents (indented below) can proceed.
      </p>
    </div>
  );
}

// ── CSV Export ────────────────────────────────────────────────────────────
function CSVExport() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleExport(filters = {}) {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams(filters);
      const base = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const url  = `${base}/api/reports/export-csv${params.size ? '?' + params : ''}`;
      const res  = await fetch(url, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob     = await res.blob();
      const dlUrl    = URL.createObjectURL(blob);
      const a        = document.createElement('a');
      a.href         = dlUrl;
      a.download     = `ltc-raid-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(dlUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">CSV Export</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Download all RAID items as a spreadsheet-ready CSV file.
          </p>
        </div>
        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">Excel-ready</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleExport()}
          disabled={loading}
          className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          {loading ? 'Exporting…' : 'Export All Items'}
        </button>
        {['Open', 'Escalated', 'Critical'].map((f) => (
          <button
            key={f}
            onClick={() => handleExport(f === 'Critical' ? { priority: 'Critical' } : { status: f })}
            disabled={loading}
            className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-60"
          >
            {f} only
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-3 rounded-md bg-red-50 border border-red-200 p-2.5 text-sm text-red-700">{error}</div>
      )}

      <p className="mt-3 text-xs text-gray-400">
        Includes UTF-8 BOM for correct encoding in Microsoft Excel.
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function Reports() {
  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Reports &amp; AI Insights</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          AI-generated programme intelligence powered by GPT-4o · Data export
        </p>
      </div>

      <Section
        title="Query Assistant"
        description="Ask any question about the RAID register in plain English. GPT-4o answers using live data."
      >
        <QueryAssistant />
      </Section>

      <Divider />

      <Section
        title="Exec Intelligence"
        description="AI-generated outputs for steering committee and stakeholder communications."
      >
        <div className="space-y-4">
          <ExecBriefing />
          <WeeklyDigest />
        </div>
      </Section>

      <Divider />

      <Section
        title="Risk Mitigation Advisor"
        description="Describe any risk and get a practical LTC-specific mitigation strategy from GPT-4o."
      >
        <MitigationSuggest />
      </Section>

      <Divider />

      <Section
        title="Data Export"
        description="Export RAID items for offline analysis, governance reporting, or stakeholder packs."
      >
        <CSVExport />
      </Section>

      <Divider />

      <Section
        title="Dependency Map"
        description="Visual overview of blocking relationships — items at the top must be resolved before their dependents can proceed."
      >
        <DependencyGraph />
      </Section>
    </div>
  );
}
