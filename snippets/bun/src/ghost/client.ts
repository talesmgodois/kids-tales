import crypto from "crypto";

export type PostStatus = "draft" | "published" | "scheduled";

export interface GhostPost {
  id: string;
  title: string;
  slug: string;
  html: string;
  status: PostStatus;
  url: string;
  updated_at: string;
}

export interface CreatePostInput {
  title: string;
  html: string;
  status?: PostStatus;
  tags?: string[];
  excerpt?: string;
}

export interface UpdatePostInput {
  title?: string;
  html?: string;
  status?: PostStatus;
  tags?: string[];
  excerpt?: string;
}

function buildJwt(keyId: string, secret: string): string {
  const now = Math.floor(Date.now() / 1000);

  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", kid: keyId, typ: "JWT" })
  ).toString("base64url");

  const payload = Buffer.from(
    JSON.stringify({ iat: now, exp: now + 300, aud: "/admin/" })
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", Buffer.from(secret, "hex"))
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${signature}`;
}

export class GhostClient {
  private readonly baseUrl: string;
  private readonly keyId: string;
  private readonly secret: string;

  constructor(url: string, adminApiKey: string) {
    this.baseUrl = url.replace(/\/$/, "");
    [this.keyId, this.secret] = adminApiKey.split(":");
  }

  private get token() {
    return buildJwt(this.keyId, this.secret);
  }

  private get jsonHeaders() {
    return { "Content-Type": "application/json", Authorization: `Ghost ${this.token}` };
  }

  // Single fetch wrapper: handles auth headers, error checking, and JSON parsing.
  // Returns undefined for 204 No Content (e.g. DELETE).
  private async apiFetch<T>(method: string, path: string, body?: object): Promise<T> {
    const res = await fetch(`${this.baseUrl}/ghost/api/admin${path}`, {
      method,
      headers: body !== undefined ? this.jsonHeaders : { Authorization: `Ghost ${this.token}` },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      throw new Error(`Ghost ${method} ${path} → ${res.status}: ${await res.text()}`);
    }

    return (res.status === 204 ? undefined : res.json()) as T;
  }

  async createPost(input: CreatePostInput): Promise<GhostPost> {
    const data = await this.apiFetch<{ posts: GhostPost[] }>(
      "POST",
      "/posts/?source=html",
      { posts: [{ status: "draft", ...input }] }
    );
    return data.posts[0];
  }

  async getPost(id: string): Promise<GhostPost> {
    const data = await this.apiFetch<{ posts: GhostPost[] }>("GET", `/posts/${id}/`);
    return data.posts[0];
  }

  async updatePost(id: string, input: UpdatePostInput): Promise<GhostPost> {
    // Ghost requires updated_at for optimistic concurrency
    const { updated_at } = await this.getPost(id);
    const data = await this.apiFetch<{ posts: GhostPost[] }>(
      "PUT",
      `/posts/${id}/?source=html`,
      { posts: [{ ...input, updated_at }] }
    );
    return data.posts[0];
  }

  async publishPost(id: string): Promise<GhostPost> {
    return this.updatePost(id, { status: "published" });
  }

  async deletePost(id: string): Promise<void> {
    await this.apiFetch("DELETE", `/posts/${id}/`);
  }
}

export const ghost = new GhostClient(
  process.env.GHOST_URL ?? "http://localhost:2368",
  process.env.GHOST_ADMIN_API_KEY ?? ""
);
