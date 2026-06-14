import AuditLog from './AuditLog.jsx';

const CATEGORY_LABEL = { R: 'Risk', A: 'Assumption', I: 'Issue', D: 'Decision' };
const CATEGORY_PILL  = {
  R: 'bg-red-100 text-red-700 border border-red-200',
  A: 'bg-purple-100 text-purple-700 border border-purple-200',
  I: 'bg-orange-100 text-orange-700 border border-orange-200',
  D: 'bg-blue-100 text-blue-700 border border-blue-200',
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

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Field({ label, value, mono }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-1">{label}</dt>
      <dd className={`text-sm text-gray-800 ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}

function Section({ title, content }) {
  if (!content) return null;
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">{title}</p>
      <p className="text-sm text-gray-800 whitespace-pre-wrap">{content}</p>
    </div>
  );
}

export default function RAIDCard({ item, onEdit, canEdit, allItems = [], onOpenItem }) {
  if (!item) return null;

  const isOverdue = item.due_date && new Date(item.due_date) < new Date()
    && !['Resolved', 'Closed'].includes(item.status);

  const deps = (item.depends_on ?? [])
    .map((id) => allItems.find((i) => i.id === id))
    .filter(Boolean);

  return (
    <div className="space-y-5">
      {/* Header badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${CATEGORY_PILL[item.category]}`}>
          {CATEGORY_LABEL[item.category]}
        </span>
        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${PRIORITY_PILL[item.priority]}`}>
          {item.priority}
        </span>
        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${STATUS_PILL[item.status]}`}>
          {item.status}
        </span>
        {isOverdue && (
          <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
            OVERDUE
          </span>
        )}
        {canEdit && (
          <button
            onClick={onEdit}
            className="ml-auto flex items-center gap-1 rounded border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
            </svg>
            Edit
          </button>
        )}
      </div>

      {/* Meta grid */}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
        <Field label="Stage"      value={item.stage} />
        <Field label="Workstream" value={item.workstream} />
        <Field label="Owner"      value={item.owner} />
        {item.likelihood   && <Field label="Likelihood"   value={`${item.likelihood} / 5`} />}
        {item.impact_score && <Field label="Impact Score" value={`${item.impact_score} / 5`} />}
        <Field label="Due Date"  value={item.due_date ? fmt(item.due_date) : null} />
        {item.resolved_at  && <Field label="Resolved"    value={fmt(item.resolved_at)} />}
        <Field label="Created"   value={fmt(item.created_at)} />
      </dl>

      {/* Text sections */}
      <div className="space-y-3">
        <Section title="Description"     content={item.description} />
        <Section title="Mitigation"      content={item.mitigation} />
        <Section title="Business Impact" content={item.business_impact} />
      </div>

      {/* Dependencies */}
      {deps.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Dependencies ({deps.length})
          </h3>
          <ul className="space-y-1.5">
            {deps.map((dep) => {
              const resolved = ['Resolved', 'Closed'].includes(dep.status);
              return (
                <li key={dep.id}>
                  <button
                    onClick={() => onOpenItem?.(dep.id)}
                    className="w-full flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left transition-colors hover:bg-gray-100"
                  >
                    <span className={`flex-shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold ${CATEGORY_PILL[dep.category]}`}>
                      {dep.category}
                    </span>
                    <span className={`flex-1 min-w-0 truncate text-sm ${resolved ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                      {dep.title}
                    </span>
                    <span className={`flex-shrink-0 rounded px-2 py-0.5 text-xs font-medium ${STATUS_PILL[dep.status]}`}>
                      {dep.status}
                    </span>
                    <span className={`flex-shrink-0 rounded px-2 py-0.5 text-xs font-medium ${PRIORITY_PILL[dep.priority]}`}>
                      {dep.priority}
                    </span>
                    {!resolved && (
                      <svg className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Comments */}
      {item.comments?.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Comments ({item.comments.length})
          </h3>
          <ul className="space-y-2">
            {item.comments.map((c) => (
              <li key={c.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-700">{c.user_name}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{c.text}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Audit log */}
      {item.audit_log?.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Change History
          </h3>
          <AuditLog entries={item.audit_log} />
        </div>
      )}
    </div>
  );
}
