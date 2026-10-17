export const ADMIN_NAV_ITEMS = [
  {
    to: '/admin',
    label: 'Overview',
    end: true,
    description: 'Dashboard metrics and operational queues',
  },
  {
    to: '/admin/tickets',
    label: 'All Tickets',
    description: 'Full ticket queue with filters',
  },
  {
    to: '/admin/authors',
    label: 'All Authors',
    description: 'Author directory and support context',
  },
  {
    to: '/admin/tickets?assignedToMe=true',
    label: 'My Assigned Tickets',
    description: 'Tickets assigned to the signed-in administrator',
  },
  {
    to: '/admin/account',
    label: 'Account',
    description: 'Signed-in administrator session details',
  },
];

export const ADMIN_ROUTE_TITLES = {
  '/admin': 'Overview',
  '/admin/tickets': 'All Tickets',
  '/admin/authors': 'All Authors',
  '/admin/account': 'Account',
};

export default ADMIN_NAV_ITEMS;
