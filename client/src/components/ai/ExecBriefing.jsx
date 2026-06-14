import { useExecBriefing } from '../../hooks/useAI.js';

export default function ExecBriefing() {
  const { mutate, data, isPending, error, reset } = useExecBriefing();

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">AI Executive Briefing</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Generates a 3-paragraph steering committee summary of all open Critical &amp; High items.
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
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        {isPending ? 'Generating…' : 'Generate Briefing'}
      </button>

      {isPending && (
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          Analysing open items and drafting briefing…
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error.message}
        </div>
      )}

      {data?.briefing && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Steering Committee Brief · {data.item_count} items analysed
            </p>
            <button
              onClick={() => navigator.clipboard?.writeText(data.briefing)}
              className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
              </svg>
              Copy
            </button>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
            {data.briefing}
          </div>
        </div>
      )}
    </div>
  );
}
