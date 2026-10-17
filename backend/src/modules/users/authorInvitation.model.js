import mongoose from 'mongoose';

/**
 * Pre-provisioned author activation invitations.
 * Raw invitation tokens are never stored — only bcrypt hashes.
 */
const authorInvitationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Invitation email is required'],
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    authorId: {
      type: String,
      required: [true, 'Author source identifier is required'],
      trim: true,
    },
    tokenHash: {
      type: String,
      required: [true, 'Invitation token hash is required'],
      select: false,
    },
    name: {
      type: String,
      required: [true, 'Author name is required'],
      trim: true,
      maxlength: 120,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    city: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    joinedDate: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Invitation expiry is required'],
    },
    usedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

authorInvitationSchema.index({ email: 1, authorId: 1 }, { unique: true });
authorInvitationSchema.index({ authorId: 1, usedAt: 1 });

const AuthorInvitation =
  mongoose.models.AuthorInvitation ||
  mongoose.model('AuthorInvitation', authorInvitationSchema);

export default AuthorInvitation;
