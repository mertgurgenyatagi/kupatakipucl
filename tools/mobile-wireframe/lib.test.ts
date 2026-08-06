// tools/mobile-wireframe/lib.test.ts
//
// Covers the pure logic behind the wireframe tool. A bug in any of this silently
// corrupts the exported spec, which is the whole product — the DOM wiring in
// index.html is verified by opening it, not here.
import { describe, it, expect, beforeEach } from "vitest";
import "./lib.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const WF: any = (globalThis as any).WF;

type Rect = { x: number; y: number; w: number; h: number };

function block(over: Partial<Rect & { id: string; name: string; flags: string[] }> = {}) {
  return WF.normalizeBlock({ x: 0, y: 0, w: 6, h: 3, name: "b", ...over });
}

describe("catalog", () => {
  it("exposes 8 visibility states", () => {
    expect(WF.STATES).toHaveLength(8);
    expect(WF.STATES).toContain("loggedout_notstarted");
    expect(WF.STATES).toContain("loggedin_knockout");
  });

  it("mirrors pageAccess.ts exactly for the gated pages", () => {
    const live = (id: string) => WF.ROW_BY_ID[id].states;
    expect(live("leaderboard")).toEqual([
      "loggedin_leaguephase",
      "loggedin_preknockout",
      "loggedin_knockout",
    ]);
    expect(live("stats")).toHaveLength(3);
    expect(live("profile")).toHaveLength(4);
    // Forum: logged-in everywhere, plus logged-out on started phases only.
    expect(live("forum")).toHaveLength(7);
    expect(live("forum")).toContain("loggedout_leaguephase");
    expect(live("forum")).not.toContain("loggedout_notstarted");
    // Home and About are never gated.
    expect(live("home")).toHaveLength(8);
    expect(live("about")).toHaveLength(8);
  });

  it("gives Home a different widget checklist per composition", () => {
    const out = WF.widgetsFor("home", "loggedout_notstarted");
    const inStarted = WF.widgetsFor("home", "loggedin_knockout");
    expect(out).toContain("LoginButton");
    expect(out).not.toContain("ChatRoom (Sohbet)");
    expect(inStarted).toContain("ChatRoom (Sohbet)");
  });

  it("falls back to the default widget list when a state has no override", () => {
    expect(WF.widgetsFor("leaderboard", "loggedin_leaguephase")).toContain("TeamTable");
    expect(WF.widgetsFor("leaderboard", "loggedin_knockout")).toContain("KnockoutBracket");
  });

  it("round-trips screen ids for all three groups", () => {
    const page = WF.makeScreenId("home", "loggedin_knockout");
    expect(WF.parseScreenId(page)).toMatchObject({ kind: "page", rowId: "home" });
    const overlay = WF.makeScreenId("teamPopup", "loggedin_knockout");
    expect(WF.parseScreenId(overlay)).toMatchObject({ kind: "overlay", rowId: "teamPopup" });
    const seq = WF.makeScreenId("signup", 4);
    expect(WF.parseScreenId(seq)).toMatchObject({ kind: "sequence", rowId: "signup", step: 4 });
  });

  it("names sequence steps in the title", () => {
    expect(WF.screenTitle(WF.makeScreenId("signup", 0))).toBe("Signup — 1. welcome");
    expect(WF.screenTitle("shell")).toBe("App Shell");
  });
});

describe("snapRect", () => {
  it("snaps pixel corners outward to whole cells", () => {
    // one pixel inside col 0 / row 0, dragged to just past col 2 / row 1
    expect(WF.snapRect(1, 1, 125, 45)).toEqual({ x: 0, y: 0, w: 3, h: 2 });
  });

  it("normalises a drag made up-and-left", () => {
    const down = WF.snapRect(0, 0, 180, 117);
    const up = WF.snapRect(180, 117, 0, 0);
    expect(up).toEqual(down);
  });

  it("never produces a zero-size rect from a click", () => {
    const r = WF.snapRect(70, 50, 70, 50);
    expect(r.w).toBe(1);
    expect(r.h).toBe(1);
  });

  it("clamps a drag that runs off the right and bottom edges", () => {
    const r = WF.snapRect(300, 700, 9999, 9999, 20);
    expect(r.x + r.w).toBe(6);
    expect(r.y + r.h).toBe(20);
  });

  it("clamps a drag starting off-canvas", () => {
    const r = WF.snapRect(-500, -500, 60, 39);
    expect(r).toEqual({ x: 0, y: 0, w: 1, h: 1 });
  });

  it("respects a taller row budget on scrolling screens", () => {
    const r = WF.snapRect(0, 1500, 60, 9999, 60);
    expect(r.y + r.h).toBe(60);
  });
});

