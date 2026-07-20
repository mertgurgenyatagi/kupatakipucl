// src/forum/createPost.ts
import { addDoc, collection } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { ForumPost } from "./postTypes";

export async function createPost(
  uid: string,
  text: string,
  imageFile: File | null,
  parentId: string | null
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed && !imageFile) return;

  let imageURL: string | null = null;
  if (imageFile) {
    const imageRef = ref(storage, `forum-images/${uid}-${Date.now()}`);
    await uploadBytes(imageRef, imageFile);
    imageURL = await getDownloadURL(imageRef);
  }

  const post: ForumPost = { uid, text: trimmed, imageURL, parentId, createdAt: Date.now() };
  await addDoc(collection(db, "forumPosts"), post);
}
