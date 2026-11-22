export type SocialComment = {
  id: string;
  content: string;
  createdAt: string;
  author?: { id?: string; username?: string; profile?: { fullName?: string | null; photoUrl?: string | null } | null } | null;
  replies?: SocialComment[];
};

export type Post = {
  id: string | number;
  name: string;
  handle: string;
  school: string;
  avatar: string;
  avatarImage?: string;
  time: string;
  content: string;
  likes: number;
  comments: number;
  liked?: boolean;
  bookmarked?: boolean;
  reposted?: boolean;
  tag?: string;
  image?: string;
  replies?: string[];
  reposts?: number;
};
