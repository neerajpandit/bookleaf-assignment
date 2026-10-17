import ApiResponse from '../../utils/ApiResponse.js';
import httpStatus from '../../constants/httpStatus.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { listAuthorBooks, getAuthorBookById } from './book.service.js';

export const listBooks = asyncHandler(async (req, res) => {
  const data = await listAuthorBooks(req.auth.userId, req.query);

  res.status(httpStatus.OK).json(
    new ApiResponse(httpStatus.OK, data, 'Books retrieved successfully'),
  );
});

export const getBook = asyncHandler(async (req, res) => {
  const book = await getAuthorBookById(req.auth.userId, req.params.bookId);

  res.status(httpStatus.OK).json(
    new ApiResponse(httpStatus.OK, { book }, 'Book retrieved successfully'),
  );
});
