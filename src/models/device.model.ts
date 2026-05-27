import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IDevice extends Document {
  userId: Types.ObjectId;
  name: string;
  type: 'switch' | 'sensor' | 'motor' | 'camera' | 'multi';
  macAddress: string;
  mqttTopic: string;
  status: 'online' | 'offline';
  lastSeen: Date;
  config: {
    switchCount: number;
    switchStates: Map<string, boolean>;
    sensorTypes: string[];
    motorCount: number;
    motorPositions: Map<string, number>;
    hasCamera: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const deviceSchema = new Schema<IDevice>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['switch', 'sensor', 'motor', 'camera', 'multi'],
      default: 'multi',
    },
    macAddress: {
      type: String,
      required: true,
      unique: true,
    },
    mqttTopic: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['online', 'offline'],
      default: 'offline',
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    config: {
      switchCount: { type: Number, default: 4 },
      switchStates: {
        type: Map,
        of: Boolean,
        default: () => new Map([
          ['switch_1', false],
          ['switch_2', false],
          ['switch_3', false],
          ['switch_4', false],
        ]),
      },
      sensorTypes: {
        type: [String],
        default: ['temperature', 'humidity', 'light'],
      },
      motorCount: { type: Number, default: 2 },
      motorPositions: {
        type: Map,
        of: Number,
        default: () => new Map([
          ['motor_1', 0],
          ['motor_2', 0],
        ]),
      },
      hasCamera: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

// Generate MQTT topic before saving
deviceSchema.pre('save', function (next) {
  this.mqttTopic = `iot/${this.userId}/${this._id}`;
  next();
});

export const Device = mongoose.model<IDevice>('Device', deviceSchema);
