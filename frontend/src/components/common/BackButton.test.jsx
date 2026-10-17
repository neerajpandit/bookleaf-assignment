import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BackButton from './BackButton.jsx';

describe('BackButton', () => {
  it('renders a back link with icon and accessible label', () => {
    render(
      <MemoryRouter>
        <BackButton to="/author/tickets" label="Back to my tickets" />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: 'Back to my tickets' });
    expect(link).toHaveAttribute('href', '/author/tickets');
    expect(link).toHaveTextContent('Back');
  });
});
