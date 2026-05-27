import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISensorData extends Document {
  deviceId: Types.ObjectId;
  type: 'temperature' | 'humidity' | 'light' | 'air';
  value: number;
  unit: string;
  timestamp: Date;
}

const sensorDataSchema = new Schema<ISensorData>(
  {
    deviceId: {
      type: Schema.Types.ObjectId,
      ref: 'Device',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['temperature', 'humidity', 'light', 'air'],
      required: true,
    },
    value: {
      type: Number,
      required: true,
    },
    unit: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

// Compound index for efficient queries
sensorDataSchema.index({ deviceId: 1, type: 1, timestamp: -1 });

// Auto-delete data older than 30 days (TTL index on timestamp field)
sensorDataSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const SensorData = mongoose.model<ISensorData>('SensorData', sensorDataSchema);
