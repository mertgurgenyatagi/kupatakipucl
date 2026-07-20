export interface ForumPost {
  uid: string;
  text: string;
  imageURL: string | null;
  parentId: string | null;
  createdAt: number;
}

export interface PostWithId extends ForumPost {
  id: string;
}
