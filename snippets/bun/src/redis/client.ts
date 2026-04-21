import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
  password: process.env.REDIS_PASSWORD || undefined,
  db: Number(process.env.REDIS_DB ?? 0),
  retryStrategy: (times) => Math.min(times * 100, 3000),
});

redis.on("error", (err) => console.error("Redis error:", err));
redis.on("connect", () => console.log("Redis conectado"));

// ── Typed JSON helpers ────────────────────────────────────────────────────

export async function setJson<T>(key: string, value: T, ttlSeconds?: number) {
  const serialized = JSON.stringify(value);
  if (ttlSeconds) {
    await redis.set(key, serialized, "EX", ttlSeconds);
  } else {
    await redis.set(key, serialized);
  }
}

export async function getJson<T>(key: string): Promise<T | null> {
  const raw = await redis.get(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export default redis;
