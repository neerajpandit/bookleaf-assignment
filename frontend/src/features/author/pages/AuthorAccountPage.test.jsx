import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AuthorAccountPage from './AuthorAccountPage.jsx';
import { AuthProvider } from '../../auth/context/AuthContext.jsx';
import * as authApi from '../../auth/api/authApi.js';
import { mockAuthorUser } from '../../../test/helpers.jsx';

vi.mock('../../auth/api/authApi.js');

function renderAccountPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter>
          <AuthorAccountPage />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('AuthorAccountPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    authApi.getCurrentUser.mockResolvedValue(mockAuthorUser);
  });

  it('renders profile fields from the authenticated author session', async () => {
    renderAccountPage();

    expect(await screen.findByText('Test Author')).toBeInTheDocument();
    expect(screen.getByText('AUTH001')).toBeInTheDocument();
    expect(screen.getByText('author@bookleaf.test')).toBeInTheDocument();
    expect(screen.getByText('AUTHOR')).toBeInTheDocument();
  });

  it('does not expose admin-only fields', async () => {
    renderAccountPage();

    await screen.findByText('Test Author');
    expect(screen.queryByText(/private internal notes/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ai draft/i)).not.toBeInTheDocument();
  });
});
