import { useState } from 'react';

const CATEGORY_PILL = {
  R: 'bg-red-100 text-red-700 border border-red-200',
  A: 'bg-purple-100 text-purple-700 border border-purple-200',
  I: 'bg-orange-100 text-orange-700 border border-orange-200',
  D: 'bg-blue-100 text-blue-700 border border-blue-200',
};
const CATEGORY_LABEL = { R: 'Risk', A: 'Assumption', I: 'Issue', D: 'Decision' };
const PRIORITY_PILL  = {
  Critical: 'bg-red-100 text-red-700',
  High:     'bg-amber-100 text-amber-700',
  Medium:   'bg-sky-100 text-sky-700',
  Low:      'bg-green-100 text-green-700',
};
const STATUS_PILL = {
  Open:         'bg-gray-100 text-gray-600',
  'In Progress':'bg-blue-100 text-blue-700',
  Escalated:    'bg-red-100 text-red-700',
  Resolved:     'bg-green-100 text-green-700',
  Closed:       'bg-gray-200 text-gray-500',
};

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const COLS = [
  { key: 'category',   label: 'Cat',        sortable: true,  width: 'w-16' },
  { key: 'title',      label: 'Title',       sortable: true,  width: '' },
  { key: 'stage',      label: 'Stage',       sortable: true,  width: 'w-36 hidden lg:table-cell' },
  { key: 'owner',      label: 'Owner',       sortable: true,  width: 'w-32 hidden md:table-cell' },
  { key: 'priority',   label: 'Priority',    sortable: true,  width: 'w-24' },
  { key: 'status',     label: 'Status',      sortable: true,  width: 'w-28' },
  { key: 'due_date',   label: 'Due',         sortable: true,  width: 'w-24 hidden sm:table-cell' },
  { key: '_actions',   label: '',            sortable: false, width: 'w-20' },
];

function SortIcon({ active, dir }) {
  if (!active) return <span className="ml-1 text-gray-300">↕</span>;
  return <span className="ml-1 text-blue-600">{dir === 'asc' ? '↑' : '↓'}</span>;
}

export default function RAIDTable({ items = [], onView, onEdit, onDelete, canEdit }) {
  const [sort, setSort] = useState({ col: 'created_at', dir: 'desc' });

  function toggleSort(col) {
    setSort((s) => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' });
  }

  const sorted = [...items].sort((a, b) => {
    const av = a[sort.col] ?? '';
    const bv = b[sort.col] ?? '';
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sort.dir === 'asc' ? cmp : -cmp;
  });

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white py-16 text-center">
        <p className="text-sm text-gray-400">No items match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              {COLS.map(({ key, label, sortable, width }) => (
                <th
                  key={key}
                  onClick={() => sortable && toggleSort(key)}
                  className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 ${width} ${sortable ? 'cursor-pointer select-none hover:text-gray-700' : ''}`}
                >
                  {label}
                  {sortable && <SortIcon active={sort.col === key} dir={sort.dir} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {sorted.map((item) => {
              const overdue = item.due_date && new Date(item.due_date) < new Date()
                && !['Resolved', 'Closed'].includes(item.status);
              return (
                <tr
                  key={item.id}
                  onClick={() => onView(item)}
                  className="cursor-pointer transition-colors hover:bg-blue-50"
                >
                  <td className="px-4 py-3">
                    <span
                      title={CATEGORY_LABEL[item.category]}
                      className={`inline-flex h-6 w-6 items-center justify-center rounded text-xs font-bold ${CATEGORY_PILL[item.category]}`}
                    >
                      {item.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 min-w-0">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-gray-900">{item.title}</div>
                      <div className="mt-0.5 truncate text-xs text-gray-400 hidden sm:block">{item.workstream}</div>
                    </div>
                  </td>
                  <td className="hidden lg:table-cell px-4 py-3 text-sm text-gray-600">{item.stage}</td>
                  <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-600">{item.owner}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${PRIORITY_PILL[item.priority]}`}>
                      {item.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_PILL[item.status]}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className={`hidden sm:table-cell px-4 py-3 text-xs ${overdue ? 'font-semibold text-red-600' : 'text-gray-500'}`}>
                    {fmt(item.due_date)}
                    {overdue && ' ⚠'}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    {canEdit && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onEdit(item)}
                          title="Edit"
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onDelete(item)}
                          title="Delete"
                          className="text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-gray-100 px-4 py-2 text-xs text-gray-400">
        {sorted.length} item{sorted.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
