import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { SensorData } from '../models/sensor.model';
import { Device } from '../models/device.model';
import { AppError } from '../middlewares/error.middleware';
import { sendSuccess } from '../utils/response';

export async function getSensorData(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { deviceId } = req.params;
    const { type, limit = 100, startTime, endTime } = req.query;

    // Verify device belongs to user
    const device = await Device.findOne({
      _id: deviceId,
      userId: req.user.userId,
    });

    if (!device) {
      throw new AppError('Device not found', 404);
    }

    // Build query
    const query: Record<string, unknown> = { deviceId };
    if (type) query.type = type;
    if (startTime || endTime) {
      query.timestamp = {};
      if (startTime) (query.timestamp as Record<string, unknown>).$gte = new Date(startTime as string);
      if (endTime) (query.timestamp as Record<string, unknown>).$lte = new Date(endTime as string);
    }

    const data = await SensorData.find(query)
      .sort({ timestamp: -1 })
      .limit(Number(limit));

    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function getLatestSensorData(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { deviceId } = req.params;

    // Verify device belongs to user
    const device = await Device.findOne({
      _id: deviceId,
      userId: req.user.userId,
    });

    if (!device) {
      throw new AppError('Device not found', 404);
    }

    // Single aggregation to get latest data for each sensor type (1 query vs N)
    const latestData = await SensorData.aggregate([
      { $match: { deviceId: new mongoose.Types.ObjectId(deviceId) } },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: '$type',
          deviceId: { $first: '$deviceId' },
          type: { $first: '$type' },
          value: { $first: '$value' },
          unit: { $first: '$unit' },
          timestamp: { $first: '$timestamp' },
        },
      },
      { $project: { _id: 0, deviceId: 1, type: 1, value: 1, unit: 1, timestamp: 1 } },
    ]);

    sendSuccess(res, latestData);
  } catch (error) {
    next(error);
  }
}

export async function getSensorStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { deviceId } = req.params;
    const { type, period = '24h' } = req.query;

    // Verify device belongs to user
    const device = await Device.findOne({
      _id: deviceId,
      userId: req.user.userId,
    });

    if (!device) {
      throw new AppError('Device not found', 404);
    }

    // Calculate time range
    const now = new Date();
    let startTime: Date;
    switch (period) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const query: Record<string, unknown> = {
      deviceId,
      timestamp: { $gte: startTime },
    };
    if (type) query.type = type;

    // Aggregate stats
    const stats = await SensorData.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$type',
          avg: { $avg: '$value' },
          min: { $min: '$value' },
          max: { $max: '$value' },
          count: { $sum: 1 },
        },
      },
    ]);

    sendSuccess(res, stats);
  } catch (error) {
    next(error);
  }
}
