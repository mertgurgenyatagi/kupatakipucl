// src/forum/Forum.tsx
import { usePosts } from "./usePosts";
import { usePlayers } from "../profile/usePlayers";
import { buildThreadTree } from "./buildThreadTree";
import { PostForm } from "./PostForm";
import { ThreadNode } from "./ThreadNode";

interface ForumProps {
  uid: string | null;
}

export function Forum({ uid }: ForumProps) {
  const { posts, loading: postsLoading, refetch } = usePosts();
  const { players, loading: playersLoading } = usePlayers();

  if (postsLoading || playersLoading) return null;

  const tree = buildThreadTree(posts);

  return (
    <div>
      {uid && <PostForm uid={uid} parentId={null} onPosted={refetch} />}
      <ul>
        {tree.map((node) => (
          <ThreadNode key={node.post.id} node={node} uid={uid} players={players} onPosted={refetch} />
        ))}
      </ul>
    </div>
  );
}
