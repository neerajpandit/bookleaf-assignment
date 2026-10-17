import ApiError from '../../utils/ApiError.js';
import httpStatus from '../../constants/httpStatus.js';
import { loadAiConfig } from '../ai/aiConfig.js';
import { regenerateAdminAiDraft } from '../ai/aiAnalysis.service.js';
import { getAdminTicketById } from './adminTicket.service.js';
import Ticket from '../tickets/ticket.model.js';

export const regenerateAdminTicketAiDraft = async (adminUserId, ticketId) => {
  const config = loadAiConfig();

  if (!config.enabled) {
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'AI processing is not configured');
  }

  const ticket = await Ticket.findById(ticketId);

  if (!ticket) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Ticket not found');
  }

  try {
    await regenerateAdminAiDraft(adminUserId, ticketId);
  } catch (error) {
    throw new ApiError(
      httpStatus.BAD_GATEWAY,
      'AI draft generation failed. Manual ticket handling remains available.',
    );
  }

  return getAdminTicketById(ticketId, { ensureAiDraft: false });
};

export default {
  regenerateAdminTicketAiDraft,
};
