import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../features/auth/context/AuthContext.jsx';

export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

export function renderWithProviders(ui, { route = '/', queryClient } = {}) {
  const client = queryClient || createTestQueryClient();

  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

export const mockAuthorUser = {
  id: 'author-id-1',
  email: 'author@bookleaf.test',
  role: 'AUTHOR',
  authorId: 'AUTH001',
  name: 'Test Author',
  isActive: true,
};

export const mockAdminUser = {
  id: 'admin-id-1',
  email: 'admin@bookleaf.test',
  role: 'ADMIN',
  name: 'Test Admin',
  isActive: true,
};
