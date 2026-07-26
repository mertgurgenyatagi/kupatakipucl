import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { ForumPost, PostWithId } from "./postTypes";
import { getCached, setCached } from "../lib/sessionCache";

const CACHE_KEY = "forumPosts";

export function usePosts() {
  const cached = getCached<PostWithId[]>(CACHE_KEY);
  const [posts, setPosts] = useState<PostWithId[]>(cached ?? []);
  const [loading, setLoading] = useState(cached === undefined);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let ignore = false;
    // Only flash a loading state on the very first, uncached load — a
    // manual refetch() (after posting/editing/deleting) revalidates
    // silently instead of flickering the whole feed back to "loading".
    if (getCached<PostWithId[]>(CACHE_KEY) === undefined) setLoading(true);
    getDocs(collection(db, "forumPosts"))
      .then((snapshot) => {
        if (ignore) return;
        const next = snapshot.docs.map((docSnap: { id: string; data: () => unknown }) => ({
          id: docSnap.id,
          ...(docSnap.data() as ForumPost),
        }));
        setCached(CACHE_KEY, next);
        setPosts(next);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load forum posts", err);
        if (ignore) return;
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [refreshIndex]);

  return { posts, loading, refetch: () => setRefreshIndex((n) => n + 1) };
}
