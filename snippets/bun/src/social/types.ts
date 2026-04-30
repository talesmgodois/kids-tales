// ── LinkedIn ──────────────────────────────────────────────────────────────────

export type LinkedInVisibility = "PUBLIC" | "CONNECTIONS" | "LOGGED_IN";

export interface LinkedInTextPost {
  text: string;
  visibility?: LinkedInVisibility;
}

export interface LinkedInArticlePost {
  text: string;
  url: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  visibility?: LinkedInVisibility;
}

export interface LinkedInImagePost {
  text: string;
  imagePath: string;   // local file path
  altText?: string;
  visibility?: LinkedInVisibility;
}

export interface LinkedInProfile {
  id: string;
  localizedFirstName: string;
  localizedLastName: string;
}

export interface LinkedInPostResult {
  id: string;
}

// ── Instagram ─────────────────────────────────────────────────────────────────

export interface InstagramSinglePost {
  imageUrl: string;    // must be a publicly accessible URL
  caption?: string;
}

export interface InstagramCarouselPost {
  imageUrls: string[]; // 2–10 publicly accessible image URLs
  caption?: string;
}

export interface InstagramReelPost {
  videoUrl: string;    // must be a publicly accessible URL
  caption?: string;
  coverUrl?: string;
  shareToFeed?: boolean;
}

export interface InstagramProfile {
  id: string;
  name: string;
  biography: string;
  followers_count: number;
}

export interface InstagramPostResult {
  id: string;
}
