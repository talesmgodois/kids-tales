import Redis from "ioredis";

export type RedisClient = Redis;

let redisClient: RedisClient | null = null;

export function createRedisClient(url: string): RedisClient {
  const client = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
  });

  client.on("error", (error) => {
    console.error("multiblog redis error:", error.message);
  });

  return client;
}

export function getOrCreateRedisClient(url: string): RedisClient {
  if (redisClient) {
    return redisClient;
  }

  redisClient = createRedisClient(url);
  return redisClient;
}

export async function closeRedisClient(): Promise<void> {
  if (!redisClient) {
    return;
  }

  await redisClient.quit();
  redisClient = null;
}
