import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConversationThread from './ConversationThread.jsx';

const messages = [
  {
    id: 'msg-1',
    body: 'Hello from the author.',
    senderRole: 'AUTHOR',
    senderName: 'Priya Sharma',
    createdAt: '2025-10-17T10:00:00.000Z',
  },
  {
    id: 'msg-2',
    body: 'Support reply here.',
    senderRole: 'ADMIN',
    senderName: 'Admin User',
    createdAt: '2025-10-17T10:05:00.000Z',
  },
];

describe('ConversationThread', () => {
  it('renders role-labelled message bubbles', () => {
    render(<ConversationThread messages={messages} />);

    expect(screen.getByLabelText('Ticket conversation')).toBeInTheDocument();
    expect(screen.getByText('Hello from the author.')).toBeInTheDocument();
    expect(screen.getByText('Support reply here.')).toBeInTheDocument();
    expect(screen.getByText('Author')).toBeInTheDocument();
    expect(screen.getByText('Support')).toBeInTheDocument();
  });

  it('shows an empty-state message when there are no messages', () => {
    render(<ConversationThread emptyMessage="No messages yet." />);

    expect(screen.getByText('No messages yet.')).toBeInTheDocument();
  });
});
