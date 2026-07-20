import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { ForumPost, PostWithId } from "./postTypes";

export function usePosts() {
  const [posts, setPosts] = useState<PostWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    getDocs(collection(db, "forumPosts"))
      .then((snapshot) => {
        if (ignore) return;
        setPosts(
          snapshot.docs.map((docSnap: { id: string; data: () => unknown }) => ({
            id: docSnap.id,
            ...(docSnap.data() as ForumPost),
          }))
        );
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
