import type { Sql } from "postgres";

export async function ensureSchema(sql: Sql): Promise<void> {
  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;

  await sql`
    CREATE TABLE IF NOT EXISTS multiblog_blogs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      ghost_url TEXT NOT NULL,
      ghost_admin_api_key TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS multiblog_posts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      blog_id UUID NOT NULL REFERENCES multiblog_blogs(id) ON DELETE CASCADE,
      ghost_post_id TEXT NOT NULL,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
      ghost_url TEXT NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (blog_id, ghost_post_id)
    )
  `;
}
