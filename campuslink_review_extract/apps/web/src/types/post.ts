export type Post = {
  id: number;
  name: string;
  handle: string;
  school: string;
  avatar: string;
  time: string;
  content: string;
  likes: number;
  comments: number;
  liked?: boolean;
  bookmarked?: boolean;
  tag?: string;
  image?: string;
  replies?: string[];
  reposts?: number;
};
