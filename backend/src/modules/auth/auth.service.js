import ApiError from '../../utils/ApiError.js';
import httpStatus from '../../constants/httpStatus.js';
import { ROLES } from '../../constants/roles.js';
import { INVALID_CREDENTIALS_MESSAGE } from '../../constants/auth.js';
import User from '../users/user.model.js';
import AuthorInvitation from '../users/authorInvitation.model.js';
import { hashPassword, comparePassword, compareToken } from '../../utils/password.js';
import { signAccessToken } from '../../utils/jwt.js';
import pick from '../../utils/pick.js';

const PUBLIC_USER_FIELDS = ['_id', 'email', 'role', 'authorId', 'name', 'phone', 'city', 'joinedDate', 'isActive'];

export const toPublicUser = (user) => {
  const profile = pick(user.toObject ? user.toObject() : user, PUBLIC_USER_FIELDS);

  return {
    id: profile._id?.toString(),
    email: profile.email,
    role: profile.role,
    authorId: profile.authorId,
    name: profile.name,
    phone: profile.phone,
    city: profile.city,
    joinedDate: profile.joinedDate,
    isActive: profile.isActive,
  };
};

export const createTokenForUser = (user) =>
  signAccessToken({
    sub: user._id.toString(),
    role: user.role,
    tokenVersion: user.tokenVersion,
  });

export const registerAuthor = async ({ email, authorId, invitationToken, password }) => {
  const [existingByEmail, existingByAuthorId] = await Promise.all([
    User.findOne({ email }),
    User.findOne({ authorId }),
  ]);

  if (existingByEmail || existingByAuthorId) {
    throw new ApiError(httpStatus.CONFLICT, 'An account already exists for this author');
  }

  const invitation = await AuthorInvitation.findOne({
    email,
    authorId,
    usedAt: null,
    expiresAt: { $gt: new Date() },
  }).select('+tokenHash');

  if (!invitation) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid or expired invitation');
  }

  const tokenMatches = await compareToken(invitationToken, invitation.tokenHash);

  if (!tokenMatches) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid or expired invitation');
  }

  const passwordHash = await hashPassword(password);

  const user = await User.create({
    email: invitation.email,
    authorId: invitation.authorId,
    passwordHash,
    role: ROLES.AUTHOR,
    name: invitation.name,
    phone: invitation.phone,
    city: invitation.city,
    joinedDate: invitation.joinedDate,
    isActive: true,
    tokenVersion: 0,
  });

  invitation.usedAt = new Date();
  await invitation.save();

  return toPublicUser(user);
};

export const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+passwordHash');

  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, INVALID_CREDENTIALS_MESSAGE);
  }

  if (!user.isActive) {
    throw new ApiError(httpStatus.UNAUTHORIZED, INVALID_CREDENTIALS_MESSAGE);
  }

  const passwordMatches = await comparePassword(password, user.passwordHash);

  if (!passwordMatches) {
    throw new ApiError(httpStatus.UNAUTHORIZED, INVALID_CREDENTIALS_MESSAGE);
  }

  const accessToken = createTokenForUser(user);

  return {
    accessToken,
    user: toPublicUser(user),
  };
};

export const getCurrentUser = async (userId) => {
  const user = await User.findById(userId);

  if (!user || !user.isActive) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired authentication token');
  }

  return toPublicUser(user);
};

export const logoutUser = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired authentication token');
  }

  user.tokenVersion += 1;
  await user.save();

  return true;
};
