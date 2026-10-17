import apiClient from '../../../lib/apiClient.js';

export const listAdminTickets = async (params = {}) => {
  const response = await apiClient.get('/admin/tickets', { params });
  return {
    items: response.data?.data?.items ?? [],
    pagination: response.data?.data?.pagination ?? {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    },
  };
};

export const getAdminDashboardTicketSections = async (params = {}) => {
  const response = await apiClient.get('/admin/dashboard/ticket-sections', { params });
  return response.data?.data ?? {
    urgent: [],
    oldestUnresolved: [],
    recentlyUpdated: [],
  };
};

export const getAdminTicketCount = async (filters = {}) => {
  const { pagination } = await listAdminTickets({ ...filters, page: 1, limit: 1 });
  return pagination.total;
};

export const getAdminTicketById = async (ticketId) => {
  const response = await apiClient.get(`/admin/tickets/${ticketId}`);
  return response.data?.data?.ticket ?? null;
};

export const updateTicketAssignment = async (ticketId, assignedTo) => {
  const response = await apiClient.patch(`/admin/tickets/${ticketId}/assignment`, { assignedTo });
  return response.data?.data?.ticket ?? null;
};

export const updateTicketStatus = async (ticketId, status) => {
  const response = await apiClient.patch(`/admin/tickets/${ticketId}/status`, { status });
  return response.data?.data?.ticket ?? null;
};

export const updateTicketClassification = async (ticketId, payload) => {
  const response = await apiClient.patch(`/admin/tickets/${ticketId}/classification`, payload);
  return response.data?.data?.ticket ?? null;
};

export const listAdminTicketMessages = async (ticketId, params = {}) => {
  const response = await apiClient.get(`/admin/tickets/${ticketId}/messages`, { params });
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

export const sendAdminPublicReply = async (ticketId, body) => {
  const response = await apiClient.post(`/admin/tickets/${ticketId}/messages`, { body });
  return {
    message: response.data?.data?.message ?? null,
    lastMessageAt: response.data?.data?.lastMessageAt ?? null,
  };
};

export const listAdminInternalNotes = async (ticketId, params = {}) => {
  const response = await apiClient.get(`/admin/tickets/${ticketId}/notes`, { params });
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

export const createAdminInternalNote = async (ticketId, body) => {
  const response = await apiClient.post(`/admin/tickets/${ticketId}/notes`, { body });
  return response.data?.data?.note ?? null;
};

export const regenerateAdminAiDraft = async (ticketId) => {
  const response = await apiClient.post(`/admin/tickets/${ticketId}/ai/draft`);
  return response.data?.data?.ticket ?? null;
};

export default {
  listAdminTickets,
  getAdminTicketCount,
  getAdminTicketById,
  updateTicketAssignment,
  updateTicketStatus,
  updateTicketClassification,
  listAdminTicketMessages,
  sendAdminPublicReply,
  listAdminInternalNotes,
  createAdminInternalNote,
  regenerateAdminAiDraft,
};
