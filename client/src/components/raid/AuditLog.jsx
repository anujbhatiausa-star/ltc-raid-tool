function fmtDate(str) {
  if (!str) return '';
  return new Date(str).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const ACTION_ICON = {
  created: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  ),
  field_changed: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  ),
  status_changed: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  ),
};

function Label({ entry }) {
  if (entry.action === 'created') return <span className="font-medium">Item created</span>;
  if (entry.action === 'field_changed') {
    return (
      <span>
        <span className="font-medium">{entry.field}</span> changed{' '}
        <span className="text-gray-400 line-through">{entry.from ?? '—'}</span>
        {' → '}
        <span className="font-medium text-gray-900">{entry.to ?? '—'}</span>
      </span>
    );
  }
  if (entry.action === 'status_changed') {
    return (
      <span>
        Status: <span className="text-gray-400 line-through">{entry.from}</span>
        {' → '}
        <span className="font-medium text-gray-900">{entry.to}</span>
      </span>
    );
  }
  return <span className="font-medium">{entry.action}</span>;
}

export default function AuditLog({ entries = [] }) {
  if (!entries.length) {
    return <p className="text-sm text-gray-400 py-2">No audit history yet.</p>;
  }

  return (
    <ol className="relative border-l border-gray-200 ml-3 space-y-4">
      {[...entries].reverse().map((entry, i) => (
        <li key={i} className="ml-5">
          <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-500 ring-4 ring-white">
            {ACTION_ICON[entry.action] ?? ACTION_ICON.field_changed}
          </span>
          <div className="text-sm text-gray-700">
            <Label entry={entry} />
            {entry.note && <p className="mt-0.5 text-xs text-gray-500 italic">"{entry.note}"</p>}
          </div>
          <p className="mt-0.5 text-xs text-gray-400">
            {entry.by} · {fmtDate(entry.at)}
          </p>
        </li>
      ))}
    </ol>
  );
}
