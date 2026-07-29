import { describe, it, expect } from "vitest";
import { buildPlayersByUid } from "./playersByUid";
import type { Player } from "./usePlayers";

describe("buildPlayersByUid", () => {
  it("returns an empty map for an empty players list", () => {
    expect(buildPlayersByUid([]).size).toBe(0);
  });

  it("keys every player by their uid", () => {
    const players: Player[] = [
      { uid: "uid1", firstName: "Ada", lastName: "Lovelace", photoURL: "", createdAt: 1 },
      { uid: "uid2", firstName: "Kuzey", lastName: "Demir", photoURL: "", createdAt: 2 },
    ];
    const map = buildPlayersByUid(players);
    expect(map.get("uid1")).toEqual(players[0]);
    expect(map.get("uid2")).toEqual(players[1]);
    expect(map.size).toBe(2);
  });
});
