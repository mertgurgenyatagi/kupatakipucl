import { useEffect, useState } from "react";
import { collection, doc, deleteDoc, getDocs, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { PostLike } from "./postLikeTypes";
import { getCached, setCached } from "../lib/sessionCache";

function likeDocId(postId: string, uid: string): string {
  return `${postId}_${uid}`;
}

/** postId -> set of uids who liked it. */
export type LikesByPost = Map<string, Set<string>>;

const CACHE_KEY = "postLikes";

export function usePostLikes() {
  const cached = getCached<LikesByPost>(CACHE_KEY);
  const [likesByPost, setLikesByPost] = useState<LikesByPost>(cached ?? new Map());
  const [loading, setLoading] = useState(cached === undefined);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let ignore = false;
    // Only flash a loading state on the very first, uncached load — a
    // manual refetch() (e.g. after liking a post) revalidates silently
    // instead of flickering the whole list back to "loading".
    if (getCached<LikesByPost>(CACHE_KEY) === undefined) setLoading(true);
    getDocs(collection(db, "postLikes"))
      .then((snapshot) => {
        if (ignore) return;
        const map: LikesByPost = new Map();
        snapshot.docs.forEach((docSnap: { data: () => unknown }) => {
          const like = docSnap.data() as PostLike;
          const uids = map.get(like.postId) ?? new Set<string>();
          uids.add(like.uid);
          map.set(like.postId, uids);
        });
        setCached(CACHE_KEY, map);
        setLikesByPost(map);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load post likes", err);
        if (ignore) return;
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [refreshIndex]);

  return { likesByPost, loading, refetch: () => setRefreshIndex((n) => n + 1) };
}

/** Doc id is `${postId}_${uid}` — a user can only ever hold one like per
 *  post, so "like" and "unlike" are just create/delete on the same ref. */
export async function setPostLiked(postId: string, uid: string, liked: boolean): Promise<void> {
  const ref = doc(db, "postLikes", likeDocId(postId, uid));
  if (liked) {
    const like: PostLike = { postId, uid, createdAt: Date.now() };
    await setDoc(ref, like);
  } else {
    await deleteDoc(ref);
  }
}
