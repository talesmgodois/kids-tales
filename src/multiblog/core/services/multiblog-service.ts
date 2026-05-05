import type { RedisClient } from "../db/redis";
import { GhostClient } from "../integrations/ghost";
import { BlogRepository } from "../repositories/blog-repository";
import { PostRepository } from "../repositories/post-repository";
import type {
  BlogPostRecord,
  CreateManagedPostInput,
  PublishManagedPostInput,
  RegisterBlogInput,
} from "../types";

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extractGhostUpdatedAt(metadata: Record<string, unknown>): string | null {
  const value = metadata["ghostUpdatedAt"];
  return typeof value === "string" ? value : null;
}

export class MultiblogService {
  constructor(
    private readonly blogs: BlogRepository,
    private readonly posts: PostRepository,
    private readonly redis: RedisClient
  ) {}

  async registerBlog(input: RegisterBlogInput) {
    const slug = normalizeSlug(input.slug);
    const existing = await this.blogs.findBySlug(slug);
    if (existing) {
      throw new Error(`Blog slug "${slug}" is already registered.`);
    }

    const blog = await this.blogs.create({
      slug,
      name: input.name.trim(),
      ghostUrl: input.ghostUrl.trim(),
      ghostAdminApiKey: input.ghostAdminApiKey.trim(),
    });

    await this.redis.set(this.blogCacheKey(blog.slug), JSON.stringify(blog), "EX", 900);
    return blog;
  }

  async createPost(input: CreateManagedPostInput): Promise<BlogPostRecord> {
    const blog = await this.resolveBlog(input.blogSlug);
    if (!blog) {
      throw new Error(`Blog "${input.blogSlug}" not found.`);
    }

    const ghost = new GhostClient(blog.ghostUrl, blog.ghostAdminApiKey);
    const draft = await ghost.createPost({
      title: input.title.trim(),
      html: input.html,
      status: "draft",
    });

    const post = await this.posts.create({
      blogId: blog.id,
      ghostPostId: draft.id,
      title: draft.title,
      slug: draft.slug,
      status: "draft",
      ghostUrl: draft.url,
      metadata: {
        ghostUpdatedAt: draft.updated_at,
      },
    });

    await this.cachePost(post);
    return post;
  }

  async publishPost(input: PublishManagedPostInput): Promise<BlogPostRecord> {
    const blog = await this.resolveBlog(input.blogSlug);
    if (!blog) {
      throw new Error(`Blog "${input.blogSlug}" not found.`);
    }

    const post = await this.posts.getById(input.postId);
    if (!post || post.blogId !== blog.id) {
      throw new Error(`Post "${input.postId}" does not belong to blog "${blog.slug}".`);
    }

    const ghostUpdatedAt = extractGhostUpdatedAt(post.metadata);
    if (!ghostUpdatedAt) {
      throw new Error(`Post "${input.postId}" does not have Ghost revision metadata.`);
    }

    const ghost = new GhostClient(blog.ghostUrl, blog.ghostAdminApiKey);
    const published = await ghost.publishPost(post.ghostPostId, ghostUpdatedAt);
    const updated = await this.posts.updateStatus(post.id, "published", {
      ...post.metadata,
      ghostUpdatedAt: published.updated_at,
      publishedGhostUrl: published.url,
    });

    await this.cachePost(updated);
    return updated;
  }

  private async resolveBlog(slug: string) {
    const normalized = normalizeSlug(slug);
    const cacheKey = this.blogCacheKey(normalized);
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const blog = await this.blogs.findBySlug(normalized);
    if (!blog) {
      return null;
    }

    await this.redis.set(cacheKey, JSON.stringify(blog), "EX", 900);
    return blog;
  }

  private async cachePost(post: BlogPostRecord): Promise<void> {
    await this.redis.set(this.postCacheKey(post.id), JSON.stringify(post), "EX", 900);
  }

  private blogCacheKey(slug: string): string {
    return `multiblog:blogs:${slug}`;
  }

  private postCacheKey(postId: string): string {
    return `multiblog:posts:${postId}`;
  }
}
