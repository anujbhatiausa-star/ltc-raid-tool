import { useState } from 'react';
import { useMitigationSuggest } from '../../hooks/useAI.js';

const STAGES      = ['Quoting', 'CPQ', 'Order Management', 'Fulfilment', 'Billing', 'Collections'];
const WORKSTREAMS = ['CPQ', 'Order Mgmt', 'Billing', 'Collections', 'Integration', 'Data Migration', 'Reporting'];

const inputCls = 'w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

export default function MitigationSuggest() {
  const [form, setForm] = useState({ title: '', stage: 'Quoting', workstream: 'CPQ', description: '' });
  const { mutate, data, isPending, error, reset } = useMitigationSuggest();

  function set(field) { return (e) => setForm((f) => ({ ...f, [field]: e.target.value })); }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.title || !form.description) return;
    reset();
    mutate(form);
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">AI Mitigation Advisor</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Describe a risk and get a practical LTC-specific mitigation strategy.
          </p>
        </div>
        <span className="flex-shrink-0 rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">GPT-4o</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Stage</label>
            <select className={inputCls} value={form.stage} onChange={set('stage')}>
              {STAGES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Workstream</label>
            <select className={inputCls} value={form.workstream} onChange={set('workstream')}>
              {WORKSTREAMS.map((w) => <option key={w}>{w}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Risk Title <span className="text-red-500">*</span></label>
          <input className={inputCls} value={form.title} onChange={set('title')} placeholder="Concise risk title" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
          <textarea className={`${inputCls} resize-none`} rows={3} value={form.description} onChange={set('description')} placeholder="Describe the risk in detail" />
        </div>
        <button
          type="submit"
          disabled={isPending || !form.title || !form.description}
          className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          {isPending ? 'Generating…' : 'Suggest Mitigation'}
        </button>
      </form>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error.message}</div>
      )}

      {data?.suggestion && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Suggested Mitigation</p>
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-gray-800 leading-relaxed">
            {data.suggestion}
          </div>
        </div>
      )}
    </div>
  );
}
