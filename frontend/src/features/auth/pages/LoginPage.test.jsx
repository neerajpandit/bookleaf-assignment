import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';
import * as authApi from '../api/authApi.js';
import { INVALID_CREDENTIALS_MESSAGE } from '../constants.js';
import { mockAuthorUser } from '../../../test/helpers.jsx';

vi.mock('../api/authApi.js');

function renderLogin(route = '/login') {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[route]}>
        <LoginPage />
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    authApi.getCurrentUser.mockRejectedValue({
      normalized: { isUnauthorized: true, isNetworkError: false },
    });
  });

  it('shows validation errors for empty fields', async () => {
    const user = userEvent.setup();
    renderLogin();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled();
    });

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
  });

  it('shows loading state while login is pending', async () => {
    const user = userEvent.setup();
    let resolveLogin;
    authApi.login.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLogin = () => resolve(mockAuthorUser);
        }),
    );

    renderLogin();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled();
    });

    await user.type(screen.getByLabelText(/email/i), 'author@bookleaf.test');
    await user.type(screen.getByLabelText(/password/i), 'SecurePass1');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByRole('button', { name: /please wait/i })).toBeDisabled();

    resolveLogin();
    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        email: 'author@bookleaf.test',
        password: 'SecurePass1',
      });
    });
  });

  it('shows invalid credentials feedback', async () => {
    const user = userEvent.setup();
    authApi.login.mockRejectedValue({
      normalized: {
        isUnauthorized: true,
        message: INVALID_CREDENTIALS_MESSAGE,
      },
    });

    renderLogin();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled();
    });

    await user.type(screen.getByLabelText(/email/i), 'author@bookleaf.test');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(INVALID_CREDENTIALS_MESSAGE);
  });

  it('shows server error feedback for network failures', async () => {
    const user = userEvent.setup();
    authApi.login.mockRejectedValue({
      normalized: {
        isNetworkError: true,
        message: 'Unable to reach the server. Check your connection and try again.',
      },
    });

    renderLogin();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled();
    });

    await user.type(screen.getByLabelText(/email/i), 'author@bookleaf.test');
    await user.type(screen.getByLabelText(/password/i), 'SecurePass1');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/unable to reach the server/i);
  });
});