describe("canPlace", () => {
  const existing = [block({ id: "a", x: 0, y: 0, w: 6, h: 4 })];

  it("rejects an intersecting rect", () => {
    expect(WF.canPlace(existing, { x: 0, y: 3, w: 6, h: 2 })).toBe(false);
  });

  it("allows a rect that only touches an edge", () => {
    expect(WF.canPlace(existing, { x: 0, y: 4, w: 6, h: 2 })).toBe(true);
  });

  it("allows side-by-side rects in the same rows", () => {
    const half = [block({ id: "l", x: 0, y: 0, w: 3, h: 4 })];
    expect(WF.canPlace(half, { x: 3, y: 0, w: 3, h: 4 })).toBe(true);
  });

  it("ignores the block being moved", () => {
    expect(WF.canPlace(existing, { x: 0, y: 1, w: 6, h: 4 }, { ignoreId: "a" })).toBe(true);
  });

  it("exempts an overlay block being placed", () => {
    expect(WF.canPlace(existing, { x: 0, y: 0, w: 6, h: 2 }, { isOverlay: true })).toBe(true);
  });

  it("exempts an existing overlay block from blocking others", () => {
    const withOverlay = [block({ id: "o", x: 0, y: 0, w: 6, h: 4, flags: ["overlay"] })];
    expect(WF.canPlace(withOverlay, { x: 0, y: 0, w: 6, h: 4 })).toBe(true);
  });

  it("rejects a rect past the right edge", () => {
    expect(WF.canPlace([], { x: 4, y: 0, w: 3, h: 1 })).toBe(false);
  });

  it("rejects a rect past a fixed screen's last row", () => {
    expect(WF.canPlace([], { x: 0, y: 18, w: 6, h: 4 }, { maxRows: 20 })).toBe(false);
    expect(WF.canPlace([], { x: 0, y: 18, w: 6, h: 2 }, { maxRows: 20 })).toBe(true);
  });
});

describe("screenRowCount", () => {
  it("pins a fixed screen to exactly one screenful", () => {
    const s = { scroll: "fixed", blocks: [block({ y: 0, h: 4 })] };
    expect(WF.screenRowCount(s)).toBe(20);
  });

  it("keeps a short scrolling screen at one screenful", () => {
    const s = { scroll: "scrolling", blocks: [block({ y: 0, h: 4 })] };
    expect(WF.screenRowCount(s)).toBe(20);
  });

  it("grows a scrolling screen in whole screenfuls", () => {
    const s = { scroll: "scrolling", blocks: [block({ y: 20, h: 4 })] };
    expect(WF.screenRowCount(s)).toBe(40);
  });

  it("only grows once a block actually crosses the fold", () => {
    // ends at row 19 — still one screenful
    expect(WF.screenRowCount({ scroll: "scrolling", blocks: [block({ y: 16, h: 3 })] })).toBe(20);
    // ends exactly on the fold — still one screenful
    expect(WF.screenRowCount({ scroll: "scrolling", blocks: [block({ y: 16, h: 4 })] })).toBe(20);
    // one row past it — two
    expect(WF.screenRowCount({ scroll: "scrolling", blocks: [block({ y: 16, h: 5 })] })).toBe(40);
  });
});

describe("contentDepth", () => {
  it("measures to the last block, not to the canvas edge", () => {
    // canvas is 2 screenfuls, but the content only reaches row 26
    const s = { scroll: "scrolling", blocks: [block({ y: 22, h: 4 })] };
    expect(WF.screenRowCount(s)).toBe(40);
    expect(WF.contentDepth(s)).toBeCloseTo(1.3, 5);
  });

  it("never reports less than one screenful", () => {
    expect(WF.contentDepth({ scroll: "scrolling", blocks: [block({ y: 0, h: 2 })] })).toBe(1);
    expect(WF.contentDepth({ scroll: "fixed", blocks: [block({ y: 0, h: 2 })] })).toBe(1);
  });
});

