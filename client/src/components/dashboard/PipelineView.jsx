import { useNavigate } from 'react-router-dom';

const STAGES = ['Quoting', 'CPQ', 'Order Management', 'Fulfilment', 'Billing', 'Collections'];

const CARD_STATE = {
  critical: {
    bg: '#fff5f5',
    border: '#fecaca',
    count: '#e24b4a',
    bar: '#e24b4a',
  },
  high: {
    bg: '#fffbf0',
    border: '#fde68a',
    count: '#ba7517',
    bar: '#f59e0b',
  },
  complete: {
    bg: '#f0faf4',
    border: '#bbf7d0',
    count: '#3b6d11',
    bar: '#22c55e',
  },
  default: {
    bg: '#f9fafb',
    border: '#e5e7eb',
    count: '#185fa5',
    bar: '#3b82f6',
  },
};

export default function PipelineView({ items = [] }) {
  const navigate = useNavigate();

  const resolvedSet = new Set(
    items.filter((i) => ['Resolved', 'Closed'].includes(i.status)).map((i) => i.id)
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-900">
        Programme Pipeline — Items by Stage
      </h2>

      <div className="overflow-x-auto">
        <div className="grid min-w-[640px] grid-cols-6 gap-3">
          {STAGES.map((stage, idx) => {
            const stageItems = items.filter((i) => i.stage === stage);
            const total = stageItems.length;
            const resolved = stageItems.filter((i) =>
              ['Resolved', 'Closed'].includes(i.status)
            ).length;
            const openItems = stageItems.filter(
              (i) => !['Resolved', 'Closed'].includes(i.status)
            );
            const critical = openItems.filter(
              (i) => i.priority === 'Critical' || i.status === 'Escalated'
            ).length;
            const high = openItems.filter((i) => i.priority === 'High').length;
            const blocked = openItems.filter(
              (i) => (i.depends_on ?? []).some((id) => !resolvedSet.has(id))
            ).length;
            const allResolved = total > 0 && resolved === total;
            const resolvedPct = total > 0 ? Math.round((resolved / total) * 100) : 0;

            const stateKey =
              critical > 0 ? 'critical'
              : allResolved ? 'complete'
              : high > 0 ? 'high'
              : 'default';
            const style = CARD_STATE[stateKey];

            return (
              <button
                key={stage}
                onClick={() => navigate(`/raid?stage=${encodeURIComponent(stage)}`)}
                style={{
                  height: 160,
                  backgroundColor: style.bg,
                  borderColor: style.border,
                }}
                className="relative flex flex-col overflow-hidden rounded-lg border text-left transition-all hover:brightness-95 hover:shadow-md"
              >
                {/* Top: stage label + name */}
                <div className="px-3 pt-2.5">
                  <span className="block text-[10px] font-medium leading-none text-gray-400">
                    Stage {idx + 1}
                  </span>
                  <span className="mt-0.5 block truncate text-[13px] font-semibold leading-tight text-gray-800">
                    {stage}
                  </span>
                </div>

                {/* Centre: count */}
                <div className="flex flex-1 items-center justify-center">
                  <span
                    style={{ color: style.count, fontSize: 32, fontWeight: 700, lineHeight: 1 }}
                  >
                    {total}
                  </span>
                </div>

                {/* Status indicators */}
                <div className="flex min-h-[20px] flex-wrap items-center gap-1 px-3 pb-1.5">
                  {critical > 0 && (
                    <span className="flex items-center gap-0.5">
                      <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                      <span className="text-[11px] font-medium text-red-700">{critical}</span>
                    </span>
                  )}
                  {high > 0 && (
                    <span className="flex items-center gap-0.5">
                      <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
                      <span className="text-[11px] font-medium text-amber-700">{high}</span>
                    </span>
                  )}
                  {blocked > 0 && (
                    <span className="rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium text-amber-700">
                      {blocked} blocked
                    </span>
                  )}
                  {allResolved && (
                    <span className="text-xs font-medium text-green-600">✓ done</span>
                  )}
                  {total === 0 && (
                    <span className="text-[10px] text-gray-400">no items</span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="px-3 pb-2.5">
                  <div className="mb-0.5 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400">{resolvedPct}% resolved</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      style={{
                        width: `${resolvedPct}%`,
                        backgroundColor: style.bar,
                        transition: 'width 0.4s ease',
                      }}
                      className="h-full rounded-full"
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-gray-500">
        {[
          { bg: '#fff5f5', border: '#fecaca', label: 'Critical or Escalated' },
          { bg: '#fffbf0', border: '#fde68a', label: 'High priority items' },
          { bg: '#f0faf4', border: '#bbf7d0', label: 'Stage complete' },
          { bg: '#f9fafb', border: '#e5e7eb', label: 'Items in progress' },
        ].map(({ bg, border, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 flex-shrink-0 rounded-sm"
              style={{ backgroundColor: bg, border: `1px solid ${border}` }}
            />
            {label}
          </span>
        ))}
        <span className="ml-auto hidden text-gray-400 sm:block">
          Click a stage to filter the RAID Log
        </span>
      </div>
    </div>
  );
}
