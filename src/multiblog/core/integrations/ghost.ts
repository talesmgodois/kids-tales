import crypto from "crypto";
import type { PostStatus } from "../types";

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
    if (!keyId || !secret) {
      throw new Error(
        "Invalid ghost admin key format. Expected '<keyId>:<secret>'."
      );
    }
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
      body: JSON.stringify({
        posts: [{ title: input.title, html: input.html, status: input.status ?? "draft" }],
      }),
    });
    if (!res.ok) {
      throw new Error(`Ghost createPost failed (${res.status}): ${await res.text()}`);
    }

    const data = (await res.json()) as { posts: GhostPost[] };
    return data.posts[0];
  }

  async getPost(postId: string): Promise<GhostPost> {
    const res = await fetch(this.endpoint(`/posts/${postId}/`), {
      headers: this.authHeader,
    });
    if (!res.ok) {
      throw new Error(`Ghost getPost failed (${res.status}): ${await res.text()}`);
    }

    const data = (await res.json()) as { posts: GhostPost[] };
    return data.posts[0];
  }

  async publishPost(postId: string): Promise<GhostPost> {
    const current = await this.getPost(postId);
    const res = await fetch(this.endpoint(`/posts/${postId}/?source=html`), {
      method: "PUT",
      headers: this.headers,
      body: JSON.stringify({
        posts: [{ status: "published", updated_at: current.updated_at }],
      }),
    });
    if (!res.ok) {
      throw new Error(`Ghost publishPost failed (${res.status}): ${await res.text()}`);
    }

    const data = (await res.json()) as { posts: GhostPost[] };
    return data.posts[0];
  }
}
