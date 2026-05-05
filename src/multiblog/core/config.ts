export interface MultiblogConfig {
  postgresUrl: string;
  redisUrl: string;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function createMultiblogConfigFromEnv(): MultiblogConfig {
  return {
    postgresUrl: required("MULTIBLOG_DATABASE_URL"),
    redisUrl: process.env.MULTIBLOG_REDIS_URL ?? "redis://localhost:6379",
  };
}
