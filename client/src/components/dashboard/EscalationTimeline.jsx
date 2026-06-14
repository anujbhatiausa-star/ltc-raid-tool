import { useNavigate } from 'react-router-dom';

const PRIORITY_PILL = {
  Critical: 'bg-red-100 text-red-700',
  High:     'bg-amber-100 text-amber-700',
  Medium:   'bg-sky-100 text-sky-700',
  Low:      'bg-green-100 text-green-700',
};

const STATUS_PILL = {
  Escalated:    'bg-red-100 text-red-700',
  'In Progress':'bg-blue-100 text-blue-700',
  Open:         'bg-gray-100 text-gray-600',
};

const CATEGORY_LABEL = { R: 'Risk', A: 'Assumption', I: 'Issue', D: 'Decision' };

function fmt(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isOverdue(dateStr) {
  return dateStr && new Date(dateStr) < new Date();
}

export default function EscalationTimeline({ items = [] }) {
  const navigate = useNavigate();
  const sorted = [...items].sort((a, b) => {
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date) - new Date(b.due_date);
  });

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-900">
          Escalation &amp; Critical Items
        </h2>
        <p className="text-sm text-gray-400 text-center py-8">No critical or escalated items. 🟢</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-900">
        Escalation &amp; Critical Items
        <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
          {sorted.length}
        </span>
      </h2>
      <div className="space-y-3">
        {sorted.map((item, idx) => {
          const overdue = isOverdue(item.due_date);
          return (
            <button
              key={item.id}
              onClick={() => navigate('/raid')}
              className="flex w-full items-start gap-4 rounded-lg border border-gray-100 bg-gray-50 p-3 text-left transition-colors hover:bg-gray-100"
            >
              {/* Timeline dot */}
              <div className="flex flex-col items-center gap-1 pt-1 flex-shrink-0">
                <div className={`h-3 w-3 rounded-full ${item.status === 'Escalated' || item.priority === 'Critical' ? 'bg-red-500' : 'bg-amber-400'}`} />
                {idx < sorted.length - 1 && <div className="w-px flex-1 bg-gray-200" style={{ height: 24 }} />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <span className="text-xs font-medium text-gray-500">{CATEGORY_LABEL[item.category]}</span>
                  <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${PRIORITY_PILL[item.priority]}`}>
                    {item.priority}
                  </span>
                  <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_PILL[item.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {item.status}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  <span>{item.stage}</span>
                  <span>·</span>
                  <span>{item.workstream}</span>
                  <span>·</span>
                  <span>{item.owner}</span>
                  {item.due_date && (
                    <>
                      <span>·</span>
                      <span className={overdue ? 'font-semibold text-red-600' : ''}>
                        {overdue ? 'Overdue — ' : 'Due '}
                        {fmt(item.due_date)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
