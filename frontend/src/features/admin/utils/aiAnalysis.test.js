import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  canTriggerAiAnalysis,
  getAiAnalysisPollInterval,
  isAiProcessingActive,
} from './aiAnalysis.js';
import { AI_PROCESSING_STATUSES } from '../../../lib/constants/aiProcessingStatus.js';

describe('aiAnalysis utils', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('detects active processing states', () => {
    expect(isAiProcessingActive(AI_PROCESSING_STATUSES.PENDING)).toBe(true);
    expect(isAiProcessingActive(AI_PROCESSING_STATUSES.IN_PROGRESS)).toBe(true);
    expect(isAiProcessingActive(AI_PROCESSING_STATUSES.COMPLETED)).toBe(false);
  });

  it('blocks analysis trigger while processing or when AI is unavailable on the server', () => {
    expect(canTriggerAiAnalysis(AI_PROCESSING_STATUSES.IN_PROGRESS, false)).toBe(false);
    expect(canTriggerAiAnalysis(AI_PROCESSING_STATUSES.SKIPPED, false, false)).toBe(false);
    expect(canTriggerAiAnalysis(AI_PROCESSING_STATUSES.SKIPPED, false, true)).toBe(true);
    expect(canTriggerAiAnalysis(AI_PROCESSING_STATUSES.FAILED, false)).toBe(true);
    expect(canTriggerAiAnalysis(AI_PROCESSING_STATUSES.COMPLETED, true)).toBe(false);
  });

  it('polls only while analysis is active', () => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });

    expect(
      getAiAnalysisPollInterval({
        state: { data: { aiProcessingStatus: AI_PROCESSING_STATUSES.IN_PROGRESS }, error: null },
      }),
    ).toBe(5000);

    expect(
      getAiAnalysisPollInterval({
        state: { data: { aiProcessingStatus: AI_PROCESSING_STATUSES.COMPLETED }, error: null },
      }),
    ).toBe(false);
  });
});
