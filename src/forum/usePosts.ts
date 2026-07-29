import { useEffect, useState, useCallback } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { ForumPost, PostWithId } from "./postTypes";
import { getCached, setCached } from "../lib/sessionCache";

const CACHE_KEY = "forumPosts";

/**
 * not-started-audit item 09/17: this used to be a one-shot `getDocs` over
 * the *entire* collection, re-run from scratch on every single post, like,
 * edit, or delete anywhere in the app via `refetch()` — expensive today,
 * and only getting more so as the season's post count grows with no
 * pagination in place. A live listener fixes both at once: one download,
 * then incremental diffs pushed by Firestore itself (including this
 * client's own pending writes, applied optimistically before the server
 * even round-trips) — so every write is reflected immediately, for
 * everyone, without ever re-fetching the whole collection again.
 *
 * `refetch` is kept as a no-op purely so existing call sites (`onPosted`,
 * `onRefetch` props threaded through PostForm/Forum/ThreadPopup/etc.) don't
 * all need touching — the listener already reflects every write on its own.
 */
export function usePosts() {
  const cached = getCached<PostWithId[]>(CACHE_KEY);
  const [posts, setPosts] = useState<PostWithId[]>(cached ?? []);
  const [loading, setLoading] = useState(cached === undefined);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "forumPosts"),
      (snapshot) => {
        const next = snapshot.docs.map((docSnap: { id: string; data: () => unknown }) => ({
          id: docSnap.id,
          ...(docSnap.data() as ForumPost),
        }));
        setCached(CACHE_KEY, next);
        setPosts(next);
        setLoading(false);
      },
      (err: Error) => {
        console.error("Failed to load forum posts", err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  const refetch = useCallback(() => {}, []);

  return { posts, loading, refetch };
}
