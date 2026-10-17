/**
 * Remaining backend capability gaps not yet exposed to the admin frontend.
 */
export const ADMIN_API_GAPS = {
  authorActivityTimeline:
    'GET /api/v1/admin/authors/:authorUserId/activity — combined support activity timeline',
  royaltyTransactions:
    'Individual royalty payout transaction history (only aggregate summary is available)',
};

/** @deprecated Use ADMIN_API_GAPS */
export const ADMIN_AUTHOR_API_GAPS = ADMIN_API_GAPS;

export default ADMIN_API_GAPS;
