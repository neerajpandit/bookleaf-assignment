import { useEffect, useRef, useState } from 'react';
import Button from '../../../components/ui/Button.jsx';
import { AI_PROCESSING_STATUSES } from '../../../lib/constants/aiProcessingStatus.js';
import { formatDateTime } from '../../../lib/format.js';
import { normalizeApiError } from '../../../lib/apiError.js';
import {
  canTriggerAiAnalysis,
  getAiDraftPlaceholder,
  getAiStatusLabel,
  isAiProcessingActive,
  isAiSkippedWithoutServerConfig,
} from '../utils/aiAnalysis.js';
import AiClassificationComparison from './AiClassificationComparison.jsx';
import AiKnowledgeBaseReferences from './AiKnowledgeBaseReferences.jsx';
import AiDraftEditor from './AiDraftEditor.jsx';

export function AiAnalysisPanel({
  ticket,
  onRegenerate,
  onApproveDraft,
  isRegenerating,
  isSendingDraft,
}) {
  const [draftText, setDraftText] = useState('');
  const [serverDraft, setServerDraft] = useState('');
  const [hasPendingNewDraft, setHasPendingNewDraft] = useState(false);
  const [retryError, setRetryError] = useState('');
  const [approveError, setApproveError] = useState('');
  const [sendSuccess, setSendSuccess] = useState('');
  const isEditingRef = useRef(false);
  const lastServerDraftRef = useRef('');
  const previousTicketIdRef = useRef(null);

  useEffect(() => {
    if (previousTicketIdRef.current !== ticket.id) {
      isEditingRef.current = false;
      lastServerDraftRef.current = '';
      setDraftText('');
      setServerDraft('');
      setHasPendingNewDraft(false);
      setRetryError('');
      setApproveError('');
      setSendSuccess('');
      previousTicketIdRef.current = ticket.id;
    }

    const nextDraft = ticket.aiDraftResponse || '';

    if (nextDraft !== lastServerDraftRef.current) {
      if (isEditingRef.current) {
        setHasPendingNewDraft(true);
      } else {
        setDraftText(nextDraft);
        setHasPendingNewDraft(false);
      }

      lastServerDraftRef.current = nextDraft;
      setServerDraft(nextDraft);
    }
  }, [ticket.aiDraftResponse, ticket.id]);

  const aiConfigured = Boolean(ticket.aiConfigured);
  const canTrigger = canTriggerAiAnalysis(ticket.aiProcessingStatus, isRegenerating, aiConfigured);
  const isProcessing = isAiProcessingActive(ticket.aiProcessingStatus);
  const aiNotConfiguredOnServer = isAiSkippedWithoutServerConfig(
    ticket.aiProcessingStatus,
    aiConfigured,
  );

  const handleRegenerate = async () => {
    setRetryError('');
    setSendSuccess('');

    try {
      await onRegenerate();
      setSendSuccess('');
    } catch (error) {
      setRetryError((error.normalized || normalizeApiError(error)).message);
    }
  };

  const handleApprove = async () => {
    setApproveError('');
    setSendSuccess('');

    const trimmed = draftText.trim();
    if (!trimmed) {
      setApproveError('Draft is empty. Edit the draft before sending.');
      return;
    }

    try {
      await onApproveDraft(trimmed);
      isEditingRef.current = false;
      setDraftText('');
      setHasPendingNewDraft(false);
      setSendSuccess('Approved draft sent as a public reply.');
    } catch (error) {
      setApproveError((error.normalized || normalizeApiError(error)).message);
    }
  };

  const handleDraftChange = (value) => {
    isEditingRef.current = true;
    setDraftText(value);
    setSendSuccess('');
  };

  const handleReset = () => {
    isEditingRef.current = false;
    setDraftText(serverDraft);
    setHasPendingNewDraft(false);
    setApproveError('');
  };

  const handleLoadNewDraft = () => {
    isEditingRef.current = false;
    setDraftText(serverDraft);
    setHasPendingNewDraft(false);
  };

  const statusLabel = getAiStatusLabel(ticket.aiProcessingStatus, aiConfigured);
  const draftPlaceholder = getAiDraftPlaceholder(
    ticket.aiProcessingStatus,
    aiConfigured,
    isProcessing,
  );

  return (
    <section
      aria-label="AI analysis review"
      className="rounded-lg border border-slate-200 bg-white p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">AI analysis review</h2>
          <p className="text-xs text-slate-500">
            Review AI predictions and drafts before sending public replies. Provider is determined
            by backend configuration.
          </p>
        </div>
        <span
          className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700"
          aria-live="polite"
        >
          Status: {statusLabel}
        </span>
      </div>

      {isProcessing ? (
        <p className="mt-3 text-sm text-slate-600" role="status">
          Analysis is running. Results may update automatically when processing completes.
        </p>
      ) : null}

      <div className="mt-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Predictions vs current classification
        </h3>
        <AiClassificationComparison ticket={ticket} />
      </div>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Provider</dt>
          <dd className="text-slate-800">{ticket.aiProvider || '—'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Model</dt>
          <dd className="text-slate-800">{ticket.aiModel || '—'}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-slate-500">Priority rationale</dt>
          <dd className="text-slate-800">{ticket.aiPriorityRationale || '—'}</dd>
        </div>
        {ticket.aiProcessedAt ? (
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Last successful analysis</dt>
            <dd className="text-slate-800">{formatDateTime(ticket.aiProcessedAt)}</dd>
          </div>
        ) : null}
        {ticket.aiNeedsHumanReview ? (
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Review flag</dt>
            <dd className="text-amber-800">Human review recommended</dd>
          </div>
        ) : null}
        {ticket.aiProcessingStatus === AI_PROCESSING_STATUSES.FAILED && ticket.aiError ? (
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Analysis note</dt>
            <dd className="text-amber-800">{ticket.aiError}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Knowledge-base references
        </h3>
        <AiKnowledgeBaseReferences referenceIds={ticket.aiKnowledgeBaseReferences} />
      </div>

      <AiDraftEditor
        draftText={draftText}
        onDraftChange={handleDraftChange}
        onReset={handleReset}
        onApprove={handleApprove}
        onLoadNewDraft={handleLoadNewDraft}
        hasPendingNewDraft={hasPendingNewDraft}
        isRegenerating={isRegenerating}
        isSendingDraft={isSendingDraft}
        placeholder={draftPlaceholder}
        approveError={approveError}
        sendSuccess={sendSuccess}
      />

      {retryError ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {retryError}
        </p>
      ) : null}

      <div className="mt-3">
        <Button
          variant="secondary"
          onClick={handleRegenerate}
          isLoading={isRegenerating}
          disabled={!canTrigger}
          aria-disabled={!canTrigger}
        >
          {ticket.aiProcessingStatus === AI_PROCESSING_STATUSES.FAILED
            ? 'Retry analysis'
            : 'Run / regenerate analysis'}
        </Button>
        {aiNotConfiguredOnServer ? (
          <p className="mt-2 text-xs text-slate-500">
            AI processing is not configured on the server. Manual classification and replies remain
            available.
          </p>
        ) : null}
      </div>
    </section>
  );
}

export default AiAnalysisPanel;
