import { describe, it, expect } from "vitest";
import {
  findActiveMentionQuery,
  matchMentionCandidates,
  insertMention,
  splitMentionSegments,
  resolveMentionedUids,
} from "./chatMentions";
import { Player } from "../profile/usePlayers";

const players: Player[] = [
  { uid: "uid-ada", firstName: "Ada", lastName: "Lovelace", photoURL: "", createdAt: 1 },
  { uid: "uid-ada2", firstName: "Ada", lastName: "Yılmaz", photoURL: "", createdAt: 2 },
  { uid: "uid-kuzey", firstName: "Kuzey", lastName: "Demir", photoURL: "", createdAt: 3 },
];

describe("findActiveMentionQuery", () => {
  it("finds an in-progress @token at the cursor", () => {
    expect(findActiveMentionQuery("hey @ad", 7)).toEqual({ query: "ad", start: 4 });
  });

  it("finds a bare @ with nothing typed yet as an empty query", () => {
    expect(findActiveMentionQuery("hey @", 5)).toEqual({ query: "", start: 4 });
  });

  it("returns null once whitespace breaks the token", () => {
    expect(findActiveMentionQuery("hey @ad ", 8)).toBeNull();
  });

  it("returns null when there's no @ at all", () => {
    expect(findActiveMentionQuery("hey there", 9)).toBeNull();
  });

  it("returns null for an email-shaped token where @ isn't at a word start", () => {
    expect(findActiveMentionQuery("a@b", 3)).toBeNull();
  });

  it("only looks at text up to the cursor, not the whole string", () => {
    expect(findActiveMentionQuery("@ada more text", 3)).toEqual({ query: "ad", start: 0 });
  });

  it("matches an @ at the very start of the text", () => {
    expect(findActiveMentionQuery("@kuz", 4)).toEqual({ query: "kuz", start: 0 });
  });
});

describe("matchMentionCandidates", () => {
  it("matches by case-insensitive first-name prefix", () => {
    expect(matchMentionCandidates(players, "ad").map((p) => p.uid)).toEqual(["uid-ada", "uid-ada2"]);
  });

  it("returns all players for an empty query", () => {
    expect(matchMentionCandidates(players, "")).toHaveLength(3);
  });

  it("returns nothing when no first name matches", () => {
    expect(matchMentionCandidates(players, "zzz")).toEqual([]);
  });

  it("caps results at max", () => {
    expect(matchMentionCandidates(players, "", 2)).toHaveLength(2);
  });
});

describe("insertMention", () => {
  it("replaces the in-progress token with @FirstName and a trailing space", () => {
    const result = insertMention("hey @ad", { query: "ad", start: 4 }, 7, players[0]);
    expect(result.text).toBe("hey @Ada ");
    expect(result.cursor).toBe(9);
  });

  it("preserves text typed after the cursor", () => {
    const result = insertMention("hey @ad, bak buna", { query: "ad", start: 4 }, 7, players[0]);
    expect(result.text).toBe("hey @Ada , bak buna");
  });
});

describe("splitMentionSegments", () => {
  it("flags an @Word segment that matches a real player's first name", () => {
    const segments = splitMentionSegments("selam @Ada nasılsın", players);
    expect(segments).toContainEqual({ text: "@Ada", isMention: true });
  });

  it("does not flag an @word that matches nobody", () => {
    const segments = splitMentionSegments("bu bir @email değil", players);
    expect(segments.find((s) => s.text === "@email")).toEqual({ text: "@email", isMention: false });
  });

  it("reassembles to the original text when segments are joined back", () => {
    const text = "selam @Ada ve @Kuzey, nasılsınız?";
    const segments = splitMentionSegments(text, players);
    expect(segments.map((s) => s.text).join("")).toBe(text);
  });
});

describe("resolveMentionedUids", () => {
  it("resolves every matching player when a name is ambiguous (two Adas)", () => {
    const uids = resolveMentionedUids("selam @Ada", players);
    expect(uids.sort()).toEqual(["uid-ada", "uid-ada2"]);
  });

  it("resolves a unique name to just that player", () => {
    expect(resolveMentionedUids("selam @Kuzey", players)).toEqual(["uid-kuzey"]);
  });

  it("returns an empty array when nothing is mentioned", () => {
    expect(resolveMentionedUids("selam millet", players)).toEqual([]);
  });

  it("dedupes when the same name is mentioned twice", () => {
    expect(resolveMentionedUids("@Kuzey ve tekrar @Kuzey", players)).toEqual(["uid-kuzey"]);
  });
});
