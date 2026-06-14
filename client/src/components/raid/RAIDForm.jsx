import { useState } from 'react';
import { useMitigationSuggest } from '../../hooks/useAI.js';

const STAGES      = ['Quoting', 'CPQ', 'Order Management', 'Fulfilment', 'Billing', 'Collections'];
const WORKSTREAMS = ['CPQ', 'Order Mgmt', 'Billing', 'Collections', 'Integration', 'Data Migration', 'Reporting'];
const PRIORITIES  = ['Critical', 'High', 'Medium', 'Low'];
const STATUSES    = ['Open', 'In Progress', 'Escalated', 'Resolved', 'Closed'];
const CATEGORIES  = [
  { value: 'R', label: 'R — Risk' },
  { value: 'A', label: 'A — Assumption' },
  { value: 'I', label: 'I — Issue' },
  { value: 'D', label: 'D — Decision' },
];
const SCALE = [1, 2, 3, 4, 5];

const CAT_PILL = {
  R: 'bg-red-100 text-red-700',
  A: 'bg-purple-100 text-purple-700',
  I: 'bg-orange-100 text-orange-700',
  D: 'bg-blue-100 text-blue-700',
};
const STATUS_CHIP = {
  Open:          'bg-gray-100 text-gray-600',
  'In Progress': 'bg-blue-50 text-blue-600',
  Escalated:     'bg-red-50 text-red-600',
  Resolved:      'bg-green-50 text-green-600',
  Closed:        'bg-gray-200 text-gray-400',
};

const DEFAULTS = {
  category: 'R', title: '', description: '', mitigation: '',
  stage: 'Quoting', workstream: 'CPQ', owner: '',
  priority: 'Medium', status: 'Open',
  likelihood: 3, impact_score: 3, business_impact: '', due_date: '',
  depends_on: [],
};

