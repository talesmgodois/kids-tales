import type { Sql } from "postgres";
import type { BlogPostRecord } from "../types";

interface PostRow {
  id: string;
  blog_id: string;
  ghost_post_id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  ghost_url: string;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

function toPostRecord(row: PostRow): BlogPostRecord {
  return {
    id: row.id,
    blogId: row.blog_id,
    ghostPostId: row.ghost_post_id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    ghostUrl: row.ghost_url,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PostRepository {
  constructor(private readonly sql: Sql) {}

  async create(input: {
    blogId: string;
    ghostPostId: string;
    title: string;
    slug: string;
    status: "draft" | "published";
    ghostUrl: string;
    metadata?: Record<string, unknown>;
  }): Promise<BlogPostRecord> {
    const rows = await this.sql<PostRow[]>`
      INSERT INTO multiblog_posts (
        blog_id,
        ghost_post_id,
        title,
        slug,
        status,
        ghost_url,
        metadata
      )
      values (
        ${input.blogId},
        ${input.ghostPostId},
        ${input.title},
        ${input.slug},
        ${input.status},
        ${input.ghostUrl},
        ${JSON.stringify(input.metadata ?? {})}::jsonb
      )
      RETURNING
        id,
        blog_id,
        ghost_post_id,
        title,
        slug,
        status,
        ghost_url,
        metadata,
        created_at,
        updated_at
    `;

    return toPostRecord(rows[0]);
  }

  async getById(postId: string): Promise<BlogPostRecord | null> {
    const rows = await this.sql<PostRow[]>`
      SELECT
        id,
        blog_id,
        ghost_post_id,
        title,
        slug,
        status,
        ghost_url,
        metadata,
        created_at,
        updated_at
      FROM multiblog_posts
      WHERE id = ${postId}
      LIMIT 1
    `;

    return rows[0] ? toPostRecord(rows[0]) : null;
  }

  async updateStatus(
    postId: string,
    status: "draft" | "published",
    metadata?: Record<string, unknown>
  ): Promise<BlogPostRecord> {
    const rows = await this.sql<PostRow[]>`
      UPDATE multiblog_posts
      SET
        status = ${status},
        metadata = ${JSON.stringify(metadata ?? {})}::jsonb,
        updated_at = NOW()
      WHERE id = ${postId}
      RETURNING
        id,
        blog_id,
        ghost_post_id,
        title,
        slug,
        status,
        ghost_url,
        metadata,
        created_at,
        updated_at
    `;

    if (!rows[0]) {
      throw new Error(`Post "${postId}" not found.`);
    }

    return toPostRecord(rows[0]);
  }
}
