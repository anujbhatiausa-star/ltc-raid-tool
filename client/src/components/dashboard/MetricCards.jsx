const CARDS = [
  {
    key: 'total',
    label: 'Open Items',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
      </svg>
    ),
    iconBg: 'bg-blue-50 text-blue-600',
    valueCls: 'text-gray-900',
  },
  {
    key: 'critical',
    label: 'Critical / Escalated',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
    iconBg: 'bg-red-50 text-red-600',
    valueCls: 'text-red-600',
  },
  {
    key: 'overdue',
    label: 'Overdue',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    iconBg: 'bg-amber-50 text-amber-600',
    valueCls: 'text-amber-600',
  },
  {
    key: 'resolved',
    label: 'Resolved This Week',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    iconBg: 'bg-green-50 text-green-600',
    valueCls: 'text-green-600',
  },
];

export default function MetricCards({ metrics }) {
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {CARDS.map(({ key, label, icon, iconBg, valueCls }) => (
        <div key={key} className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</span>
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>
              {icon}
            </span>
          </div>
          <p className={`text-3xl font-bold ${valueCls}`}>{metrics?.[key] ?? 0}</p>
        </div>
      ))}
    </div>
  );
}
