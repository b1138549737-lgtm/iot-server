import { Request, Response, NextFunction } from 'express';
import { Device } from '../models/device.model';
import { AppError } from '../middlewares/error.middleware';
import { publishMessage } from '../config/mqtt';
import { sendSuccess } from '../utils/response';
import { logger } from '../utils/logger';

export async function getDevices(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const devices = await Device.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    sendSuccess(res, devices);
  } catch (error) {
    next(error);
  }
}

export async function getDevice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const device = await Device.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!device) {
      throw new AppError('Device not found', 404);
    }

    sendSuccess(res, device);
  } catch (error) {
    next(error);
  }
}

export async function createDevice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { name, type, macAddress } = req.body;

    // Check if MAC address already exists
    const existingDevice = await Device.findOne({ macAddress });
    if (existingDevice) {
      throw new AppError('Device with this MAC address already exists', 400);
    }

    const device = await Device.create({
      userId: req.user.userId,
      name,
      type: type || 'multi',
      macAddress,
    });

    sendSuccess(res, device, 'Device created', 201);
  } catch (error) {
    next(error);
  }
}

export async function updateDevice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { name, config } = req.body;

    const device = await Device.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { name, config },
      { new: true, runValidators: true }
    );

    if (!device) {
      throw new AppError('Device not found', 404);
    }

    sendSuccess(res, device, 'Device updated');
  } catch (error) {
    next(error);
  }
}

export async function deleteDevice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const device = await Device.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!device) {
      throw new AppError('Device not found', 404);
    }

    logger.info(`Device deleted: ${device._id}`);
    sendSuccess(res, null, 'Device deleted');
  } catch (error) {
    next(error);
  }
}

export async function controlDevice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { action, target, value } = req.body;

    const device = await Device.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!device) {
      throw new AppError('Device not found', 404);
    }

    // Build MQTT message
    const mqttMessage = {
      action,
      target,
      value,
      timestamp: Date.now(),
    };

    // Publish to MQTT
    const topic = `${device.mqttTopic}/${action}/set`;
    publishMessage(topic, mqttMessage);

    // Update local state
    if (action === 'switch' && device.config.switchStates) {
      device.config.switchStates.set(target, value as boolean);
      await device.save();
    } else if (action === 'motor' && device.config.motorPositions) {
      device.config.motorPositions.set(target, value as number);
      await device.save();
    }

    logger.info(`Device ${device._id} controlled: ${action} ${target} = ${value}`);
    sendSuccess(res, { topic, message: mqttMessage }, 'Command sent');
  } catch (error) {
    next(error);
  }
}

export async function getDeviceStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const device = await Device.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!device) {
      throw new AppError('Device not found', 404);
    }

    sendSuccess(res, {
      status: device.status,
      lastSeen: device.lastSeen,
      config: device.config,
    });
  } catch (error) {
    next(error);
  }
}
