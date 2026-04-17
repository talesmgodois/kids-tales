import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
  password: process.env.REDIS_PASSWORD || undefined,
  db: Number(process.env.REDIS_DB ?? 0),
  // Reconecta automaticamente com backoff exponencial
  retryStrategy: (times) => Math.min(times * 100, 3000),
});

redis.on("error", (err) => console.error("Redis error:", err));
redis.on("connect", () => console.log("Redis conectado"));

export default redis;
