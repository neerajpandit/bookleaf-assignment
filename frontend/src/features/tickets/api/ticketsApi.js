import apiClient from '../../../lib/apiClient.js';

export const listTickets = async (params = {}) => {
  const response = await apiClient.get('/tickets', { params });
  return {
    items: response.data?.data?.items ?? [],
    pagination: response.data?.data?.pagination ?? {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    },
  };
};

export const getOpenTicketCount = async () => {
  const [open, inProgress] = await Promise.all([
    listTickets({ page: 1, limit: 1, status: 'OPEN' }),
    listTickets({ page: 1, limit: 1, status: 'IN_PROGRESS' }),
  ]);

  return open.pagination.total + inProgress.pagination.total;
};

export const getTicketById = async (ticketId) => {
  const response = await apiClient.get(`/tickets/${ticketId}`);
  return response.data?.data?.ticket ?? null;
};

export const createTicket = async ({ attachmentFile, ...payload }) => {
  if (attachmentFile) {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        formData.append(key, value);
      }
    });
    formData.append('attachment', attachmentFile);

    const response = await apiClient.post('/tickets', formData, {
      transformRequest: [(data, headers) => {
        delete headers['Content-Type'];
        return data;
      }],
    });

    return {
      ticket: response.data?.data?.ticket ?? null,
      initialMessage: response.data?.data?.initialMessage ?? null,
    };
  }

  const response = await apiClient.post('/tickets', payload);
  return {
    ticket: response.data?.data?.ticket ?? null,
    initialMessage: response.data?.data?.initialMessage ?? null,
  };
};

export const downloadTicketAttachment = async (ticketId) => {
  const response = await apiClient.get(`/tickets/${ticketId}/attachment`, {
    responseType: 'blob',
  });
  return response.data;
};

export const addTicketMessage = async (ticketId, body) => {
  const response = await apiClient.post(`/tickets/${ticketId}/messages`, { body });
  return {
    message: response.data?.data?.message ?? null,
    lastMessageAt: response.data?.data?.lastMessageAt ?? null,
  };
};

export default {
  listTickets,
  getOpenTicketCount,
  getTicketById,
  createTicket,
  downloadTicketAttachment,
  addTicketMessage,
};
