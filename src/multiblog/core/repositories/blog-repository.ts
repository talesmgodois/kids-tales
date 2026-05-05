import type { BlogRecord } from "../types";
import type { Sql } from "postgres";

interface BlogRow {
  id: string;
  slug: string;
  name: string;
  ghost_url: string;
  ghost_admin_api_key: string;
  created_at: Date;
}

function toBlogRecord(row: BlogRow): BlogRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    ghostUrl: row.ghost_url,
    ghostAdminApiKey: row.ghost_admin_api_key,
    createdAt: row.created_at,
  };
}

export class BlogRepository {
  constructor(private readonly sql: Sql) {}

  async create(input: {
    slug: string;
    name: string;
    ghostUrl: string;
    ghostAdminApiKey: string;
  }): Promise<BlogRecord> {
    const rows = await this.sql<BlogRow[]>`
      INSERT INTO multiblog_blogs (slug, name, ghost_url, ghost_admin_api_key)
      VALUES (${input.slug}, ${input.name}, ${input.ghostUrl}, ${input.ghostAdminApiKey})
      RETURNING id, slug, name, ghost_url, ghost_admin_api_key, created_at
    `;

    return toBlogRecord(rows[0]);
  }

  async findBySlug(slug: string): Promise<BlogRecord | null> {
    const rows = await this.sql<BlogRow[]>`
      SELECT id, slug, name, ghost_url, ghost_admin_api_key, created_at
      FROM multiblog_blogs
      WHERE slug = ${slug}
      LIMIT 1
    `;

    return rows[0] ? toBlogRecord(rows[0]) : null;
  }
}
