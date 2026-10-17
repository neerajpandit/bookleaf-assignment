import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MessageComposer from './MessageComposer.jsx';
import { TICKET_STATUSES } from '../../../lib/constants/ticketStatus.js';

describe('MessageComposer', () => {
  it('prevents duplicate submissions while a send is in progress', async () => {
    const user = userEvent.setup();
    let resolveSubmit;
    const onSubmit = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveSubmit = resolve;
        }),
    );

    render(
      <MessageComposer
        ticketStatus={TICKET_STATUSES.OPEN}
        onSubmit={onSubmit}
        isSubmitting={false}
      />,
    );

    const textarea = screen.getByLabelText(/follow-up message/i);
    await user.type(textarea, 'Duplicate guard test');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);

    resolveSubmit();
  });

  it('submits on Enter and allows Shift+Enter for a new line', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <MessageComposer
        ticketStatus={TICKET_STATUSES.OPEN}
        onSubmit={onSubmit}
        isSubmitting={false}
      />,
    );

    const textarea = screen.getByLabelText(/follow-up message/i);
    await user.type(textarea, 'Line one');
    await user.keyboard('{Shift>}{Enter}{/Shift}Line two');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('Line one\nLine two');
    });
  });

  it('ignores submit handler invocations when already submitting', async () => {
    const onSubmit = vi.fn();

    const { container } = render(
      <MessageComposer
        ticketStatus={TICKET_STATUSES.OPEN}
        onSubmit={onSubmit}
        isSubmitting
      />,
    );

    const form = container.querySelector('form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