describe("aliases", () => {
  let doc: Record<string, never> | Record<string, unknown>;
  const cellA = WF.makeScreenId("teamPopup", "loggedin_leaguephase");
  const cellB = WF.makeScreenId("teamPopup", "loggedin_knockout");
  const cellFirst = WF.makeScreenId("teamPopup", "loggedin_notstarted");

  beforeEach(() => {
    doc = WF.createDoc();
  });

  it("starts every matrix cell on auto", () => {
    expect((doc as never as { screens: Record<string, { alias: string }> }).screens[cellA].alias).toBe(
      "auto"
    );
  });

  it("leaves the shell and sequence steps independent", () => {
    const d = doc as never as { screens: Record<string, { alias: string | null }> };
    expect(d.screens["shell"].alias).toBeNull();
    expect(d.screens[WF.makeScreenId("signup", 0)].alias).toBeNull();
  });

  it("resolves auto cells to the row's first drawn cell", () => {
    const d = doc as never as { screens: Record<string, { alias: string | null; blocks: unknown[] }> };
    d.screens[cellFirst].alias = null;
    d.screens[cellFirst].blocks = [block()];
    expect(WF.resolveScreen(doc, cellA)).toEqual({ id: cellFirst, aliasOf: cellFirst });
    expect(WF.resolveScreen(doc, cellFirst)).toEqual({ id: cellFirst, aliasOf: null });
  });

  it("reports no alias while the row has nothing drawn yet", () => {
    expect(WF.resolveScreen(doc, cellA)).toEqual({ id: cellA, aliasOf: null });
  });

  it("follows an explicit alias to another cell", () => {
    const d = doc as never as { screens: Record<string, { alias: string | null; blocks: unknown[] }> };
    d.screens[cellB].alias = null;
    d.screens[cellB].blocks = [block({ name: "sheet" })];
    expect(WF.setAlias(doc, cellA, cellB)).toBe(true);
    expect(WF.resolveScreen(doc, cellA).id).toBe(cellB);
  });

  it("resolves a chain of explicit aliases transitively", () => {
    const d = doc as never as { screens: Record<string, { alias: string | null; blocks: unknown[] }> };
    d.screens[cellFirst].alias = null;
    d.screens[cellFirst].blocks = [block()];
    WF.setAlias(doc, cellB, cellFirst);
    WF.setAlias(doc, cellA, cellB);
    expect(WF.resolveScreen(doc, cellA).id).toBe(cellFirst);
  });

  it("refuses an alias that would close a cycle", () => {
    WF.setAlias(doc, cellA, cellB);
    expect(WF.wouldCycle(doc, cellB, cellA)).toBe(true);
    expect(WF.setAlias(doc, cellB, cellA)).toBe(false);
    const d = doc as never as { screens: Record<string, { alias: string | null }> };
    expect(d.screens[cellB].alias).toBe("auto");
  });

  it("refuses a self-alias and an unknown target", () => {
    expect(WF.setAlias(doc, cellA, cellA)).toBe(false);
    expect(WF.setAlias(doc, cellA, "page:nope@loggedin_knockout")).toBe(false);
  });

  it("falls back to itself when an explicit alias target is gone", () => {
    const d = doc as never as { screens: Record<string, unknown> };
    WF.setAlias(doc, cellA, cellB);
    delete d.screens[cellB];
    expect(WF.resolveScreen(doc, cellA).id).toBe(cellA);
  });

  it("does not treat an N/A cell as a row primary", () => {
    const d = doc as never as {
      screens: Record<string, { alias: string | null; blocks: unknown[]; na: boolean }>;
    };
    d.screens[cellFirst].alias = null;
    d.screens[cellFirst].blocks = [block()];
    d.screens[cellFirst].na = true;
    d.screens[cellB].alias = null;
    d.screens[cellB].blocks = [block({ name: "real" })];
    expect(WF.rowPrimary(doc, "teamPopup")).toBe(cellB);
  });
});

describe("cellStatus", () => {
  it("reports empty, drawn, alias and na", () => {
    const doc = WF.createDoc();
    const first = WF.makeScreenId("stats", "loggedin_leaguephase");
    const other = WF.makeScreenId("stats", "loggedin_knockout");
    expect(WF.cellStatus(doc, first)).toBe("empty");

    doc.screens[first].alias = null;
    doc.screens[first].blocks = [block()];
    expect(WF.cellStatus(doc, first)).toBe("drawn");
    expect(WF.cellStatus(doc, other)).toBe("alias");

    doc.screens[other].na = true;
    expect(WF.cellStatus(doc, other)).toBe("na");
  });
});

