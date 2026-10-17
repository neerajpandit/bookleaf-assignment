import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listTickets,
  getTicketById,
  createTicket,
  addTicketMessage,
} from '../api/ticketsApi.js';
import { ticketKeys } from '../api/ticketKeys.js';
import {
  getListPollInterval as getTicketPollInterval,
  listQueryPollOptions,
} from '../../../lib/listPollInterval.js';

export { getTicketPollInterval };

export function useTicketList(params) {
  return useQuery({
    queryKey: ticketKeys.list(params),
    queryFn: () => listTickets(params),
    ...listQueryPollOptions,
  });
}

export function useTicketDetail(ticketId) {
  return useQuery({
    queryKey: ticketKeys.detail(ticketId),
    queryFn: () => getTicketById(ticketId),
    enabled: Boolean(ticketId),
    refetchInterval: getTicketPollInterval,
    refetchIntervalInBackground: false,
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.openCount() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.dashboard() });
    },
  });
}

export function useAddTicketMessage(ticketId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body) => addTicketMessage(ticketId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.openCount() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.dashboard() });
    },
  });
}

export default useTicketList;
