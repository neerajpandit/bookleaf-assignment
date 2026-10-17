import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import TicketList from './TicketList.jsx';
import { mockTicket } from '../../../test/fixtures.js';

describe('TicketList', () => {
  it('renders chat buttons that link to the correct ticket conversation', () => {
    render(
      <MemoryRouter>
        <TicketList tickets={[mockTicket]} listSearch="?status=OPEN&page=2" />
      </MemoryRouter>,
    );

    const chatLinks = screen.getAllByRole('link', {
      name: `Open conversation for ticket ${mockTicket.ticketNumber}`,
    });

    expect(chatLinks.length).toBeGreaterThan(0);
    chatLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', `/author/tickets/${mockTicket.id}`);
    });
  });

  it('does not trigger row navigation when chat is clicked', async () => {
    const user = userEvent.setup();
    const rowClick = vi.fn();

    render(
      <MemoryRouter>
        <table>
          <tbody>
            <tr onClick={rowClick}>
              <td colSpan={8}>
                <TicketList tickets={[mockTicket]} />
              </td>
            </tr>
          </tbody>
        </table>
      </MemoryRouter>,
    );

    await user.click(
      screen.getAllByRole('link', {
        name: `Open conversation for ticket ${mockTicket.ticketNumber}`,
      })[0],
    );

    expect(rowClick).not.toHaveBeenCalled();
  });
});
