const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const STATUSES   = ['Open', 'In Progress', 'Escalated', 'Resolved', 'Closed'];

const PRIORITY_BG = {
  Critical: 'bg-red-50 border-red-200',
  High:     'bg-amber-50 border-amber-200',
  Medium:   'bg-sky-50 border-sky-200',
  Low:      'bg-green-50 border-green-200',
};

const PRIORITY_TEXT = {
  Critical: 'text-red-700 font-semibold',
  High:     'text-amber-700 font-semibold',
  Medium:   'text-sky-700 font-semibold',
  Low:      'text-green-700 font-semibold',
};

const STATUS_COUNT_BG = {
  Open:         'bg-gray-100 text-gray-700',
  'In Progress':'bg-blue-100 text-blue-700',
  Escalated:    'bg-red-100 text-red-700',
  Resolved:     'bg-green-100 text-green-700',
  Closed:       'bg-gray-200 text-gray-500',
};

export default function PriorityMatrix({ items = [] }) {
  const matrix = {};
  for (const priority of PRIORITIES) {
    matrix[priority] = {};
    for (const status of STATUSES) {
      matrix[priority][status] = items.filter(
        (i) => i.priority === priority && i.status === status
      ).length;
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-gray-900">
        Priority × Status Matrix
      </h2>
      <p className="mb-4 text-xs text-gray-500">All items</p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="pb-2 text-left text-gray-500 font-medium w-24">Priority</th>
              {STATUSES.map((s) => (
                <th key={s} className="pb-2 text-center text-gray-500 font-medium px-1">{s}</th>
              ))}
              <th className="pb-2 text-center text-gray-500 font-medium px-1">Total</th>
            </tr>
          </thead>
          <tbody className="space-y-1">
            {PRIORITIES.map((priority) => {
              const row = matrix[priority];
              const total = Object.values(row).reduce((a, b) => a + b, 0);
              return (
                <tr key={priority}>
                  <td className={`rounded-l py-2 pl-3 pr-2 text-left border-l border-y ${PRIORITY_BG[priority]}`}>
                    <span className={PRIORITY_TEXT[priority]}>{priority}</span>
                  </td>
                  {STATUSES.map((status) => {
                    const count = row[status];
                    return (
                      <td
                        key={status}
                        className={`py-2 px-1 text-center border-y ${PRIORITY_BG[priority]}`}
                      >
                        {count > 0 ? (
                          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${STATUS_COUNT_BG[status]}`}>
                            {count}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className={`rounded-r py-2 px-2 text-center border-r border-y font-semibold ${PRIORITY_BG[priority]} ${PRIORITY_TEXT[priority]}`}>
                    {total}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
