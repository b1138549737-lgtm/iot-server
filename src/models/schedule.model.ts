import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISchedule extends Document {
  userId: Types.ObjectId;
  deviceId: Types.ObjectId;
  name: string;
  cron: string;
  action: {
    type: 'switch' | 'motor';
    target: string;
    value: boolean | number;
  };
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const scheduleSchema = new Schema<ISchedule>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    deviceId: {
      type: Schema.Types.ObjectId,
      ref: 'Device',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    cron: {
      type: String,
      required: true,
    },
    action: {
      type: {
        type: String,
        enum: ['switch', 'motor'],
        required: true,
      },
      target: {
        type: String,
        required: true,
      },
      value: {
        type: Schema.Types.Mixed,
        required: true,
      },
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    lastRun: {
      type: Date,
    },
    nextRun: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const Schedule = mongoose.model<ISchedule>('Schedule', scheduleSchema);
