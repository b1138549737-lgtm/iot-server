import mqtt, { MqttClient } from 'mqtt';
import { logger } from '../utils/logger';

let mqttClient: MqttClient | null = null;

export async function connectMQTT(): Promise<MqttClient> {
  const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
  const username = process.env.MQTT_USERNAME || 'admin';
  const password = process.env.MQTT_PASSWORD || 'public';

  return new Promise((resolve, reject) => {
    mqttClient = mqtt.connect(brokerUrl, {
      username,
      password,
      clientId: `iot-server-${Date.now()}`,
      clean: true,
      connectTimeout: 5000,
      reconnectPeriod: 10000,
      keepalive: 60,
      resubscribe: false,
    });

    mqttClient.on('connect', () => {
      logger.info('MQTT connected to broker');
      resolve(mqttClient!);
    });

    mqttClient.on('error', (error) => {
      logger.error('MQTT connection error:', error);
      reject(error);
    });

    mqttClient.on('reconnect', () => {
      logger.info('MQTT reconnecting...');
    });

    mqttClient.on('close', () => {
      logger.warn('MQTT connection closed');
    });
  });
}

export function getMQTTClient(): MqttClient {
  if (!mqttClient) {
    throw new Error('MQTT client not initialized');
  }
  return mqttClient;
}

export function subscribeTopic(topic: string): void {
  if (!mqttClient) {
    throw new Error('MQTT client not initialized');
  }
  mqttClient.subscribe(topic, { qos: 1 }, (err) => {
    if (err) {
      logger.error(`Failed to subscribe to ${topic}:`, err);
    } else {
      logger.info(`Subscribed to ${topic}`);
    }
  });
}

export function publishMessage(topic: string, message: string | object): void {
  if (!mqttClient) {
    throw new Error('MQTT client not initialized');
  }
  const payload = typeof message === 'string' ? message : JSON.stringify(message);
  mqttClient.publish(topic, payload, { qos: 1 }, (err) => {
    if (err) {
      logger.error(`Failed to publish to ${topic}:`, err);
    } else {
      logger.debug(`Published to ${topic}:`, payload);
    }
  });
}
