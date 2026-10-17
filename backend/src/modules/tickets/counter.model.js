import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, 'Counter key is required'],
      trim: true,
    },
    sequence: {
      type: Number,
      required: [true, 'Sequence value is required'],
      min: [0, 'Sequence cannot be negative'],
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

counterSchema.index({ key: 1 }, { unique: true });

const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

export default Counter;