describe("export", () => {
  function docWith(id: string, blocks: unknown[], over: Record<string, unknown> = {}) {
    const doc = WF.createDoc();
    Object.assign(doc.screens[id], { alias: null, blocks, ...over });
    return doc;
  }

  const leaderboard = WF.makeScreenId("leaderboard", "loggedin_leaguephase");

  it("renders the row listing with spans, ranges and flags", () => {
    const doc = docWith(leaderboard, [
      block({ x: 0, y: 0, w: 6, h: 3, name: "phase-banner" }),
      block({ x: 0, y: 3, w: 6, h: 8, name: "team-table", flags: ["scrolls"] }),
    ]);
    const text = WF.renderScreenText(doc, leaderboard);
    expect(text).toContain("rows 0–3");
    expect(text).toContain("[6] phase-banner");
    expect(text).toContain("[6] team-table");
    expect(text).toContain("scrolls inside");
  });

  it("omits the row range on a block sharing the previous block's start row", () => {
    const doc = docWith(leaderboard, [
      block({ x: 0, y: 4, w: 3, h: 4, name: "hero" }),
      block({ x: 3, y: 4, w: 3, h: 4, name: "standings" }),
    ]);
    const listing = WF.renderRowListing(doc.screens[leaderboard].blocks, 20);
    expect(listing[0]).toContain("rows 4–8");
    expect(listing[1]).toMatch(/^\s+\[3] standings/);
  });

  it("marks the fold in a scrolling screen's listing", () => {
    const doc = docWith(leaderboard, [
      block({ x: 0, y: 0, w: 6, h: 4, name: "top" }),
      block({ x: 0, y: 22, w: 6, h: 4, name: "below-fold" }),
    ]);
    const text = WF.renderScreenText(doc, leaderboard);
    expect(text).toContain("fold (row 20)");
    expect(text.indexOf("top")).toBeLessThan(text.indexOf("fold (row 20)"));
    expect(text.indexOf("fold (row 20)")).toBeLessThan(text.indexOf("below-fold"));
  });

  it("reports scroll depth measured to the last block", () => {
    const doc = docWith(leaderboard, [block({ y: 22, h: 4, name: "x" })]);
    expect(WF.renderScreenText(doc, leaderboard)).toContain("1.3 screenfuls");
  });

  it("says a fixed screen does not scroll", () => {
    const doc = docWith(leaderboard, [block({ name: "x" })], { scroll: "fixed" });
    expect(WF.renderScreenText(doc, leaderboard)).toContain("scroll: none");
  });

  it("renders an aliased cell as a reference, not a duplicate", () => {
    const doc = WF.createDoc();
    const first = WF.makeScreenId("teamPopup", "loggedin_notstarted");
    const later = WF.makeScreenId("teamPopup", "loggedin_knockout");
    Object.assign(doc.screens[first], { alias: null, blocks: [block({ name: "crest" })] });
    const text = WF.renderScreenText(doc, later);
    expect(text).toContain("identical to");
    expect(text).not.toContain("crest");
  });

  it("renders an N/A cell as not applicable", () => {
    const doc = WF.createDoc();
    doc.screens[leaderboard].na = true;
    expect(WF.renderScreenText(doc, leaderboard)).toContain("not applicable");
  });

  it("carries block notes and the screen note through", () => {
    const doc = docWith(
      leaderboard,
      [block({ name: "team-table", note: "top 8 only, tap to expand" })],
      { note: "bracket replaces the table in knockout" }
    );
    const text = WF.renderScreenText(doc, leaderboard);
    expect(text).toContain('team-table: "top 8 only, tap to expand"');
    expect(text).toContain("screen note: bracket replaces the table in knockout");
  });

  it("reports the sheet height for overlay screens", () => {
    const popup = WF.makeScreenId("teamPopup", "loggedin_leaguephase");
    const doc = docWith(popup, [block({ name: "crest" })], { sheetTopRow: 8 });
    expect(WF.renderScreenText(doc, popup)).toContain("sheet: opens at row 8");
    const full = docWith(popup, [block({ name: "crest" })], { sheetTopRow: 0 });
    expect(WF.renderScreenText(full, popup)).toContain("sheet: full screen");
  });

  it("says shell: yes for pages and no for overlays and sequences", () => {
    const doc = docWith(leaderboard, [block({ name: "x" })]);
    expect(WF.renderScreenText(doc, leaderboard)).toContain("shell: yes");
    const popup = WF.makeScreenId("matchupPopup", "loggedin_leaguephase");
    const doc2 = docWith(popup, [block({ name: "x" })]);
    expect(WF.renderScreenText(doc2, popup)).toContain("shell: no");
  });

  it("skips empty and N/A screens in the full export", () => {
    const doc = docWith(leaderboard, [block({ name: "team-table" })]);
    const all = WF.renderAllText(doc);
    expect(all).toContain("team-table");
    expect(all).toContain("## PAGES");
    expect(all).not.toContain("About —");
  });
});

