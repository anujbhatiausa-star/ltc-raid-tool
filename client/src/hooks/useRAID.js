import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api.js';

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useRAIDItems(filters = {}) {
  return useQuery({
    queryKey: ['raid', filters],
    queryFn: async () => {
      const params = {};
      if (filters.category)   params.category   = filters.category;
      if (filters.stage)      params.stage       = filters.stage;
      if (filters.workstream) params.workstream  = filters.workstream;
      if (filters.priority)   params.priority    = filters.priority;
      if (filters.status)     params.status      = filters.status;
      if (filters.search)     params.search      = filters.search;
      const { data } = await api.get('/api/raid', { params });
      return data;
    },
    staleTime: 1000 * 30,
  });
}

export function useRAIDItem(id) {
  return useQuery({
    queryKey: ['raid', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/raid/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

// ---------------------------------------------------------------------------
// Mutations — all invalidate the list cache on success
// ---------------------------------------------------------------------------

export function useCreateRAID() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.post('/api/raid', payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['raid'] }),
  });
}

export function useUpdateRAID() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) =>
      api.put(`/api/raid/${id}`, payload).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['raid'] });
      qc.setQueryData(['raid', data.id], data);
    },
  });
}

export function useDeleteRAID() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/api/raid/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['raid'] }),
  });
}

export function useBulkStatusUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, status }) =>
      api.patch('/api/raid/bulk-status', { ids, status }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['raid'] }),
  });
}
