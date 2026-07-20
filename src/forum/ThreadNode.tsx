// src/forum/ThreadNode.tsx
import { ThreadNode as ThreadNodeData } from "./buildThreadTree";
import { Player } from "../profile/usePlayers";
import { PostForm } from "./PostForm";

interface ThreadNodeProps {
  node: ThreadNodeData;
  uid: string | null;
  players: Player[];
  onPosted: () => void;
}

function senderName(postUid: string, players: Player[]): string {
  const player = players.find((p) => p.uid === postUid);
  return player ? `${player.firstName} ${player.lastName}` : postUid;
}

export function ThreadNode({ node, uid, players, onPosted }: ThreadNodeProps) {
  return (
    <li>
      <p>
        <strong>{senderName(node.post.uid, players)}:</strong> {node.post.text}
      </p>
      {node.post.imageURL && <img src={node.post.imageURL} alt="Gönderi resmi" />}
      {uid && <PostForm uid={uid} parentId={node.post.id} onPosted={onPosted} />}
      {node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <ThreadNode key={child.post.id} node={child} uid={uid} players={players} onPosted={onPosted} />
          ))}
        </ul>
      )}
    </li>
  );
}
