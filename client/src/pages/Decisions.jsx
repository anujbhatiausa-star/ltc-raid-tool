import { useState } from 'react';
import { useRAIDItems, useUpdateRAID } from '../hooks/useRAID.js';
import { useAuth } from '../hooks/useAuth.jsx';
import RAIDCard from '../components/raid/RAIDCard.jsx';
import RAIDForm from '../components/raid/RAIDForm.jsx';

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-16">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

const STATUS_PILL = {
  Open:         { cls: 'bg-amber-100 text-amber-700',  label: 'Pending Decision' },
  'In Progress':{ cls: 'bg-blue-100 text-blue-700',    label: 'In Review' },
  Escalated:    { cls: 'bg-red-100 text-red-700',      label: 'Escalated' },
  Resolved:     { cls: 'bg-green-100 text-green-700',  label: 'Decision Made' },
  Closed:       { cls: 'bg-gray-200 text-gray-500',    label: 'Archived' },
};

const PRIORITY_PILL = {
  Critical: 'bg-red-100 text-red-700',
  High:     'bg-amber-100 text-amber-700',
  Medium:   'bg-sky-100 text-sky-700',
  Low:      'bg-green-100 text-green-700',
};

const FILTER_STATUSES = ['All', 'Open', 'In Progress', 'Escalated', 'Resolved', 'Closed'];

function fmt(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Decisions() {
  const { role }  = useAuth();
  const canEdit   = role === 'pm';
  const [statusFilter, setStatusFilter] = useState('All');
  const [modal, setModal] = useState(null);

  const { data: items = [], isLoading, error } = useRAIDItems({ category: 'D' });
  const { data: allItems = [] } = useRAIDItems({});
  const updateRAID = useUpdateRAID();

  const filtered = statusFilter === 'All' ? items : items.filter((i) => i.status === statusFilter);

  // Sort: open/escalated first, then by priority, then created_at
  const PRIORITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  const OPEN_STATUSES  = new Set(['Open', 'In Progress', 'Escalated']);
  const sorted = [...filtered].sort((a, b) => {
    const aOpen = OPEN_STATUSES.has(a.status) ? 0 : 1;
    const bOpen = OPEN_STATUSES.has(b.status) ? 0 : 1;
    if (aOpen !== bOpen) return aOpen - bOpen;
    return (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
  });

  async function handleUpdate(payload) {
    await updateRAID.mutateAsync({ id: modal.item.id, ...payload });
    setModal(null);
  }

  const pendingCount  = items.filter((i) => OPEN_STATUSES.has(i.status)).length;
  const resolvedCount = items.filter((i) => i.status === 'Resolved').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Decisions Register</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Programme decisions — pending, approved, and archived
        </p>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-3">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm">
          <span className="font-semibold text-amber-700">{pendingCount}</span>
          <span className="ml-1 text-amber-600">awaiting decision</span>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm">
          <span className="font-semibold text-green-700">{resolvedCount}</span>
          <span className="ml-1 text-green-600">decisions made</span>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm">
          <span className="font-semibold text-gray-700">{items.length}</span>
          <span className="ml-1 text-gray-500">total</span>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-white p-1 w-fit">
        {FILTER_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {s}
            {s !== 'All' && (
              <span className="ml-1.5 text-current opacity-60">
                {items.filter((i) => i.status === s).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error.message}</div>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[0,1,2].map((i) => <div key={i} className="h-24 rounded-lg bg-gray-100 animate-pulse" />)}
        </div>
      )}

      {!isLoading && sorted.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white py-16 text-center">
          <p className="text-sm text-gray-400">No decisions match this filter.</p>
        </div>
      )}

      {/* Decision cards */}
      <div className="space-y-3">
        {sorted.map((item) => {
          const sp = STATUS_PILL[item.status] ?? STATUS_PILL.Open;
          const isResolved = item.status === 'Resolved' || item.status === 'Closed';
          return (
            <button
              key={item.id}
              onClick={() => setModal({ mode: 'view', item })}
              className="w-full rounded-lg border border-gray-200 bg-white p-5 text-left transition-all hover:border-gray-300 hover:bg-gray-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${sp.cls}`}>
                      {sp.label}
                    </span>
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${PRIORITY_PILL[item.priority]}`}>
                      {item.priority}
                    </span>
                  </div>
                  <h3 className={`text-sm font-semibold ${isResolved ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="mt-1 text-xs text-gray-500 line-clamp-2">{item.description}</p>
                  )}
                </div>
                {isResolved && (
                  <svg className="w-5 h-5 flex-shrink-0 text-green-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-400 border-t border-gray-100 pt-3">
                <span>{item.stage}</span>
                <span>·</span>
                <span>{item.workstream}</span>
                <span>·</span>
                <span>Owner: <span className="font-medium text-gray-600">{item.owner}</span></span>
                {item.resolved_at && (
                  <>
                    <span>·</span>
                    <span className="text-green-600">Decided: {fmt(item.resolved_at)}</span>
                  </>
                )}
                {item.due_date && !isResolved && (
                  <>
                    <span>·</span>
                    <span className={new Date(item.due_date) < new Date() ? 'text-red-600 font-semibold' : ''}>
                      Due: {fmt(item.due_date)}
                    </span>
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* View modal */}
      <Modal open={modal?.mode === 'view'} onClose={() => setModal(null)} title={modal?.item?.title ?? ''}>
        <RAIDCard
          item={modal?.item}
          canEdit={canEdit}
          onEdit={() => setModal({ mode: 'edit', item: modal.item })}
          allItems={allItems}
          onOpenItem={(id) => {
            const found = allItems.find((i) => i.id === id);
            if (found) setModal({ mode: 'view', item: found });
          }}
        />
      </Modal>

      {/* Edit modal */}
      <Modal open={modal?.mode === 'edit'} onClose={() => setModal(null)} title="Edit Decision">
        <RAIDForm
          item={modal?.item}
          onSubmit={handleUpdate}
          onClose={() => setModal(null)}
          loading={updateRAID.isPending}
          allItems={allItems}
        />
        {updateRAID.error && (
          <p className="mt-2 text-sm text-red-600">{updateRAID.error.message}</p>
        )}
      </Modal>
    </div>
  );
}
