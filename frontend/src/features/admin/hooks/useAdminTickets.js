import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listAdminTickets,
  getAdminTicketById,
  updateTicketAssignment,
  updateTicketStatus,
  updateTicketClassification,
  listAdminTicketMessages,
  sendAdminPublicReply,
  listAdminInternalNotes,
  createAdminInternalNote,
  regenerateAdminAiDraft,
} from '../api/adminTicketsApi.js';
import { adminKeys } from '../api/adminKeys.js';
import { getAiAnalysisPollInterval } from '../utils/aiAnalysis.js';
import {
  getListPollInterval as getAdminMessagesPollInterval,
  listQueryPollOptions,
} from '../../../lib/listPollInterval.js';

export { getAdminMessagesPollInterval };

export function useAdminTicketQueue(params) {
  return useQuery({
    queryKey: adminKeys.queue(params),
    queryFn: () => listAdminTickets(params),
    ...listQueryPollOptions,
  });
}

export function useAdminTicketDetail(ticketId) {
  return useQuery({
    queryKey: adminKeys.detail(ticketId),
    queryFn: () => getAdminTicketById(ticketId),
    enabled: Boolean(ticketId),
    refetchInterval: getAiAnalysisPollInterval,
    refetchIntervalInBackground: false,
  });
}

export function useAdminTicketMessages(ticketId, params = { page: 1, limit: 50 }) {
  return useQuery({
    queryKey: adminKeys.messages(ticketId, params),
    queryFn: () => listAdminTicketMessages(ticketId, params),
    enabled: Boolean(ticketId),
    refetchInterval: getAdminMessagesPollInterval,
    refetchIntervalInBackground: false,
  });
}

export function useAdminInternalNotes(ticketId, params = { page: 1, limit: 50 }) {
  return useQuery({
    queryKey: adminKeys.notes(ticketId, params),
    queryFn: () => listAdminInternalNotes(ticketId, params),
    enabled: Boolean(ticketId),
    ...listQueryPollOptions,
  });
}

export function useUpdateTicketAssignment(ticketId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assignedTo) => updateTicketAssignment(ticketId, assignedTo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.detail(ticketId) });
      queryClient.invalidateQueries({ queryKey: adminKeys.queues() });
      queryClient.invalidateQueries({ queryKey: adminKeys.counts() });
      queryClient.invalidateQueries({ queryKey: [...adminKeys.all, 'dashboard-sections'] });
    },
  });
}

export function useUpdateTicketStatus(ticketId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status) => updateTicketStatus(ticketId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.detail(ticketId) });
      queryClient.invalidateQueries({ queryKey: adminKeys.queues() });
      queryClient.invalidateQueries({ queryKey: adminKeys.counts() });
      queryClient.invalidateQueries({ queryKey: [...adminKeys.all, 'dashboard-sections'] });
    },
  });
}

export function useUpdateTicketClassification(ticketId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => updateTicketClassification(ticketId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.detail(ticketId) });
      queryClient.invalidateQueries({ queryKey: adminKeys.queues() });
      queryClient.invalidateQueries({ queryKey: adminKeys.counts() });
      queryClient.invalidateQueries({ queryKey: [...adminKeys.all, 'dashboard-sections'] });
    },
  });
}

export function useSendAdminPublicReply(ticketId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body) => sendAdminPublicReply(ticketId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...adminKeys.all, 'messages', ticketId],
      });
      queryClient.invalidateQueries({ queryKey: adminKeys.detail(ticketId) });
      queryClient.invalidateQueries({ queryKey: adminKeys.queues() });
      queryClient.invalidateQueries({ queryKey: adminKeys.counts() });
      queryClient.invalidateQueries({ queryKey: [...adminKeys.all, 'dashboard-sections'] });
    },
  });
}

export function useCreateAdminInternalNote(ticketId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body) => createAdminInternalNote(ticketId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...adminKeys.all, 'notes', ticketId],
      });
    },
  });
}

export function useRegenerateAdminAiDraft(ticketId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => regenerateAdminAiDraft(ticketId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.detail(ticketId) });
    },
  });
}

export default useAdminTicketQueue;
