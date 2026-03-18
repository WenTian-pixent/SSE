import { Redis } from 'ioredis';
import Container, { Service } from 'typedi';
import { RedisKey } from '../helper/enums';
import { handleChannelMessage } from './handlers';

@Service()
class CacheService {
  protected redisClients: Map<string, Redis>;

  constructor() {
    if (!Container.has('redisClients')) {
      const redisClients = this.initializeRedisClients();
      Container.set('redisClients', redisClients);
    }
    this.redisClients = Container.get('redisClients');
  }

  private initializeRedisClients(): Map<string, Redis> {
    const redisClients = new Map<string, Redis>();

    const redisConfig: Record<string, string | undefined> = {
      //new redis can add from here
    };

    if (process.env.REDIS_URL) {
      redisConfig['REDIS_URL'] = process.env.REDIS_URL;
    }

    for (const [key, url] of Object.entries(redisConfig)) {
      if (!url) {
        console.warn(`⚠️ Missing Redis URL for '${key}'. Skipping initialization.`);
        continue;
      }

      try {
        // Create the Redis client instance asynchronously
        const redisInstance = new Redis(url);

        // Add event listeners for connection success and error
        redisInstance.on('connect', () => {
          console.log(`✅ Redis instance connected: ${key}`);
        });

        redisInstance.on('error', (err) => {
          console.error(`❌ Redis connection error for '${key}':`, err);
        });

        redisClients.set(key, redisInstance);
      } catch (error) {
        console.error(`❌ Failed to register Redis instance: ${key}`, error);
      }
    }

    return redisClients;
  }

  protected getRedisInstance(instanceName: string): Redis {
    if (!this.redisClients.has(instanceName)) {
      console.error(`❌ Redis instance '${instanceName}' is not available.`);
      throw new Error(`Redis instance '${instanceName}' is not available.`);
    }
    return this.redisClients.get(instanceName)!;
  }

  public async getKeys(pattern: string, redisInstance: RedisKey = RedisKey.REDIS_URL): Promise<string[]> {
    try {
      const redis = this.getRedisInstance(redisInstance);
      return await redis.keys(pattern);
    } catch (err) {
      console.error(`Failed to get keys for pattern ${pattern}:`, err);
      return [];
    }
  }

  public async publishToChannel(
    channel: string,
    data: Record<string, unknown>,
    redisInstance: RedisKey = RedisKey.REDIS_URL,
  ): Promise<boolean> {
    try {
      const redis = this.getRedisInstance(redisInstance);
      await redis.publish(channel, JSON.stringify(data));
      return true;
    } catch (err) {
      console.error(`Failed to publish message to channel ${channel}:`, err);
      return false;
    }
  }

  public async subscribeToChannel(
    channel: string,
    callback: (subscribed: boolean) => void,
    redisInstance: RedisKey = RedisKey.REDIS_URL,
  ): Promise<boolean> {
    try {
      const redis = this.getRedisInstance(redisInstance);
      redis.subscribe(channel, (err, count) => {
        if (err) {
          console.error('Failed to subscribe: %s', err.message);
          callback(false);
        } else {
          console.log(`Subscribed successfully! This client is currently subscribed to ${count} channels.`);
        }
      });
      redis.on('reconnecting', () => {
        console.log(`Reconnecting to Redis channel ${channel}...`);
      });
      redis.on('message', (channel, message) => {
        console.log(`From channel: ${channel}\nReceived ${message}`);
        handleChannelMessage(channel, message);
      });
    } catch (err) {
      console.error(`Failed to subscribe to channel ${channel}:`, err);
      return false;
    }
  }

  public async batchDeleteUsingPattern(
    pattern: string,
    redisInstance: RedisKey = RedisKey.REDIS_URL,
  ): Promise<boolean> {
    try {
      const redis = this.getRedisInstance(redisInstance);
      const keys = await redis.keys(pattern);

      if (keys.length > 0) {
        await this.batchDeleteKeys(keys, redisInstance);
      }
      return true;
    } catch (err) {
      console.error(`Failed to batch delete with pattern ${pattern}:`, err);
      return false;
    }
  }

  public async batchDeleteKeys(keys: string[], redisInstance: RedisKey = RedisKey.REDIS_URL): Promise<boolean> {
    try {
      const redis = this.getRedisInstance(redisInstance);
      if (!keys.length) {
        return true;
      }
      const pipeline = redis.pipeline();
      keys.forEach((key) => pipeline.unlink(key));
      await pipeline.exec();

      return true;
    } catch (err) {
      console.error(`Failed to batch delete keys:`, err);
      return false;
    }
  }
}

if (!Container.has(CacheService)) {
  console.error('❌ Error: CacheService is not registered in the Container!');
}

console.log('✅ CacheService Registered:', Container.has(CacheService));
console.log('✅ Redis Clients Registered:', Container.has('redisClients'));

const cacheServiceInstance = Container.get(CacheService);

export { cacheServiceInstance };
