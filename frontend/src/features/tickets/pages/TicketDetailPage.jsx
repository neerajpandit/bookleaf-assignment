import { useLocation, useParams } from 'react-router-dom';
import {
  resolveAuthorTicketBackLabel,
  resolveAuthorTicketBackPath,
} from '../../../lib/ticketNavigation.js';
import BackButton from '../../../components/common/BackButton.jsx';
import LoadingIndicator from '../../../components/feedback/LoadingIndicator.jsx';
import ErrorState from '../../../components/feedback/ErrorState.jsx';
import PageHeader from '../../../components/layout/PageHeader.jsx';
import { TicketStatusBadge, PriorityBadge } from '../../../components/common/StatusBadge.jsx';
import { formatDateTime } from '../../../lib/format.js';
import { useTicketDetail, useAddTicketMessage } from '../hooks/useTickets.js';
import ConversationThread from '../components/ConversationThread.jsx';
import MessageComposer from '../components/MessageComposer.jsx';
import TicketAttachmentPanel from '../components/TicketAttachmentPanel.jsx';
import { normalizeApiError } from '../../../lib/apiError.js';
import { TICKET_POLL_INTERVAL_MS } from '../constants.js';

export function TicketDetailPage() {
  const { ticketId } = useParams();
  const location = useLocation();
  const { data: ticket, isLoading, isError, error, refetch } = useTicketDetail(ticketId);
  const backTo = resolveAuthorTicketBackPath(location.state);
  const backLabel = resolveAuthorTicketBackLabel(location.state);
  const addMessageMutation = useAddTicketMessage(ticketId);
  const backButton = <BackButton to={backTo} label={backLabel} />;

  if (isLoading) {
    return (
      <>
        <div className="mb-4">{backButton}</div>
        <LoadingIndicator label="Loading ticket…" />
      </>
    );
  }

  if (isError) {
    const normalized = error?.normalized || normalizeApiError(error);
    const isNotFound = normalized.statusCode === 404;

    return (
      <>
        <div className="mb-4">{backButton}</div>
        <ErrorState
          title={isNotFound ? 'Ticket unavailable' : 'Unable to load ticket'}
          message={
            isNotFound
              ? 'This ticket could not be found or is not available on your account.'
              : normalized.message
          }
          onRetry={isNotFound ? undefined : () => refetch()}
        />
      </>
    );
  }

  if (!ticket) {
    return (
      <>
        <div className="mb-4">{backButton}</div>
        <ErrorState
          title="Ticket unavailable"
          message="This ticket could not be found or is not available on your account."
        />
      </>
    );
  }

  const contextLabel = ticket.book ? ticket.book.title : 'General / Account Level';

  return (
    <>
      <div className="mb-4">{backButton}</div>
      <PageHeader
        title={ticket.subject}
        description={`${ticket.ticketNumber} · Created ${formatDateTime(ticket.createdAt)}`}
      />

      <div className="mb-6 grid gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</p>
          <div className="mt-1">
            <TicketStatusBadge status={ticket.status} />
          </div>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Category</p>
          <p className="mt-1 text-sm text-slate-800">{ticket.category || 'Pending classification'}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Priority</p>
          <div className="mt-1">
            <PriorityBadge priority={ticket.priority} />
          </div>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Context</p>
          <p className="mt-1 text-sm text-slate-800">{contextLabel}</p>
        </div>
      </div>

      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Original description</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{ticket.description}</p>
      </section>

      <TicketAttachmentPanel ticketId={ticket.id} attachment={ticket.attachment} />

      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">Conversation</h2>
          <p className="text-xs text-slate-500">
            Updates every {TICKET_POLL_INTERVAL_MS / 1000}s while this page is open
          </p>
        </div>
        <ConversationThread
          messages={ticket.messages}
          emptyMessage="No messages yet. Send a follow-up below to continue the conversation."
        />
      </section>

      <MessageComposer
        ticketStatus={ticket.status}
        isSubmitting={addMessageMutation.isPending}
        onSubmit={(body) => addMessageMutation.mutateAsync(body)}
      />
    </>
  );
}

export default TicketDetailPage;
