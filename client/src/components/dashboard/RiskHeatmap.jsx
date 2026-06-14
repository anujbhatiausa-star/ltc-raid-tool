// 5×5 heatmap — likelihood (x) vs impact (y) for Risk items (category='R')

const SCORES = [1, 2, 3, 4, 5];

function cellColor(l, i) {
  const score = l * i;
  if (score >= 17) return 'bg-red-400 text-white';
  if (score >= 10) return 'bg-orange-300 text-white';
  if (score >= 5)  return 'bg-yellow-200 text-yellow-900';
  return 'bg-green-200 text-green-900';
}

function emptyCellColor(l, i) {
  const score = l * i;
  if (score >= 17) return 'bg-red-100';
  if (score >= 10) return 'bg-orange-100';
  if (score >= 5)  return 'bg-yellow-50';
  return 'bg-green-50';
}

export default function RiskHeatmap({ risks = [] }) {
  // Build count map keyed by "likelihood-impact"
  const countMap = {};
  for (const r of risks) {
    const key = `${r.likelihood}-${r.impact_score}`;
    countMap[key] = (countMap[key] ?? 0) + 1;
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-gray-900">
        Risk Heatmap
      </h2>
      <p className="mb-4 text-xs text-gray-500">Likelihood × Impact — open risks only</p>

      <div className="flex gap-2">
        {/* Y-axis label */}
        <div className="flex flex-col items-center justify-center">
          <span
            className="text-xs text-gray-400 font-medium"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}
          >
            Impact ↑
          </span>
        </div>

        <div>
          {/* Grid rows: impact 5→1 (high at top) */}
          {[...SCORES].reverse().map((impact) => (
            <div key={impact} className="flex items-center gap-1 mb-1">
              <span className="w-4 text-right text-xs text-gray-400">{impact}</span>
              {SCORES.map((likelihood) => {
                const count = countMap[`${likelihood}-${impact}`] ?? 0;
                return (
                  <div
                    key={likelihood}
                    title={`L${likelihood} × I${impact}: ${count} risk${count !== 1 ? 's' : ''}`}
                    className={`flex h-10 w-10 items-center justify-center rounded text-sm font-semibold transition-opacity ${
                      count > 0 ? cellColor(likelihood, impact) : emptyCellColor(likelihood, impact)
                    }`}
                  >
                    {count > 0 ? count : ''}
                  </div>
                );
              })}
            </div>
          ))}
          {/* X-axis */}
          <div className="flex items-center gap-1 mt-1">
            <span className="w-4" />
            {SCORES.map((l) => (
              <span key={l} className="w-10 text-center text-xs text-gray-400">{l}</span>
            ))}
          </div>
          <p className="mt-1 text-center text-xs text-gray-400">Likelihood →</p>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { cls: 'bg-green-200', label: 'Low (1–4)' },
          { cls: 'bg-yellow-200', label: 'Medium (5–9)' },
          { cls: 'bg-orange-300', label: 'High (10–16)' },
          { cls: 'bg-red-400', label: 'Critical (17–25)' },
        ].map(({ cls, label }) => (
          <span key={label} className="flex items-center gap-1 text-xs text-gray-600">
            <span className={`inline-block h-3 w-3 rounded ${cls}`} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
