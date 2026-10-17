import ApiResponse from '../../utils/ApiResponse.js';
import httpStatus from '../../constants/httpStatus.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { getAdminDashboardTicketSections } from './adminDashboard.service.js';

export const getAdminDashboardTicketSectionsHandler = asyncHandler(async (req, res) => {
  const sections = await getAdminDashboardTicketSections(req.query);

  res.status(httpStatus.OK).json(
    new ApiResponse(
      httpStatus.OK,
      sections,
      'Admin dashboard ticket sections retrieved successfully',
    ),
  );
});

export default {
  getAdminDashboardTicketSectionsHandler,
};
