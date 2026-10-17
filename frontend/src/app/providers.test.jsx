import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useQueryClient } from '@tanstack/react-query';
import AppProviders from './providers.jsx';

function QueryClientProbe() {
  const queryClient = useQueryClient();
  return <span data-testid="query-client">{queryClient ? 'ready' : 'missing'}</span>;
}

describe('AppProviders', () => {
  it('initializes a React Query client', () => {
    render(
      <AppProviders>
        <QueryClientProbe />
      </AppProviders>,
    );

    expect(screen.getByTestId('query-client')).toHaveTextContent('ready');
  });
});
