import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { useRAIDItems, useRAIDItem, useCreateRAID, useUpdateRAID, useDeleteRAID } from '../hooks/useRAID.js';
import RAIDTable from '../components/raid/RAIDTable.jsx';
import RAIDForm from '../components/raid/RAIDForm.jsx';
import RAIDCard from '../components/raid/RAIDCard.jsx';

// ── Inline modal ────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-16">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative w-full ${wide ? 'max-w-3xl' : 'max-w-2xl'} rounded-xl border border-gray-200 bg-white`}>
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
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

// ── Delete confirm ──────────────────────────────────────────────────────────
function DeleteConfirm({ item, onConfirm, onCancel, loading }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-700">
        Are you sure you want to delete <span className="font-semibold">"{item?.title}"</span>?
        This action cannot be undone and will remove all comments and change history.
      </p>
      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
        >
          {loading ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  );
}

// ── Filter bar ───────────────────────────────────────────────────────────────
const STAGES      = ['', 'Quoting', 'CPQ', 'Order Management', 'Fulfilment', 'Billing', 'Collections'];
const CATEGORIES  = ['', 'R', 'A', 'I', 'D'];
const PRIORITIES  = ['', 'Critical', 'High', 'Medium', 'Low'];
const STATUSES    = ['', 'Open', 'In Progress', 'Escalated', 'Resolved', 'Closed'];
const CAT_LABELS  = { '': 'All', R: 'Risk', A: 'Assumption', I: 'Issue', D: 'Decision' };

const selectCls = 'rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

function FilterBar({ filters, onChange, onClear }) {
  const hasFilters = Object.values(filters).some(Boolean);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <input
          type="text"
          placeholder="Search title or description…"
          value={filters.search}
          onChange={(e) => onChange('search', e.target.value)}
          className={`${selectCls} pl-8 w-56`}
        />
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      </div>

      <select className={selectCls} value={filters.category} onChange={(e) => onChange('category', e.target.value)}>
        {CATEGORIES.map((c) => <option key={c} value={c}>{c ? CAT_LABELS[c] : 'Category'}</option>)}
      </select>

      <select className={selectCls} value={filters.stage} onChange={(e) => onChange('stage', e.target.value)}>
        {STAGES.map((s) => <option key={s} value={s}>{s || 'Stage'}</option>)}
      </select>

      <select className={selectCls} value={filters.priority} onChange={(e) => onChange('priority', e.target.value)}>
        {PRIORITIES.map((p) => <option key={p} value={p}>{p || 'Priority'}</option>)}
      </select>

      <select className={selectCls} value={filters.status} onChange={(e) => onChange('status', e.target.value)}>
        {STATUSES.map((s) => <option key={s} value={s}>{s || 'Status'}</option>)}
      </select>

      {hasFilters && (
        <button onClick={onClear} className="text-xs text-gray-500 hover:text-gray-800 underline">
          Clear
        </button>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
const EMPTY_FILTERS = { search: '', category: '', stage: '', workstream: '', priority: '', status: '' };

export default function RAIDLog() {
  const { role } = useAuth();
  const canEdit  = role === 'pm';
  const [searchParams] = useSearchParams();

  const [filters, setFilters] = useState(() => ({
    ...EMPTY_FILTERS,
    stage: searchParams.get('stage') ?? '',
  }));

  // Sync stage from URL query param (from pipeline view clicks)
  useEffect(() => {
    const stage = searchParams.get('stage');
    if (stage) setFilters((f) => ({ ...f, stage }));
  }, [searchParams]);

  // Modal state: null | { mode: 'create' } | { mode: 'view'|'edit'|'delete', item }
  const [modal, setModal] = useState(null);

  const { data: items = [], isLoading, error } = useRAIDItems(filters);
  const { data: allItems = [] } = useRAIDItems({});
  const { data: detailItem, isLoading: detailLoading } = useRAIDItem(
    modal?.mode === 'view' ? modal.item?.id : null
  );
  const createRAID = useCreateRAID();
  const updateRAID = useUpdateRAID();
  const deleteRAID = useDeleteRAID();

  function changeFilter(key, val) { setFilters((f) => ({ ...f, [key]: val })); }
  function clearFilters() { setFilters(EMPTY_FILTERS); }

  async function handleCreate(payload) {
    await createRAID.mutateAsync(payload);
    setModal(null);
  }
  async function handleUpdate(payload) {
    await updateRAID.mutateAsync({ id: modal.item.id, ...payload });
    setModal(null);
  }
  async function handleDelete() {
    await deleteRAID.mutateAsync(modal.item.id);
    setModal(null);
  }

  const modalTitle =
    modal?.mode === 'create' ? 'New RAID Item' :
    modal?.mode === 'edit'   ? 'Edit RAID Item' :
    modal?.mode === 'delete' ? 'Delete RAID Item' :
    modal?.item?.title ?? '';

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">RAID Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">Risks · Assumptions · Issues · Decisions</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setModal({ mode: 'create' })}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Item
          </button>
        )}
      </div>

      {/* Filters */}
      <FilterBar filters={filters} onChange={changeFilter} onClear={clearFilters} />

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error.message}</div>
      )}

      {/* Table or skeleton */}
      {isLoading ? (
        <div className="rounded-lg border border-gray-200 bg-white h-48 animate-pulse" />
      ) : (
        <RAIDTable
          items={items}
          canEdit={canEdit}
          onView={(item) => setModal({ mode: 'view', item })}
          onEdit={(item) => setModal({ mode: 'edit', item })}
          onDelete={(item) => setModal({ mode: 'delete', item })}
        />
      )}

      {/* View modal */}
      <Modal
        open={modal?.mode === 'view'}
        onClose={() => setModal(null)}
        title={modal?.item?.title ?? ''}
        wide
      >
        {detailLoading ? (
          <div className="h-40 animate-pulse rounded-lg bg-gray-100" />
        ) : (
          <RAIDCard
            item={detailItem ?? modal?.item}
            canEdit={canEdit}
            onEdit={() => setModal({ mode: 'edit', item: modal.item })}
            allItems={allItems}
            onOpenItem={(id) => {
              const found = allItems.find((i) => i.id === id);
              if (found) setModal({ mode: 'view', item: found });
            }}
          />
        )}
      </Modal>

      {/* Create modal */}
      <Modal
        open={modal?.mode === 'create'}
        onClose={() => setModal(null)}
        title="New RAID Item"
        wide
      >
        <RAIDForm
          onSubmit={handleCreate}
          onClose={() => setModal(null)}
          loading={createRAID.isPending}
          allItems={allItems}
        />
        {createRAID.error && (
          <p className="mt-2 text-sm text-red-600">{createRAID.error.message}</p>
        )}
      </Modal>

      {/* Edit modal */}
      <Modal
        open={modal?.mode === 'edit'}
        onClose={() => setModal(null)}
        title="Edit RAID Item"
        wide
      >
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

      {/* Delete modal */}
      <Modal
        open={modal?.mode === 'delete'}
        onClose={() => setModal(null)}
        title="Delete RAID Item"
      >
        <DeleteConfirm
          item={modal?.item}
          onConfirm={handleDelete}
          onCancel={() => setModal(null)}
          loading={deleteRAID.isPending}
        />
        {deleteRAID.error && (
          <p className="mt-2 text-sm text-red-600">{deleteRAID.error.message}</p>
        )}
      </Modal>
    </div>
  );
}
