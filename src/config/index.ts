import dotenv from 'dotenv';

const envFound = dotenv.config();
if (!envFound) {
  // This error should crash whole process

  throw new Error("⚠️  Couldn't find .env file  ⚠️");
}

process.env.NODE_ENV = process.env.NODE_ENV;

export default {
  /**
   * Your favorite port
   */
  environment: process.env.NODE_ENV,
  port: parseInt(process.env.PORT || '3000', 10),

  appName: process.env.APP_NAME || 'SSE',

  api: {
    prefix: '/sse',
  },
  // redis url
  redisUrl: process.env.REDIS_URL || null,

  // graceful shutdown timer
  shutDown: Number(process.env.GRACEFUL_SHUTDOWN_TIMER) || 10,

  heartbeatInterval: Number(process.env.HEARTBEAT_INTERVAL) || 60000,
};
