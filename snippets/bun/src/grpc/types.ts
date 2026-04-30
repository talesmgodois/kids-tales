export interface Story {
  id: string;
  title: string;
  author: string;
  content: string;
  category: string;
  age_min: number;
}

export type CreateStoryInput = Omit<Story, "id">;

export interface GetStoryRequest    { id: string }
export interface ListStoriesRequest { category?: string }
