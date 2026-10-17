export const adminKeys = {
  all: ['admin'],
  counts: () => [...adminKeys.all, 'counts'],
  dashboardSections: (params) => [...adminKeys.all, 'dashboard-sections', params],
  count: (filters) => [...adminKeys.counts(), filters],
  queues: () => [...adminKeys.all, 'queue'],
  queue: (params) => [...adminKeys.queues(), params],
  details: () => [...adminKeys.all, 'detail'],
  detail: (ticketId) => [...adminKeys.details(), ticketId],
  messages: (ticketId, params) => [...adminKeys.all, 'messages', ticketId, params],
  notes: (ticketId, params) => [...adminKeys.all, 'notes', ticketId, params],
  authors: () => [...adminKeys.all, 'authors'],
  authorDirectory: (params) => [...adminKeys.authors(), 'directory', params],
  authorDetail: (authorUserId) => [...adminKeys.authors(), 'detail', authorUserId],
  authorBooks: (authorUserId, params) => [...adminKeys.authors(), 'books', authorUserId, params],
  authorRoyalty: (authorUserId) => [...adminKeys.authors(), 'royalty', authorUserId],
};

export default adminKeys;
