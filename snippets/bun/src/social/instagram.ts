import type {
  InstagramCarouselPost,
  InstagramPostResult,
  InstagramProfile,
  InstagramReelPost,
  InstagramSinglePost,
} from "./types";

const BASE_URL = "https://graph.facebook.com/v21.0";

// ── InstagramClient ───────────────────────────────────────────────────────────

export class InstagramClient {
  private readonly userId: string;
  private readonly accessToken: string;

  constructor(accessToken: string, userId: string) {
    this.accessToken = accessToken;
    this.userId = userId;
  }

  // ── Public methods ────────────────────────────────────────────────────────

  getProfile(): Promise<InstagramProfile> {
    return this.request("GET", `/${this.userId}?fields=id,name,biography,followers_count`);
  }

  async postImage(input: InstagramSinglePost): Promise<InstagramPostResult> {
    const { id } = await this.request<{ id: string }>(
      "POST",
      `/${this.userId}/media`,
      { image_url: input.imageUrl, caption: input.caption ?? "" }
    );
    return this.publish(id);
  }

  async postCarousel(input: InstagramCarouselPost): Promise<InstagramPostResult> {
    if (input.imageUrls.length < 2 || input.imageUrls.length > 10) {
      throw new Error("Carousel requires between 2 and 10 images");
    }

    // Create a container for each image, then wrap them in a carousel container.
    const childIds = await Promise.all(
      input.imageUrls.map((imageUrl) =>
        this.request<{ id: string }>("POST", `/${this.userId}/media`, {
          image_url: imageUrl,
          is_carousel_item: true,
        }).then((r) => r.id)
      )
    );

    const { id } = await this.request<{ id: string }>(
      "POST",
      `/${this.userId}/media`,
      {
        media_type: "CAROUSEL",
        children: childIds.join(","),
        caption: input.caption ?? "",
      }
    );

    return this.publish(id);
  }

  async postReel(input: InstagramReelPost): Promise<InstagramPostResult> {
    const { id } = await this.request<{ id: string }>(
      "POST",
      `/${this.userId}/media`,
      {
        media_type: "REELS",
        video_url: input.videoUrl,
        caption: input.caption ?? "",
        ...(input.coverUrl && { cover_url: input.coverUrl }),
        share_to_feed: input.shareToFeed ?? true,
      }
    );

    // Reels are processed asynchronously — wait before publishing.
    await this.waitUntilReady(id);
    return this.publish(id);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async request<T>(method: string, path: string, body?: Record<string, unknown>): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
    url.searchParams.set("access_token", this.accessToken);

    const res = await fetch(url.toString(), {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(
        `Instagram ${method} ${path} → ${res.status}: ${err.error?.message ?? res.statusText}`
      );
    }

    return res.json() as Promise<T>;
  }

  private publish(containerId: string): Promise<InstagramPostResult> {
    return this.request("POST", `/${this.userId}/media_publish`, {
      creation_id: containerId,
    });
  }

  // Polls the container status until it is FINISHED or ERROR (or timeout).
  private async waitUntilReady(containerId: string, maxWaitMs = 60_000): Promise<void> {
    const deadline = Date.now() + maxWaitMs;

    while (Date.now() < deadline) {
      const { status_code } = await this.request<{ status_code: string }>(
        "GET",
        `/${containerId}?fields=status_code`
      );

      if (status_code === "FINISHED") return;
      if (status_code === "ERROR") {
        throw new Error(`Media container ${containerId} processing failed`);
      }

      await Bun.sleep(3_000);
    }

    throw new Error(
      `Media container ${containerId} did not finish processing within ${maxWaitMs / 1000}s`
    );
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

export const instagram = new InstagramClient(
  process.env.INSTAGRAM_ACCESS_TOKEN ?? "",
  process.env.INSTAGRAM_USER_ID ?? ""
);

// ── Examples ──────────────────────────────────────────────────────────────────

if (import.meta.main) {
  const profile = await instagram.getProfile();
  console.log(`Account: ${profile.name} (${profile.followers_count} followers)`);

  // 1. Single image post
  const imagePost = await instagram.postImage({
    imageUrl: "https://kids-tales.com/assets/floresta-magica-cover.jpg",
    caption: "A Floresta Mágica agora disponível na plataforma! 🌿✨ #KidsTales #HistóriasInfantis",
  });
  console.log("Image post →", imagePost.id);

  // 2. Carousel (up to 10 images)
  const carouselPost = await instagram.postCarousel({
    imageUrls: [
      "https://kids-tales.com/assets/slide-1.jpg",
      "https://kids-tales.com/assets/slide-2.jpg",
      "https://kids-tales.com/assets/slide-3.jpg",
    ],
    caption: "3 histórias novas para a semana! Deslize para ver 👉 #KidsTales",
  });
  console.log("Carousel post →", carouselPost.id);

  // 3. Reel
  const reelPost = await instagram.postReel({
    videoUrl: "https://kids-tales.com/assets/trailer-dragao-azul.mp4",
    caption: "O Dragão Azul chegou! 🐉 Assista ao trailer completo. #KidsTales #Fantasia",
    shareToFeed: true,
  });
  console.log("Reel →", reelPost.id);
}
