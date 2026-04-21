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
    const [keyId, secret] = adminApiKey.split(":");
    this.keyId = keyId;
    this.secret = secret;
  }

  private get authHeader() {
    return { Authorization: `Ghost ${buildJwt(this.keyId, this.secret)}` };
  }

  private get headers() {
    return { "Content-Type": "application/json", ...this.authHeader };
  }

  private endpoint(path: string) {
    return `${this.baseUrl}/ghost/api/admin${path}`;
  }

  async createPost(input: CreatePostInput): Promise<GhostPost> {
    const res = await fetch(this.endpoint("/posts/?source=html"), {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ posts: [{ status: "draft", ...input }] }),
    });
    if (!res.ok) throw new Error(`Ghost createPost → ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.posts[0];
  }

  async updatePost(id: string, input: UpdatePostInput): Promise<GhostPost> {
    // Ghost requires updated_at for optimistic concurrency
    const current = await this.getPost(id);
    const res = await fetch(this.endpoint(`/posts/${id}/?source=html`), {
      method: "PUT",
      headers: this.headers,
      body: JSON.stringify({
        posts: [{ ...input, updated_at: current.updated_at }],
      }),
    });
    if (!res.ok) throw new Error(`Ghost updatePost → ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.posts[0];
  }

  async publishPost(id: string): Promise<GhostPost> {
    return this.updatePost(id, { status: "published" });
  }

  async getPost(id: string): Promise<GhostPost> {
    const res = await fetch(this.endpoint(`/posts/${id}/`), {
      headers: this.authHeader,
    });
    if (!res.ok) throw new Error(`Ghost getPost → ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.posts[0];
  }

  async deletePost(id: string): Promise<void> {
    const res = await fetch(this.endpoint(`/posts/${id}/`), {
      method: "DELETE",
      headers: this.authHeader,
    });
    if (!res.ok) throw new Error(`Ghost deletePost → ${res.status}: ${await res.text()}`);
  }
}

export const ghost = new GhostClient(
  process.env.GHOST_URL ?? "http://localhost:2368",
  process.env.GHOST_ADMIN_API_KEY ?? ""
);
