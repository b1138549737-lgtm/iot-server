import { getMQTTClient } from '../config/mqtt';
import { Device } from '../models/device.model';
import { SensorData } from '../models/sensor.model';
import { logger } from '../utils/logger';

export function setupMQTTMessageHandlers(): void {
  const client = getMQTTClient();

  // Subscribe to all device topics
  client.subscribe('iot/#', { qos: 1 }, (err) => {
    if (err) {
      logger.error('Failed to subscribe to iot/#:', err);
    } else {
      logger.info('Subscribed to iot/#');
    }
  });

  // Handle incoming messages
  client.on('message', async (topic, message) => {
    try {
      const parts = topic.split('/');
      if (parts.length < 3) {
        logger.debug(`Ignoring message on topic ${topic}`);
        return;
      }

      const userId = parts[1];
      const deviceId = parts[2];
      const messageType = parts[3];

      logger.debug(`Processing message from user ${userId}, device ${deviceId}`);

      const payload = JSON.parse(message.toString());

      logger.debug(`Message on ${topic}:`, payload);

      // Handle different message types
      switch (messageType) {
        case 'status':
          await handleStatusMessage(deviceId, payload);
          break;
        case 'sensor':
          await handleSensorMessage(deviceId, payload);
          break;
        case 'response':
          await handleResponseMessage(deviceId, payload);
          break;
        default:
          logger.debug(`Unknown message type: ${messageType}`);
      }
    } catch (error) {
      logger.error(`Failed to handle message on ${topic}:`, error);
    }
  });
}

async function handleStatusMessage(deviceId: string, payload: Record<string, unknown>): Promise<void> {
  try {
    const updateData: Record<string, unknown> = {
      status: payload.online ? 'online' : 'offline',
      lastSeen: new Date(),
    };

    if (payload.switches) {
      updateData['config.switchStates'] = payload.switches;
    }
    if (payload.motors) {
      updateData['config.motorPositions'] = payload.motors;
    }

    await Device.findByIdAndUpdate(deviceId, updateData);
  } catch (error) {
    logger.error(`Failed to handle status message for device ${deviceId}:`, error);
  }
}

async function handleSensorMessage(deviceId: string, payload: Record<string, unknown>): Promise<void> {
  try {
    const data = payload.data as Record<string, number>;
    if (!data) return;

    const ts = new Date(payload.timestamp as number || Date.now());
    const unitMap: Record<string, string> = {
      temperature: '°C', humidity: '%', light: 'lux', air: 'ppm',
    };

    const docs = Object.keys(data).map((type) => ({
      deviceId,
      type,
      value: data[type],
      unit: unitMap[type] || '',
      timestamp: ts,
    }));

    if (docs.length > 0) {
      await SensorData.insertMany(docs, { ordered: false });
    }
  } catch (error) {
    logger.error(`Failed to handle sensor message for device ${deviceId}:`, error);
  }
}

async function handleResponseMessage(deviceId: string, payload: Record<string, unknown>): Promise<void> {
  try {
    logger.info(`Response from device ${deviceId}:`, payload);
    // Handle command acknowledgment
    // Could emit events or update UI via WebSocket
  } catch (error) {
    logger.error(`Failed to handle response message for device ${deviceId}:`, error);
  }
}
