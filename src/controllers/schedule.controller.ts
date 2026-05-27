import { Request, Response, NextFunction } from 'express';
import { Schedule } from '../models/schedule.model';
import { Device } from '../models/device.model';
import { AppError } from '../middlewares/error.middleware';
import { sendSuccess } from '../utils/response';
import { logger } from '../utils/logger';
import { registerScheduleJob, unregisterScheduleJob } from '../services/scheduler.service';

export async function getSchedules(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { deviceId } = req.query;
    const query: Record<string, unknown> = { userId: req.user.userId };
    if (deviceId) query.deviceId = deviceId;

    const schedules = await Schedule.find(query)
      .populate('deviceId', 'name type')
      .sort({ createdAt: -1 });

    sendSuccess(res, schedules);
  } catch (error) {
    next(error);
  }
}

export async function getSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const schedule = await Schedule.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    }).populate('deviceId', 'name type');

    if (!schedule) {
      throw new AppError('Schedule not found', 404);
    }

    sendSuccess(res, schedule);
  } catch (error) {
    next(error);
  }
}

export async function createSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { deviceId, name, cron, action, enabled } = req.body;

    // Verify device belongs to user
    const device = await Device.findOne({
      _id: deviceId,
      userId: req.user.userId,
    });

    if (!device) {
      throw new AppError('Device not found', 404);
    }

    const schedule = await Schedule.create({
      userId: req.user.userId,
      deviceId,
      name,
      cron,
      action,
      enabled: enabled !== false,
    });

    // Register schedule job
    if (schedule.enabled) {
      registerScheduleJob(schedule);
    }

    logger.info(`Schedule created: ${schedule._id}`);
    sendSuccess(res, schedule, 'Schedule created', 201);
  } catch (error) {
    next(error);
  }
}

export async function updateSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { name, cron, action, enabled } = req.body;

    const schedule = await Schedule.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { name, cron, action, enabled },
      { new: true, runValidators: true }
    );

    if (!schedule) {
      throw new AppError('Schedule not found', 404);
    }

    // Update schedule job
    unregisterScheduleJob(schedule._id.toString());
    if (schedule.enabled) {
      registerScheduleJob(schedule);
    }

    sendSuccess(res, schedule, 'Schedule updated');
  } catch (error) {
    next(error);
  }
}

export async function deleteSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const schedule = await Schedule.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!schedule) {
      throw new AppError('Schedule not found', 404);
    }

    // Unregister schedule job
    unregisterScheduleJob(schedule._id.toString());

    logger.info(`Schedule deleted: ${schedule._id}`);
    sendSuccess(res, null, 'Schedule deleted');
  } catch (error) {
    next(error);
  }
}

export async function toggleSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const schedule = await Schedule.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!schedule) {
      throw new AppError('Schedule not found', 404);
    }

    schedule.enabled = !schedule.enabled;
    await schedule.save();

    // Update schedule job
    unregisterScheduleJob(schedule._id.toString());
    if (schedule.enabled) {
      registerScheduleJob(schedule);
    }

    sendSuccess(res, schedule, `Schedule ${schedule.enabled ? 'enabled' : 'disabled'}`);
  } catch (error) {
    next(error);
  }
}
