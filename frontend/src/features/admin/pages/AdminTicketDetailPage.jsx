import { useEffect, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import BackButton from '../../../components/common/BackButton.jsx';
import {
  resolveAdminTicketBackLabel,
  resolveAdminTicketBackPath,
} from '../../../lib/ticketNavigation.js';
import { TICKET_POLL_INTERVAL_MS } from '../../tickets/constants.js';
import Pagination from '../../../components/common/Pagination.jsx';
import { shouldShowListPagination } from '../../../lib/pagination.js';
import LoadingIndicator from '../../../components/feedback/LoadingIndicator.jsx';
import ErrorState from '../../../components/feedback/ErrorState.jsx';
import ConversationThread from '../../tickets/components/ConversationThread.jsx';
import { useAuth } from '../../auth/hooks/useAuth.js';
import {
  useAdminTicketDetail,
  useAdminTicketMessages,
  useAdminInternalNotes,
  useUpdateTicketAssignment,
  useUpdateTicketStatus,
  useUpdateTicketClassification,
  useSendAdminPublicReply,
  useCreateAdminInternalNote,
  useRegenerateAdminAiDraft,
} from '../hooks/useAdminTickets.js';
import {
  AssignmentControl,
  StatusControl,
  ClassificationControl,
} from '../components/TicketControls.jsx';
import AdminReplyComposer from '../components/AdminReplyComposer.jsx';
import InternalNotesPanel from '../components/InternalNotesPanel.jsx';
import AiAnalysisPanel from '../components/AiAnalysisPanel.jsx';
import AdminTicketHeader from '../components/AdminTicketHeader.jsx';
import { collectAssigneeOptions } from '../utils/assignees.js';
import { normalizeApiError } from '../../../lib/apiError.js';

export function AdminTicketDetailPage() {
  const { ticketId } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const backTo = resolveAdminTicketBackPath(location.state);
  const backLabel = resolveAdminTicketBackLabel(location.state);
  const backButton = <BackButton to={backTo} label={backLabel} />;
  const [messagesPage, setMessagesPage] = useState(1);
  const [messagesLimit, setMessagesLimit] = useState(20);
  const [notesPage, setNotesPage] = useState(1);
  const [notesLimit, setNotesLimit] = useState(10);
  const messagesInitializedRef = useRef(false);

  useEffect(() => {
    setMessagesPage(1);
    setMessagesLimit(20);
    setNotesPage(1);
    setNotesLimit(10);
    messagesInitializedRef.current = false;
  }, [ticketId]);

  const ticketQuery = useAdminTicketDetail(ticketId);
  const messagesQuery = useAdminTicketMessages(ticketId, { page: messagesPage, limit: messagesLimit });
  const notesQuery = useAdminInternalNotes(ticketId, { page: notesPage, limit: notesLimit });

  useEffect(() => {
    if (messagesInitializedRef.current || messagesQuery.isLoading) {
      return;
    }

    const totalPages = messagesQuery.data?.pagination?.totalPages ?? 1;
    if (totalPages > 1) {
      setMessagesPage(totalPages);
    }

    messagesInitializedRef.current = true;
  }, [messagesQuery.isLoading, messagesQuery.data, ticketId]);

  const assignmentMutation = useUpdateTicketAssignment(ticketId);
  const statusMutation = useUpdateTicketStatus(ticketId);
  const classificationMutation = useUpdateTicketClassification(ticketId);
  const replyMutation = useSendAdminPublicReply(ticketId);
  const noteMutation = useCreateAdminInternalNote(ticketId);
  const aiMutation = useRegenerateAdminAiDraft(ticketId);

  if (ticketQuery.isLoading) {
    return (
      <>
        <div className="mb-4">{backButton}</div>
        <LoadingIndicator label="Loading ticket…" />
      </>
    );
  }

  if (ticketQuery.isError) {
    const normalized = ticketQuery.error?.normalized || normalizeApiError(ticketQuery.error);
    return (
      <>
        <div className="mb-4">{backButton}</div>
        <ErrorState
          title={normalized.statusCode === 404 ? 'Ticket unavailable' : 'Unable to load ticket'}
          message={
            normalized.statusCode === 404
              ? 'This ticket could not be found.'
              : normalized.message
          }
          onRetry={normalized.statusCode === 404 ? undefined : () => ticketQuery.refetch()}
        />
      </>
    );
  }

  const ticket = ticketQuery.data;
  if (!ticket) {
    return (
      <>
        <div className="mb-4">{backButton}</div>
        <ErrorState title="Ticket unavailable" message="This ticket could not be found." />
      </>
    );
  }

  const assigneeOptions = collectAssigneeOptions([ticket], user);

  return (
    <>
      <AdminTicketHeader ticket={ticket} />

      <section
        aria-label="Author context"
        className="mb-6 rounded-lg border border-slate-200 bg-white p-4"
      >
        <h2 className="text-sm font-semibold text-slate-900">Author query</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{ticket.description}</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Author ID</dt>
            <dd className="text-slate-800">{ticket.author?.authorId || '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Author email</dt>
            <dd className="text-slate-800">{ticket.author?.email || '—'}</dd>
          </div>
        </dl>
      </section>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <AssignmentControl
          ticket={ticket}
          assigneeOptions={assigneeOptions}
          onAssign={(assignedTo) => assignmentMutation.mutateAsync(assignedTo)}
          isPending={assignmentMutation.isPending}
        />
        <StatusControl
          ticket={ticket}
          onStatusChange={(status) => statusMutation.mutateAsync(status)}
          isPending={statusMutation.isPending}
        />
        <ClassificationControl
          ticket={ticket}
          onClassificationChange={(payload) => classificationMutation.mutateAsync(payload)}
          isPending={classificationMutation.isPending}
        />
      </div>

      <div className="mb-6 space-y-4">
        <AiAnalysisPanel
          ticket={ticket}
          onRegenerate={() => aiMutation.mutateAsync()}
          onApproveDraft={(body) => replyMutation.mutateAsync(body)}
          isRegenerating={aiMutation.isPending}
          isSendingDraft={replyMutation.isPending}
        />
      </div>

      <section className="mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">Public conversation</h2>
          <p className="text-xs text-slate-500">
            Updates every {TICKET_POLL_INTERVAL_MS / 1000}s while this page is open
          </p>
        </div>
        {messagesQuery.isLoading ? (
          <LoadingIndicator label="Loading messages…" />
        ) : messagesQuery.isError ? (
          <ErrorState
            title="Unable to load messages"
            message={(messagesQuery.error?.normalized || normalizeApiError(messagesQuery.error)).message}
            onRetry={() => messagesQuery.refetch()}
          />
        ) : (
          <>
            <ConversationThread
              messages={messagesQuery.data?.items ?? []}
              emptyMessage="No public messages yet. Send a reply below to start the conversation with the author."
            />
            {shouldShowListPagination(messagesQuery.data?.pagination) ? (
              <div className="mt-4">
                <Pagination
                  page={messagesQuery.data.pagination.page}
                  totalPages={messagesQuery.data.pagination.totalPages}
                  total={messagesQuery.data.pagination.total}
                  limit={messagesQuery.data.pagination.limit}
                  onPageChange={setMessagesPage}
                  onLimitChange={(nextLimit) => {
                    setMessagesLimit(nextLimit);
                    setMessagesPage(1);
                  }}
                  disabled={messagesQuery.isFetching}
                  itemLabel="messages"
                />
              </div>
            ) : null}
          </>
        )}
        <div className="mt-4">
          <AdminReplyComposer
            ticketStatus={ticket.status}
            onSubmit={async (body) => {
              await replyMutation.mutateAsync(body);
              const refreshed = await messagesQuery.refetch();
              const lastPage = refreshed.data?.pagination?.totalPages ?? 1;
              setMessagesPage(lastPage);
            }}
            isSubmitting={replyMutation.isPending}
          />
        </div>
      </section>

      <InternalNotesPanel
        notesQuery={notesQuery}
        onCreateNote={async (body) => {
          await noteMutation.mutateAsync(body);
          const refreshed = await notesQuery.refetch();
          const lastPage = refreshed.data?.pagination?.totalPages ?? 1;
          setNotesPage(lastPage);
        }}
        isCreating={noteMutation.isPending}
        onPageChange={setNotesPage}
        onLimitChange={(nextLimit) => {
          setNotesLimit(nextLimit);
          setNotesPage(1);
        }}
      />
    </>
  );
}

export default AdminTicketDetailPage;
