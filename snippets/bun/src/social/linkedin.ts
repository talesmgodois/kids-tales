import type {
  LinkedInArticlePost,
  LinkedInImagePost,
  LinkedInPostResult,
  LinkedInProfile,
  LinkedInTextPost,
  LinkedInVisibility,
} from "./types";

const BASE_URL = "https://api.linkedin.com/v2";

// ── LinkedInClient ────────────────────────────────────────────────────────────

export class LinkedInClient {
  private readonly personUrn: string;
  private readonly headers: Record<string, string>;

  constructor(accessToken: string, personId: string) {
    this.personUrn = `urn:li:person:${personId}`;
    this.headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0",
    };
  }

  // ── Public methods ────────────────────────────────────────────────────────

  getProfile(): Promise<LinkedInProfile> {
    return this.request("GET", "/me");
  }

  postText(input: LinkedInTextPost): Promise<LinkedInPostResult> {
    return this.request(
      "POST",
      "/ugcPosts",
      this.buildPayload(input.text, input.visibility, {
        shareMediaCategory: "NONE",
        media: [],
      })
    );
  }

  postArticle(input: LinkedInArticlePost): Promise<LinkedInPostResult> {
    const media = [
      {
        status: "READY",
        originalUrl: input.url,
        title: { text: input.title },
        ...(input.description && { description: { text: input.description } }),
        ...(input.thumbnailUrl && { thumbnails: [{ url: input.thumbnailUrl }] }),
      },
    ];
    return this.request(
      "POST",
      "/ugcPosts",
      this.buildPayload(input.text, input.visibility, {
        shareMediaCategory: "ARTICLE",
        media,
      })
    );
  }

  async postImage(input: LinkedInImagePost): Promise<LinkedInPostResult> {
    const asset = await this.uploadImage(input.imagePath);
    const media = [
      {
        status: "READY",
        media: asset,
        ...(input.altText && { description: { text: input.altText } }),
      },
    ];
    return this.request(
      "POST",
      "/ugcPosts",
      this.buildPayload(input.text, input.visibility, {
        shareMediaCategory: "IMAGE",
        media,
      })
    );
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as Record<string, string>;
      throw new Error(`LinkedIn ${method} ${path} → ${res.status}: ${err["message"] ?? res.statusText}`);
    }

    return res.json() as Promise<T>;
  }

  private buildPayload(
    text: string,
    visibility: LinkedInVisibility = "PUBLIC",
    media: { shareMediaCategory: string; media: unknown[] }
  ) {
    return {
      author: this.personUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          ...media,
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": visibility,
      },
    };
  }

  // Registers an upload slot, PUTs the binary, and returns the asset URN.
  private async uploadImage(imagePath: string): Promise<string> {
    const { value } = await this.request<{
      value: {
        uploadMechanism: {
          "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest": { uploadUrl: string };
        };
        asset: string;
      };
    }>("POST", "/assets?action=registerUpload", {
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        owner: this.personUrn,
        serviceRelationships: [
          { relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" },
        ],
      },
    });

    const uploadUrl =
      value.uploadMechanism[
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
      ].uploadUrl;

    const file = Bun.file(imagePath);
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "image/jpeg" },
      body: await file.arrayBuffer(),
    });

    if (!uploadRes.ok) {
      throw new Error(`LinkedIn image upload failed: ${uploadRes.status} ${uploadRes.statusText}`);
    }

    return value.asset;
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

export const linkedin = new LinkedInClient(
  process.env.LINKEDIN_ACCESS_TOKEN ?? "",
  process.env.LINKEDIN_PERSON_ID ?? ""
);

// ── Examples ──────────────────────────────────────────────────────────────────

if (import.meta.main) {
  const profile = await linkedin.getProfile();
  console.log(`Posting as: ${profile.localizedFirstName} ${profile.localizedLastName}`);

  // 1. Text post
  const textPost = await linkedin.postText({
    text: "Acabamos de lançar novas histórias infantis na plataforma Kids Tales! 🎉 Confira em kids-tales.com",
  });
  console.log("Text post →", textPost.id);

  // 2. Article / link share
  const articlePost = await linkedin.postArticle({
    text: "Como usamos IA para gerar histórias personalizadas para crianças",
    url: "https://kids-tales.com/blog/ia-historias-infantis",
    title: "IA e Histórias Infantis",
    description: "Entenda como o Gemini nos ajuda a criar conteúdo seguro e criativo.",
  });
  console.log("Article post →", articlePost.id);

  // 3. Image post (local file)
  const imagePost = await linkedin.postImage({
    text: "A nova capa da história 'A Floresta Mágica' já está no ar!",
    imagePath: "./assets/floresta-magica-cover.jpg",
    altText: "Capa da história A Floresta Mágica",
  });
  console.log("Image post →", imagePost.id);
}
