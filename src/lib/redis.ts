import IORedis, { Redis, RedisOptions } from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

let hasLoggedWarning = false;

const redisOptions: RedisOptions = {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  lazyConnect: true,
  retryStrategy(times) {
    if (times > 5) {
      return null; // Stop retrying after 5 attempts if server is unreachable
    }
    const delay = Math.min(times * 200, 2000);
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
      // Suppress noisy logs during build or local teardown; warn once
      if (process.env.NODE_ENV !== "test" && !hasLoggedWarning) {
        hasLoggedWarning = true;
        console.warn("[Redis Connection Warning]", err.message, "(further retries silenced)");
      }
    });

    globalForRedis.redisConnection.on("connect", () => {
      hasLoggedWarning = false;
    });
  }

  return globalForRedis.redisConnection;
}

export const redis = new Proxy({} as Redis, {
  get(target, prop, receiver) {
    return Reflect.get(getRedisConnection(), prop, receiver);
  },
});

export default redis;
