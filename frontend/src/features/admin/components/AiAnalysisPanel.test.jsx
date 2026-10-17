import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AiAnalysisPanel from './AiAnalysisPanel.jsx';
import { mockAdminTicketDetail } from '../../../test/fixtures.js';
import { AI_PROCESSING_STATUSES } from '../../../lib/constants/aiProcessingStatus.js';

const baseProps = {
  onRegenerate: vi.fn(),
  onApproveDraft: vi.fn(),
  isRegenerating: false,
  isSendingDraft: false,
};

describe('AiAnalysisPanel', () => {
  it.each([
    [AI_PROCESSING_STATUSES.PENDING, 'Pending'],
    [AI_PROCESSING_STATUSES.IN_PROGRESS, 'Processing'],
    [AI_PROCESSING_STATUSES.COMPLETED, 'Completed'],
    [AI_PROCESSING_STATUSES.FAILED, 'Failed'],
    [AI_PROCESSING_STATUSES.SKIPPED, 'Not configured', { aiConfigured: false }],
    [AI_PROCESSING_STATUSES.SKIPPED, 'Policy classification', { aiConfigured: true }],
  ])('renders analysis state %s as %s', (status, label, ticketOverrides = {}) => {
    render(
      <AiAnalysisPanel
        {...baseProps}
        ticket={{ ...mockAdminTicketDetail, aiProcessingStatus: status, ...ticketOverrides }}
      />,
    );

    expect(screen.getByText(`Status: ${label}`)).toBeInTheDocument();
  });

  it('displays provider metadata only when supplied', () => {
    render(
      <AiAnalysisPanel
        {...baseProps}
        ticket={{
          ...mockAdminTicketDetail,
          aiProvider: 'openai',
          aiModel: 'gpt-4o-mini',
        }}
      />,
    );

    expect(screen.getByText('openai')).toBeInTheDocument();
    expect(screen.getByText('gpt-4o-mini')).toBeInTheDocument();
  });

  it('clears stale draft text when server draft is invalidated after conversation updates', async () => {
    const { rerender } = render(
      <AiAnalysisPanel
        {...baseProps}
        ticket={{
          ...mockAdminTicketDetail,
          aiProcessingStatus: AI_PROCESSING_STATUSES.COMPLETED,
          aiDraftResponse: 'Original draft reply',
          aiNeedsHumanReview: false,
        }}
      />,
    );

    expect(screen.getByLabelText(/ai-generated draft/i)).toHaveValue('Original draft reply');

    rerender(
      <AiAnalysisPanel
        {...baseProps}
        ticket={{
          ...mockAdminTicketDetail,
          aiProcessingStatus: AI_PROCESSING_STATUSES.COMPLETED,
          aiDraftResponse: null,
          aiNeedsHumanReview: true,
        }}
      />,
    );

    expect(screen.getByLabelText(/ai-generated draft/i)).toHaveValue('');
    expect(screen.getByText(/human review recommended/i)).toBeInTheDocument();
  });

  it('prevents duplicate analysis requests while pending', async () => {
    const user = userEvent.setup();
    const onRegenerate = vi.fn();

    render(
      <AiAnalysisPanel
        {...baseProps}
        onRegenerate={onRegenerate}
        isRegenerating
        ticket={{ ...mockAdminTicketDetail, aiProcessingStatus: AI_PROCESSING_STATUSES.FAILED }}
      />,
    );

    const button = screen.getByRole('button', { name: /please wait/i });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onRegenerate).not.toHaveBeenCalled();
  });

  it('triggers analysis through the provided handler', async () => {
    const user = userEvent.setup();
    const onRegenerate = vi.fn().mockResolvedValue(undefined);

    render(
      <AiAnalysisPanel
        {...baseProps}
        onRegenerate={onRegenerate}
        ticket={{ ...mockAdminTicketDetail, aiProcessingStatus: AI_PROCESSING_STATUSES.FAILED }}
      />,
    );

    await user.click(screen.getByRole('button', { name: /retry analysis/i }));
    expect(onRegenerate).toHaveBeenCalledTimes(1);
  });

  it('does not auto-send when draft is edited', async () => {
    const user = userEvent.setup();
    const onApproveDraft = vi.fn();

    render(
      <AiAnalysisPanel {...baseProps} onApproveDraft={onApproveDraft} ticket={mockAdminTicketDetail} />,
    );

    const editor = screen.getByLabelText(/ai-generated draft/i);
    await user.clear(editor);
    await user.type(editor, 'Local edits only');

    expect(onApproveDraft).not.toHaveBeenCalled();
  });

  it('does not overwrite unsaved edits when a new server draft arrives', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <AiAnalysisPanel {...baseProps} ticket={mockAdminTicketDetail} />,
    );

    const editor = screen.getByLabelText(/ai-generated draft/i);
    await user.clear(editor);
    await user.type(editor, 'My unsaved edits');

    rerender(
      <AiAnalysisPanel
        {...baseProps}
        ticket={{
          ...mockAdminTicketDetail,
          aiDraftResponse: 'Fresh AI draft from server',
        }}
      />,
    );

    expect(editor).toHaveValue('My unsaved edits');
    expect(screen.getByText(/new ai draft is available/i)).toBeInTheDocument();
  });

  it('loads a new server draft only when explicitly requested', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <AiAnalysisPanel {...baseProps} ticket={mockAdminTicketDetail} />,
    );

    await user.clear(screen.getByLabelText(/ai-generated draft/i));
    await user.type(screen.getByLabelText(/ai-generated draft/i), 'Held edits');

    rerender(
      <AiAnalysisPanel
        {...baseProps}
        ticket={{
          ...mockAdminTicketDetail,
          aiDraftResponse: 'Fresh AI draft from server',
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: /load new ai draft/i }));
    expect(screen.getByLabelText(/ai-generated draft/i)).toHaveValue('Fresh AI draft from server');
  });

  it('sends edited text only after explicit approval', async () => {
    const user = userEvent.setup();
    const onApproveDraft = vi.fn().mockResolvedValue(undefined);

    render(
      <AiAnalysisPanel {...baseProps} onApproveDraft={onApproveDraft} ticket={mockAdminTicketDetail} />,
    );

    const editor = screen.getByLabelText(/ai-generated draft/i);
    await user.clear(editor);
    await user.type(editor, 'Approved edited reply');
    await user.click(screen.getByRole('button', { name: /send approved draft/i }));

    await waitFor(() => {
      expect(onApproveDraft).toHaveBeenCalledWith('Approved edited reply');
    });
  });

  it('preserves edited text when send fails', async () => {
    const user = userEvent.setup();
    const onApproveDraft = vi.fn().mockRejectedValue({
      normalized: { message: 'Cannot add messages to a closed ticket' },
    });

    render(
      <AiAnalysisPanel
        {...baseProps}
        onApproveDraft={onApproveDraft}
        ticket={{ ...mockAdminTicketDetail, status: 'CLOSED' }}
      />,
    );

    const editor = screen.getByLabelText(/ai-generated draft/i);
    await user.clear(editor);
    await user.type(editor, 'Still here after failure');
    await user.click(screen.getByRole('button', { name: /send approved draft/i }));

    expect(await screen.findByText(/closed ticket/i)).toBeInTheDocument();
    expect(editor).toHaveValue('Still here after failure');
  });

  it('shows knowledge-base references returned by the backend', () => {
    render(
      <AiAnalysisPanel
        {...baseProps}
        ticket={{
          ...mockAdminTicketDetail,
          aiKnowledgeBaseReferences: ['royalty-payout'],
        }}
      />,
    );

    expect(screen.getByText('Royalty and Payout Policy')).toBeInTheDocument();
    expect(screen.getByText('ID: royalty-payout')).toBeInTheDocument();
  });

  it('shows a safe retry error when analysis request fails', async () => {
    const user = userEvent.setup();
    const onRegenerate = vi.fn().mockRejectedValue({
      normalized: { message: 'AI provider is unavailable. Try again later.' },
    });

    render(
      <AiAnalysisPanel
        {...baseProps}
        onRegenerate={onRegenerate}
        ticket={{ ...mockAdminTicketDetail, aiProcessingStatus: AI_PROCESSING_STATUSES.FAILED }}
      />,
    );

    await user.click(screen.getByRole('button', { name: /retry analysis/i }));

    expect(await screen.findByText(/ai provider is unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText(/api[_-]?key/i)).not.toBeInTheDocument();
  });

  it('disables analysis trigger when AI is not configured on the server', () => {
    render(
      <AiAnalysisPanel
        {...baseProps}
        ticket={{
          ...mockAdminTicketDetail,
          aiProcessingStatus: AI_PROCESSING_STATUSES.SKIPPED,
          aiConfigured: false,
        }}
      />,
    );

    expect(screen.getByRole('button', { name: /run \/ regenerate analysis/i })).toBeDisabled();
  });

  it('enables analysis trigger for policy-classified tickets when AI is configured', () => {
    render(
      <AiAnalysisPanel
        {...baseProps}
        ticket={{
          ...mockAdminTicketDetail,
          aiProcessingStatus: AI_PROCESSING_STATUSES.SKIPPED,
          aiProvider: 'policy_rules',
          aiConfigured: true,
        }}
      />,
    );

    expect(screen.getByRole('button', { name: /run \/ regenerate analysis/i })).toBeEnabled();
  });
});
