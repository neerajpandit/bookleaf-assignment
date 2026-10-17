import { AI_PROCESSING_STATUSES } from '../../../lib/constants/aiProcessingStatus.js';

export const AI_STATUS_LABELS = {
  [AI_PROCESSING_STATUSES.PENDING]: 'Pending',
  [AI_PROCESSING_STATUSES.IN_PROGRESS]: 'Processing',
  [AI_PROCESSING_STATUSES.COMPLETED]: 'Completed',
  [AI_PROCESSING_STATUSES.FAILED]: 'Failed',
  [AI_PROCESSING_STATUSES.SKIPPED]: 'Not configured',
};

export const isAiSkippedWithoutServerConfig = (status, aiConfigured = false) =>
  status === AI_PROCESSING_STATUSES.SKIPPED && !aiConfigured;

export const getAiStatusLabel = (status, aiConfigured = false) => {
  if (status === AI_PROCESSING_STATUSES.SKIPPED && aiConfigured) {
    return 'Policy classification';
  }

  return AI_STATUS_LABELS[status] || 'Not analyzed';
};

export const getAiDraftPlaceholder = (status, aiConfigured, isProcessing) => {
  if (isAiSkippedWithoutServerConfig(status, aiConfigured)) {
    return 'AI is not configured on the server. Manual replies remain available.';
  }

  if (isProcessing) {
    return 'Analysis in progress. A draft will appear when processing completes.';
  }

  return 'AI draft will appear here when analysis completes.';
};

export const isAiProcessingActive = (status) =>
  status === AI_PROCESSING_STATUSES.PENDING || status === AI_PROCESSING_STATUSES.IN_PROGRESS;

export const isTerminalAiStatus = (status) =>
  status === AI_PROCESSING_STATUSES.COMPLETED ||
  status === AI_PROCESSING_STATUSES.FAILED ||
  status === AI_PROCESSING_STATUSES.SKIPPED;

export const canTriggerAiAnalysis = (status, isRequestPending, aiConfigured = false) => {
  if (isRequestPending) {
    return false;
  }

  if (isAiSkippedWithoutServerConfig(status, aiConfigured)) {
    return false;
  }

  return !isAiProcessingActive(status);
};

export const getAiAnalysisPollInterval = (query) => {
  if (typeof document !== 'undefined' && document.hidden) {
    return false;
  }

  if (query.state.error?.normalized?.isUnauthorized) {
    return false;
  }

  const ticket = query.state.data;
  if (!ticket) {
    return false;
  }

  return isAiProcessingActive(ticket.aiProcessingStatus) ? 5000 : false;
};

export default {
  AI_STATUS_LABELS,
  isAiProcessingActive,
  isAiSkippedWithoutServerConfig,
  getAiStatusLabel,
  getAiDraftPlaceholder,
  canTriggerAiAnalysis,
  getAiAnalysisPollInterval,
};
