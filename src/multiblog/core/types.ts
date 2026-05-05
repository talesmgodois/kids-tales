export type PostStatus = "draft" | "published";

export interface GhostPost {
  id: string;
  title: string;
  slug: string;
  html: string;
  status: PostStatus;
  url: string;
  updated_at: string;
}

export interface BlogRecord {
  id: string;
  slug: string;
  name: string;
  ghostUrl: string;
  ghostAdminApiKey: string;
  createdAt: Date;
}

export interface BlogPostRecord {
  id: string;
  blogId: string;
  ghostPostId: string;
  title: string;
  slug: string;
  status: PostStatus;
  ghostUrl: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegisterBlogInput {
  slug: string;
  name: string;
  ghostUrl: string;
  ghostAdminApiKey: string;
}

export interface CreateManagedPostInput {
  blogSlug: string;
  title: string;
  html: string;
}

export interface PublishManagedPostInput {
  blogSlug: string;
  postId: string;
}