describe("renderBoxArt", () => {
  it("keeps every line the same width for full, half and third splits", () => {
    const blocks = [
      block({ x: 0, y: 0, w: 6, h: 3, name: "full" }),
      block({ x: 0, y: 3, w: 3, h: 3, name: "half" }),
      block({ x: 3, y: 3, w: 3, h: 3, name: "half2" }),
      block({ x: 0, y: 6, w: 2, h: 3, name: "a" }),
      block({ x: 2, y: 6, w: 2, h: 3, name: "b" }),
      block({ x: 4, y: 6, w: 2, h: 3, name: "c" }),
    ];
    const art = WF.renderBoxArt(blocks, 20);
    const widths = new Set(art.map((l: string) => l.length));
    expect(widths.size).toBe(1);
  });

  it("draws a fold rule at each screenful boundary", () => {
    const blocks = [
      block({ x: 0, y: 0, w: 6, h: 20, name: "one" }),
      block({ x: 0, y: 20, w: 6, h: 6, name: "two" }),
    ];
    const art = WF.renderBoxArt(blocks, 40).join("\n");
    expect(art).toContain("fold");
  });

  it("labels each block once", () => {
    const art = WF.renderBoxArt([block({ x: 0, y: 0, w: 6, h: 9, name: "solo" })], 20).join("\n");
    expect(art.match(/solo/g)).toHaveLength(1);
  });
});

describe("migrateDoc", () => {
  it("returns a full document from an empty or junk input", () => {
    expect(Object.keys(WF.migrateDoc(null).screens).length).toBeGreaterThan(50);
    expect(Object.keys(WF.migrateDoc({}).screens).length).toBeGreaterThan(50);
  });

  it("keeps saved blocks and normalises them", () => {
    const id = WF.makeScreenId("forum", "loggedin_leaguephase");
    const doc = WF.migrateDoc({
      screens: { [id]: { alias: null, blocks: [{ x: 0, y: 0, w: 6, h: 3, name: "posts" }] } },
    });
    expect(doc.screens[id].blocks[0].name).toBe("posts");
    expect(doc.screens[id].blocks[0].id).toBeTruthy();
    expect(doc.screens[id].blocks[0].flags).toEqual([]);
  });

  it("drops flags it does not recognise", () => {
    expect(WF.normalizeBlock({ flags: ["scrolls", "bogus"] }).flags).toEqual(["scrolls"]);
  });

  it("promotes a saved cell that has blocks but is still following its row", () => {
    const id = WF.makeScreenId("forum", "loggedin_leaguephase");
    const doc = WF.migrateDoc({
      screens: { [id]: { alias: "auto", blocks: [{ x: 0, y: 0, w: 6, h: 3, name: "posts" }] } },
    });
    expect(doc.screens[id].alias).toBeNull();
    expect(WF.rowPrimary(doc, "forum")).toBe(id);
  });

  it("leaves an empty following cell alone", () => {
    const id = WF.makeScreenId("forum", "loggedin_leaguephase");
    const doc = WF.migrateDoc({ screens: { [id]: { alias: "auto", blocks: [] } } });
    expect(doc.screens[id].alias).toBe("auto");
  });

  it("preserves screens the current catalog no longer defines", () => {
    const doc = WF.migrateDoc({ screens: { "page:ghost@loggedin_knockout": { blocks: [] } } });
    expect(doc.screens["page:ghost@loggedin_knockout"]).toBeTruthy();
  });
});
