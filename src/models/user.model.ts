import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  openid: string;
  nickname?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    openid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    nickname: {
      type: String,
      default: '',
    },
    avatar: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>('User', userSchema);
