import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClassificationControl } from './TicketControls.jsx';

describe('ClassificationControl', () => {
  const baseTicket = {
    category: 'Royalty & Payments',
    priority: 'CRITICAL',
    suggestedCategory: 'Royalty & Payments',
    suggestedPriority: 'LOW',
    suggestionReason: 'Routine policy clarification.',
    suggestionSource: 'policy_rules',
    priorityOverride: true,
    priorityOverrideReason: 'Confirmed payout disruption',
    priorityOverriddenBy: { name: 'Support Admin', email: 'admin@test.com' },
    priorityOverriddenAt: '2025-10-01T10:00:00.000Z',
    aiCategory: 'Royalty & Payments',
    aiPriority: 'LOW',
  };

  it('shows suggested and effective priority details', () => {
    render(
      <ClassificationControl ticket={baseTicket} onClassificationChange={vi.fn()} isPending={false} />,
    );

    expect(screen.getByText(/manually overridden/i)).toBeInTheDocument();
    expect(screen.getByText(/suggested priority/i)).toBeInTheDocument();
    expect(screen.getByText(/routine policy clarification/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear priority override/i })).toBeInTheDocument();
  });

  it('submits priority override changes through the API callback', async () => {
    const user = userEvent.setup();
    const onClassificationChange = vi.fn().mockResolvedValue(undefined);

    render(
      <ClassificationControl
        ticket={{ ...baseTicket, priority: 'LOW', priorityOverride: false }}
        onClassificationChange={onClassificationChange}
        isPending={false}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/effective priority/i), 'HIGH');
    await user.type(screen.getByLabelText(/override reason/i), 'Needs expedited review');
    await user.click(screen.getByRole('button', { name: /save classification/i }));

    expect(onClassificationChange).toHaveBeenCalledWith({
      priority: 'HIGH',
      priorityOverrideReason: 'Needs expedited review',
    });
  });

  it('clears an active override through the backend action', async () => {
    const user = userEvent.setup();
    const onClassificationChange = vi.fn().mockResolvedValue(undefined);

    render(
      <ClassificationControl
        ticket={baseTicket}
        onClassificationChange={onClassificationChange}
        isPending={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: /clear priority override/i }));

    expect(onClassificationChange).toHaveBeenCalledWith({ clearPriorityOverride: true });
  });
});
