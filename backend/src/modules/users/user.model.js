import mongoose from 'mongoose';
import { ROLE_VALUES, ROLES } from '../../constants/roles.js';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false,
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      enum: {
        values: ROLE_VALUES,
        message: '{VALUE} is not a valid role',
      },
    },
    authorId: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
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
    isActive: {
      type: Boolean,
      default: true,
    },
    tokenVersion: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.pre('validate', function validateAuthorIdentifier(next) {
  if (this.role === ROLES.AUTHOR && !this.authorId) {
    this.invalidate(
      'authorId',
      'Author source identifier is required for authors and must be absent for administrators',
    );
  }

  if (this.role === ROLES.ADMIN && this.authorId) {
    this.invalidate(
      'authorId',
      'Author source identifier is required for authors and must be absent for administrators',
    );
  }

  next();
});

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ authorId: 1 }, { unique: true, sparse: true });
userSchema.index({ role: 1, name: 1 });

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
