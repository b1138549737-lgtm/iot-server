import cron from 'node-cron';
import { Schedule, ISchedule } from '../models/schedule.model';
import { Device } from '../models/device.model';
import { publishMessage } from '../config/mqtt';
import { logger } from '../utils/logger';

const scheduledJobs: Map<string, cron.ScheduledTask> = new Map();

export async function startScheduler(): Promise<void> {
  try {
    // Load all enabled schedules from database
    const schedules = await Schedule.find({ enabled: true });

    for (const schedule of schedules) {
      registerScheduleJob(schedule);
    }

    logger.info(`Scheduler started with ${schedules.length} jobs`);
  } catch (error) {
    logger.error('Failed to start scheduler:', error);
  }
}

export function registerScheduleJob(schedule: ISchedule): void {
  const scheduleId = schedule._id.toString();

  // Validate cron expression
  if (!cron.validate(schedule.cron)) {
    logger.error(`Invalid cron expression for schedule ${scheduleId}: ${schedule.cron}`);
    return;
  }

  // Unregister existing job if any
  unregisterScheduleJob(scheduleId);

  // Create new scheduled task
  const task = cron.schedule(schedule.cron, async () => {
    try {
      logger.info(`Executing schedule: ${schedule.name} (${scheduleId})`);

      // Get device
      const device = await Device.findById(schedule.deviceId);
      if (!device) {
        logger.error(`Device not found for schedule ${scheduleId}`);
        return;
      }

      // Build MQTT message
      const mqttMessage = {
        action: schedule.action.type,
        target: schedule.action.target,
        value: schedule.action.value,
        timestamp: Date.now(),
      };

      // Publish to MQTT
      const topic = `${device.mqttTopic}/${schedule.action.type}/set`;
      publishMessage(topic, mqttMessage);

      // Update schedule last run time
      await Schedule.findByIdAndUpdate(scheduleId, {
        lastRun: new Date(),
      });

      logger.info(`Schedule ${scheduleId} executed successfully`);
    } catch (error) {
      logger.error(`Failed to execute schedule ${scheduleId}:`, error);
    }
  });

  scheduledJobs.set(scheduleId, task);
  logger.info(`Schedule job registered: ${schedule.name} (${scheduleId})`);
}

export function unregisterScheduleJob(scheduleId: string): void {
  const task = scheduledJobs.get(scheduleId);
  if (task) {
    task.stop();
    scheduledJobs.delete(scheduleId);
    logger.info(`Schedule job unregistered: ${scheduleId}`);
  }
}

export function stopAllSchedulers(): void {
  for (const [scheduleId, task] of scheduledJobs) {
    task.stop();
    logger.info(`Schedule job stopped: ${scheduleId}`);
  }
  scheduledJobs.clear();
}
