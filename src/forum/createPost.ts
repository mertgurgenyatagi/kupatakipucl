// src/forum/createPost.ts
import { addDoc, collection } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { ForumPost, POST_MAX_LENGTH } from "./postTypes";
import { compressImage } from "../lib/compressImage";

// Forum images render as a small bounded thumbnail by default (4chan-style —
// only the click-to-expand view shows them larger), so there's no reason to
// keep a phone camera's full resolution around.
const FORUM_IMAGE_MAX_DIMENSION = 1000;

export interface QuoteRef {
  postId: string;
  authorUid: string;
  text: string;
}

export async function createPost(
  uid: string,
  text: string,
  imageFile: File | null,
  parentId: string | null,
  mentionedUids: string[] = [],
  quote: QuoteRef | null = null
): Promise<void> {
  const trimmed = text.trim().slice(0, POST_MAX_LENGTH);
  if (!trimmed && !imageFile) return;

  let imageURL: string | null = null;
  if (imageFile) {
    const compressed = await compressImage(imageFile, { maxDimension: FORUM_IMAGE_MAX_DIMENSION, quality: 0.75 });
    const imageRef = ref(storage, `forum-images/${uid}-${Date.now()}`);
    await uploadBytes(imageRef, compressed);
    imageURL = await getDownloadURL(imageRef);
  }

  const post: ForumPost = {
    uid,
    text: trimmed,
    imageURL,
    parentId,
    createdAt: Date.now(),
    editedAt: null,
    mentionedUids,
    quotedPostId: quote?.postId ?? null,
    quotedAuthorUid: quote?.authorUid ?? null,
    quotedText: quote?.text ?? null,
  };
  await addDoc(collection(db, "forumPosts"), post);
}
