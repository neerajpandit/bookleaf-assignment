import ApiResponse from '../../utils/ApiResponse.js';
import httpStatus from '../../constants/httpStatus.js';
import asyncHandler from '../../utils/asyncHandler.js';
import {
  getAdminAuthorById,
  getAdminAuthorRoyaltySummary,
  listAdminAuthorBooks,
  listAdminAuthors,
} from './adminAuthor.service.js';

export const getAdminAuthorDirectory = asyncHandler(async (req, res) => {
  const data = await listAdminAuthors(req.query);

  res.status(httpStatus.OK).json(
    new ApiResponse(httpStatus.OK, data, 'Admin author directory retrieved successfully'),
  );
});

export const getAdminAuthorDetail = asyncHandler(async (req, res) => {
  const author = await getAdminAuthorById(req.params.authorUserId);

  res.status(httpStatus.OK).json(
    new ApiResponse(httpStatus.OK, { author }, 'Admin author profile retrieved successfully'),
  );
});

export const getAdminAuthorBooks = asyncHandler(async (req, res) => {
  const data = await listAdminAuthorBooks(req.params.authorUserId, req.query);

  res.status(httpStatus.OK).json(
    new ApiResponse(httpStatus.OK, data, 'Admin author books retrieved successfully'),
  );
});

export const getAdminAuthorRoyaltySummaryHandler = asyncHandler(async (req, res) => {
  const summary = await getAdminAuthorRoyaltySummary(req.params.authorUserId);

  res.status(httpStatus.OK).json(
    new ApiResponse(httpStatus.OK, { summary }, 'Admin author royalty summary retrieved successfully'),
  );
});

export default {
  getAdminAuthorDirectory,
  getAdminAuthorDetail,
  getAdminAuthorBooks,
  getAdminAuthorRoyaltySummaryHandler,
};