function Input({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
const selectCls = `${inputCls} appearance-none`;

export default function RAIDForm({ item, onSubmit, onClose, loading, allItems = [] }) {
  const isEdit = !!item;
  const [form, setForm] = useState(isEdit ? {
    category: item.category, title: item.title, description: item.description ?? '',
    mitigation: item.mitigation ?? '', stage: item.stage, workstream: item.workstream,
    owner: item.owner, priority: item.priority, status: item.status,
    likelihood: item.likelihood ?? 3, impact_score: item.impact_score ?? 3,
    business_impact: item.business_impact ?? '', due_date: item.due_date ?? '',
    depends_on: item.depends_on ?? [],
  } : { ...DEFAULTS });
  const [errors, setErrors] = useState({});
  const [depSearch, setDepSearch] = useState('');

  const suggest = useMitigationSuggest();

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function toggleDep(id) {
    setForm((f) => ({
      ...f,
      depends_on: f.depends_on.includes(id)
        ? f.depends_on.filter((d) => d !== id)
        : [...f.depends_on, id],
    }));
  }

  async function handleSuggestMitigation() {
    if (!form.title || !form.description) return;
    try {
      const { suggestion } = await suggest.mutateAsync({
        title: form.title,
        stage: form.stage,
        workstream: form.workstream,
        description: form.description,
      });
      setForm((f) => ({ ...f, mitigation: suggestion }));
    } catch {
      // surface to user via suggest.error
    }
  }

  function validate() {
    const errs = {};
    if (!form.category) errs.category = 'Required';
    if (!form.title.trim()) errs.title = 'Required';
    if (!form.stage) errs.stage = 'Required';
    if (!form.workstream) errs.workstream = 'Required';
    if (!form.owner.trim()) errs.owner = 'Required';
    if (!form.priority) errs.priority = 'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    const payload = { ...form };
    payload.likelihood   = payload.likelihood   ? Number(payload.likelihood)   : null;
    payload.impact_score = payload.impact_score ? Number(payload.impact_score) : null;
    if (!payload.due_date) delete payload.due_date;
    onSubmit(payload);
  }

  const showRiskFields = form.category === 'R';
  const showMitigation = form.category === 'R' || form.category === 'I';

  const depOptions = allItems.filter((i) =>
    (!isEdit || i.id !== item?.id) &&
    (depSearch === '' || i.title.toLowerCase().includes(depSearch.toLowerCase()))
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Row 1: category + title */}
      <div className="grid grid-cols-4 gap-3">
        <Input label="Category" required>
          <select className={selectCls} value={form.category} onChange={set('category')}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          {errors.category && <p className="text-xs text-red-600 mt-0.5">{errors.category}</p>}
        </Input>
        <div className="col-span-3">
          <Input label="Title" required>
            <input
              className={`${inputCls} ${errors.title ? 'border-red-400' : ''}`}
              value={form.title}
              onChange={set('title')}
              placeholder="Concise, actionable title"
            />
            {errors.title && <p className="text-xs text-red-600 mt-0.5">{errors.title}</p>}
          </Input>
        </div>
      </div>

      {/* Row 2: stage + workstream + owner */}
      <div className="grid grid-cols-3 gap-3">
        <Input label="Stage" required>
          <select className={selectCls} value={form.stage} onChange={set('stage')}>
            {STAGES.map((s) => <option key={s}>{s}</option>)}
          </select>
          {errors.stage && <p className="text-xs text-red-600 mt-0.5">{errors.stage}</p>}
        </Input>
        <Input label="Workstream" required>
          <select className={selectCls} value={form.workstream} onChange={set('workstream')}>
            {WORKSTREAMS.map((w) => <option key={w}>{w}</option>)}
          </select>
          {errors.workstream && <p className="text-xs text-red-600 mt-0.5">{errors.workstream}</p>}
        </Input>
        <Input label="Owner" required>
          <input
            className={`${inputCls} ${errors.owner ? 'border-red-400' : ''}`}
            value={form.owner}
            onChange={set('owner')}
            placeholder="Full name"
          />
          {errors.owner && <p className="text-xs text-red-600 mt-0.5">{errors.owner}</p>}
        </Input>
      </div>

      {/* Row 3: priority + status + due date */}
      <div className="grid grid-cols-3 gap-3">
        <Input label="Priority" required>
          <select className={selectCls} value={form.priority} onChange={set('priority')}>
            {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </Input>
        <Input label="Status">
          <select className={selectCls} value={form.status} onChange={set('status')}>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Input>
        <Input label="Due Date">
          <input type="date" className={inputCls} value={form.due_date} onChange={set('due_date')} />
        </Input>
      </div>

      {/* Risk-specific: likelihood + impact */}
      {showRiskFields && (
        <div className="grid grid-cols-2 gap-3">
          <Input label="Likelihood (1 = very unlikely, 5 = near certain)">
            <select className={selectCls} value={form.likelihood} onChange={set('likelihood')}>
              {SCALE.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </Input>
          <Input label="Impact Score (1 = negligible, 5 = catastrophic)">
            <select className={selectCls} value={form.impact_score} onChange={set('impact_score')}>
              {SCALE.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </Input>
        </div>
      )}

      {/* Description */}
      <Input label="Description">
        <textarea
          className={`${inputCls} resize-none`}
          rows={3}
          value={form.description}
          onChange={set('description')}
          placeholder="What is the risk, issue, assumption, or decision?"
        />
      </Input>

      {/* Mitigation — with AI suggest button for risks/issues */}
      {showMitigation && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-gray-700">Mitigation</label>
            {form.category === 'R' && (
              <button
                type="button"
                onClick={handleSuggestMitigation}
                disabled={suggest.isPending || !form.title || !form.description}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                {suggest.isPending ? 'Generating…' : 'Suggest with AI'}
              </button>
            )}
          </div>
          {suggest.error && (
            <p className="mb-1 text-xs text-red-600">{suggest.error.message}</p>
          )}
          <textarea
            className={`${inputCls} resize-none`}
            rows={3}
            value={form.mitigation}
            onChange={set('mitigation')}
            placeholder="Steps to mitigate or resolve this item"
          />
        </div>
      )}

      {/* Business impact */}
      <Input label="Business Impact">
        <textarea
          className={`${inputCls} resize-none`}
          rows={2}
          value={form.business_impact}
          onChange={set('business_impact')}
          placeholder="Financial, schedule, or reputational impact if unaddressed"
        />
      </Input>

      {/* Dependencies */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-gray-700">Dependencies</label>
          {form.depends_on.length > 0 && (
            <span className="text-xs font-medium text-blue-600">{form.depends_on.length} selected</span>
          )}
        </div>
        <div className="rounded-md border border-gray-300 bg-white">
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              placeholder="Search items…"
              value={depSearch}
              onChange={(e) => setDepSearch(e.target.value)}
              className="w-full rounded border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <ul className="max-h-40 overflow-y-auto divide-y divide-gray-50">
            {depOptions.length === 0 ? (
              <li className="px-3 py-2 text-xs text-gray-400">
                {allItems.length <= 1 ? 'No other items available' : 'No matches'}
              </li>
            ) : (
              depOptions.map((dep) => (
                <li key={dep.id}>
                  <label className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={form.depends_on.includes(dep.id)}
                      onChange={() => toggleDep(dep.id)}
                    />
                    <span className={`flex-shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold ${CAT_PILL[dep.category]}`}>
                      {dep.category}
                    </span>
                    <span className="flex-1 min-w-0 truncate text-xs text-gray-800">{dep.title}</span>
                    <span className={`flex-shrink-0 rounded px-1.5 py-0.5 text-xs ${STATUS_CHIP[dep.status]}`}>
                      {dep.status}
                    </span>
                  </label>
                </li>
              ))
            )}
          </ul>
        </div>
        <p className="mt-1 text-xs text-gray-400">
          This item is blocked until all selected dependencies are resolved or closed.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Item'}
        </button>
      </div>
    </form>
  );
}
