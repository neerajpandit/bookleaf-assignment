import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import TicketConversationButton from './TicketConversationButton.jsx';

describe('TicketConversationButton', () => {
  it('links to the ticket conversation with an accessible label', () => {
    render(
      <MemoryRouter>
        <TicketConversationButton
          to="/author/tickets/ticket-1"
          state={{ listSearch: '?page=2' }}
          ticketNumber="TKT-1001"
        />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: 'Open conversation for ticket TKT-1001' });
    expect(link).toHaveAttribute('href', '/author/tickets/ticket-1');
    expect(link).toHaveTextContent('Chat');
  });

  it('stops propagation so row navigation is not triggered', async () => {
    const user = userEvent.setup();
    const rowClick = vi.fn();
    const buttonNavigate = vi.fn();

    render(
      <MemoryRouter>
        <div onClick={rowClick} onKeyDown={() => {}} role="row">
          <TicketConversationButton
            to="/admin/tickets/ticket-2"
            ticketNumber="TKT-2002"
            onNavigate={buttonNavigate}
          />
        </div>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('link', { name: /open conversation for ticket tkt-2002/i }));
    expect(rowClick).not.toHaveBeenCalled();
    expect(buttonNavigate).toHaveBeenCalled();
  });
});
