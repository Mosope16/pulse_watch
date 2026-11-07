import IORedis, { Redis, RedisOptions } from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const redisOptions: RedisOptions = {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
  reconnectOnError(err) {
    const targetError = "READONLY";
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
};

const globalForRedis = globalThis as unknown as {
  redisConnection: Redis | undefined;
};

export function getRedisConnection(): Redis {
  if (!globalForRedis.redisConnection) {
    globalForRedis.redisConnection = new IORedis(REDIS_URL, redisOptions);

    globalForRedis.redisConnection.on("error", (err) => {
      // Suppress noisy logs during local teardown
      if (process.env.NODE_ENV !== "test") {
        console.warn("[Redis Connection Warning]", err.message);
      }
    });
  }

  return globalForRedis.redisConnection;
}

export const redis = getRedisConnection();
export default redis;
