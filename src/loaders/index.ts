import { Application } from 'express';
import { cacheServiceInstance } from 'src/services/cache';
import expressLoader from './express';

export default async ({ expressApp }: { expressApp: Application }) => {
  await expressLoader({ app: expressApp });
  console.log('✌️ Express loaded');
  await cacheServiceInstance.subscribeToChannel('my-channel-1', (subscribed) => {
    if (!subscribed) {
      console.error('Failed to subscribe to Redis channel. Check logs for details.');
      process.exit(1);
    }
  });
};
