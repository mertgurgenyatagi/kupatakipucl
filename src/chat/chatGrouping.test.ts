import { describe, it, expect } from "vitest";
import { buildChatItems, dateDividerLabel, formatMessageTime, shouldGroupWithPrevious } from "./chatGrouping";
import { MessageWithId } from "./useMessages";

const NOW = new Date("2026-07-25T15:00:00+03:00").getTime();

function msg(overrides: Partial<MessageWithId>): MessageWithId {
  return { id: "m1", uid: "uid1", text: "hey", createdAt: NOW, ...overrides };
}

describe("dateDividerLabel", () => {
  it("labels a message from today as Bugün", () => {
    const today10am = new Date("2026-07-25T10:00:00+03:00").getTime();
    expect(dateDividerLabel(today10am, NOW)).toBe("Bugün");
  });

  it("labels a message from yesterday as Dün", () => {
    const yesterday = new Date("2026-07-24T23:50:00+03:00").getTime();
    expect(dateDividerLabel(yesterday, NOW)).toBe("Dün");
  });

  it("labels anything older than yesterday with a real date, not Bugün/Dün", () => {
    const lastWeek = new Date("2026-07-18T12:00:00+03:00").getTime();
    const label = dateDividerLabel(lastWeek, NOW);
    expect(label).not.toBe("Bugün");
    expect(label).not.toBe("Dün");
    expect(label).toContain("18");
  });

  it("still separates today from yesterday right at midnight, not by a rolling 24h window", () => {
    // 15:00 today minus 16h lands at 23:00 *yesterday* — more than a day
    // by wall-clock hours, but still literally "yesterday" by calendar date.
    const lateLastNight = NOW - 16 * 60 * 60 * 1000;
    expect(dateDividerLabel(lateLastNight, NOW)).toBe("Dün");
  });
});

describe("formatMessageTime", () => {
  it("formats as a 24h HH:MM string", () => {
    const at = new Date("2026-07-25T09:05:00+03:00").getTime();
    expect(formatMessageTime(at)).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe("shouldGroupWithPrevious", () => {
  it("groups two messages from the same sender within the grouping window", () => {
    const previous = msg({ uid: "uid1", createdAt: NOW });
    const current = msg({ uid: "uid1", createdAt: NOW + 60_000 });
    expect(shouldGroupWithPrevious(current, previous)).toBe(true);
  });

  it("does not group messages from different senders", () => {
    const previous = msg({ uid: "uid1", createdAt: NOW });
    const current = msg({ uid: "uid2", createdAt: NOW + 60_000 });
    expect(shouldGroupWithPrevious(current, previous)).toBe(false);
  });

  it("does not group the same sender's messages once too much time has passed", () => {
    const previous = msg({ uid: "uid1", createdAt: NOW });
    const current = msg({ uid: "uid1", createdAt: NOW + 10 * 60_000 });
    expect(shouldGroupWithPrevious(current, previous)).toBe(false);
  });

  it("does not group across a date boundary even if the gap is small", () => {
    const previous = msg({ uid: "uid1", createdAt: new Date("2026-07-24T23:59:00+03:00").getTime() });
    const current = msg({ uid: "uid1", createdAt: new Date("2026-07-25T00:01:00+03:00").getTime() });
    expect(shouldGroupWithPrevious(current, previous)).toBe(false);
  });

  // A system message carries the acting user's own uid, so without an
  // explicit exception it swallowed the header of the very next real message
  // from that same person — which is exactly what happens in every brand-new
  // lobby ("Özel lobi oluşturuldu." then the creator's first message) and right
  // after every join ("X katıldı." then X's first message).
  it("never groups a real message onto a preceding system message, same uid or not", () => {
    const previous = { ...msg({ uid: "uid1", createdAt: NOW }), system: { kind: "created", subjectUid: "uid1" } };
    const current = msg({ uid: "uid1", createdAt: NOW + 30_000 });
    expect(shouldGroupWithPrevious(current, previous)).toBe(false);
  });
});

describe("buildChatItems", () => {
  it("inserts one date divider before the first message of a new day, none for a same-day continuation", () => {
    const today10am = new Date("2026-07-25T10:00:00+03:00").getTime();
    const items = buildChatItems([msg({ id: "a", createdAt: today10am }), msg({ id: "b", createdAt: today10am + 60_000 })], NOW);
    expect(items.filter((i) => i.type === "divider")).toHaveLength(1);
    expect(items[0]).toMatchObject({ type: "divider", label: "Bugün" });
  });

  it("inserts a second divider when messages span two different days", () => {
    const yesterday = new Date("2026-07-24T10:00:00+03:00").getTime();
    const today = new Date("2026-07-25T10:00:00+03:00").getTime();
    const items = buildChatItems([msg({ id: "a", createdAt: yesterday }), msg({ id: "b", createdAt: today })], NOW);
    expect(items.filter((i) => i.type === "divider")).toHaveLength(2);
  });

  it("flags the first message of a run with showHeader=true and grouped continuations with false", () => {
    const t = new Date("2026-07-25T10:00:00+03:00").getTime();
    const items = buildChatItems(
      [
        msg({ id: "a", uid: "uid1", createdAt: t }),
        msg({ id: "b", uid: "uid1", createdAt: t + 60_000 }),
        msg({ id: "c", uid: "uid2", createdAt: t + 120_000 }),
      ],
      NOW
    );
    const messageItems = items.filter((i) => i.type === "message");
    expect(messageItems.map((i) => (i.type === "message" ? i.showHeader : null))).toEqual([true, false, true]);
  });

  it("returns an empty list for no messages", () => {
    expect(buildChatItems([], NOW)).toEqual([]);
  });

  it("shows the header on a new lobby's first real message, right after the creation system line", () => {
    const t = new Date("2026-07-25T10:00:00+03:00").getTime();
    const items = buildChatItems(
      [
        { ...msg({ id: "sys", uid: "uid1", createdAt: t }), system: { kind: "created", subjectUid: "uid1" } },
        msg({ id: "first", uid: "uid1", createdAt: t + 30_000 }),
        msg({ id: "second", uid: "uid1", createdAt: t + 60_000 }),
      ],
      NOW
    );
    const messageItems = items.filter((i) => i.type === "message");
    // system line, then the creator's first message WITH a header, then a
    // normal grouped continuation.
    expect(messageItems.map((i) => (i.type === "message" ? i.showHeader : null))).toEqual([true, true, false]);
  });

  it("shows the header on a joiner's first message right after their own join line", () => {
    const t = new Date("2026-07-25T10:00:00+03:00").getTime();
    const items = buildChatItems(
      [
        msg({ id: "earlier", uid: "uid2", createdAt: t }),
        { ...msg({ id: "sys", uid: "uid1", createdAt: t + 10_000 }), system: { kind: "joined", subjectUid: "uid1" } },
        msg({ id: "hello", uid: "uid1", createdAt: t + 20_000 }),
      ],
      NOW
    );
    const messageItems = items.filter((i) => i.type === "message");
    expect(messageItems.map((i) => (i.type === "message" ? i.showHeader : null))).toEqual([true, true, true]);
  });
});
