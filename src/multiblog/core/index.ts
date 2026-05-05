import { createMultiblogConfigFromEnv } from "./config";
import { closePostgresClient, getPostgresClient } from "./db/postgres";
import { closeRedisClient, getOrCreateRedisClient } from "./db/redis";
import { ensureSchema } from "./db/schema";
import { BlogRepository } from "./repositories/blog-repository";
import { PostRepository } from "./repositories/post-repository";
import { MultiblogService } from "./services/multiblog-service";
import type {
  CreateManagedPostInput,
  PublishManagedPostInput,
  RegisterBlogInput,
} from "./types";

let servicePromise: Promise<MultiblogService> | null = null;

async function getService(): Promise<MultiblogService> {
  if (servicePromise) {
    return servicePromise;
  }

  servicePromise = (async () => {
    const config = createMultiblogConfigFromEnv();
    const postgres = getPostgresClient();
    const redis = getOrCreateRedisClient(config.redisUrl);
    await ensureSchema(postgres);
    return new MultiblogService(
      new BlogRepository(postgres),
      new PostRepository(postgres),
      redis
    );
  })();

  return servicePromise;
}

export async function registerBlog(input: RegisterBlogInput) {
  const service = await getService();
  return service.registerBlog(input);
}

export async function createPost(input: CreateManagedPostInput) {
  const service = await getService();
  return service.createPost(input);
}

export async function publishPost(input: PublishManagedPostInput) {
  const service = await getService();
  return service.publishPost(input);
}

export async function shutdown(): Promise<void> {
  await Promise.all([closeRedisClient(), closePostgresClient()]);
  servicePromise = null;
}
