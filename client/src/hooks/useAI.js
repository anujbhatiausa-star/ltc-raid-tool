import { useMutation } from '@tanstack/react-query';
import api from '../lib/api.js';

export function useExecBriefing() {
  return useMutation({
    mutationFn: () => api.post('/api/ai/exec-briefing').then((r) => r.data),
  });
}

export function useMitigationSuggest() {
  return useMutation({
    mutationFn: (payload) =>
      api.post('/api/ai/suggest-mitigation', payload).then((r) => r.data),
  });
}

export function useWeeklyDigest() {
  return useMutation({
    mutationFn: () => api.post('/api/ai/weekly-digest').then((r) => r.data),
  });
}
