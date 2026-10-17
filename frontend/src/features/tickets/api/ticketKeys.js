export const ticketKeys = {
  all: ['tickets'],
  lists: () => [...ticketKeys.all, 'list'],
  list: (params) => [...ticketKeys.lists(), params],
  openCount: () => [...ticketKeys.all, 'open-count'],
  details: () => [...ticketKeys.all, 'detail'],
  detail: (ticketId) => [...ticketKeys.details(), ticketId],
  dashboard: () => [...ticketKeys.all, 'dashboard'],
};

export default ticketKeys;
