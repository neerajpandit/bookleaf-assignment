export const bookKeys = {
  all: ['books'],
  lists: () => [...bookKeys.all, 'list'],
  list: (params) => [...bookKeys.lists(), params],
  allBooks: (filters) => [...bookKeys.all, 'all', filters],
};

export default bookKeys;
