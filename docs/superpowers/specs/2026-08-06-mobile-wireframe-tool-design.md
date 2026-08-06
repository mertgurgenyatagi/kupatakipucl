# Mobile Wireframe Tool — design

**Date:** 2026-08-06
**Status:** approved, pre-implementation

## Purpose

Mobile design has been explicitly out of scope for this entire project (every branch since
`isolated-expansion` says so). It is now in scope. Every page, popup, and flow needs a mobile
layout, and the widgets to fill them already exist — what is missing is *the arrangement*.

This tool exists so Mert can produce those arrangements quickly and hand them to Claude as a
precise, unambiguous artifact. It is a layout instrument, not a design instrument: it draws
labelled rectangles on a snapped grid and exports a text spec. It deliberately does **not**
render real widgets, real copy, real colour, or real type. Fidelity is not the point; *position,
proportion, order, and scroll behaviour* are the point.

**Priority order, stated by Mert and binding on every decision below:** ease of use and
simplicity first, aesthetics last.

## Non-goals

- Not a mockup tool. No real components, no real content, no theming.
- No nesting. An oblong cannot contain oblongs; draw adjacent oblongs instead.
- No responsive preview, no breakpoints, no tablet, no landscape. Portrait phone only.
- No inter-screen navigation modelling. Mert's call: *"navigation is going to be pretty self
  explanatory."*
- Not part of the app. It ships in `tools/`, is never imported by `src/`, and has no effect on
  the production bundle.

## Delivery

A single self-contained HTML file, opened by double-clicking. No server, no build step, no
dependencies, no network access.

```
tools/mobile-wireframe/
  index.html              the tool — inline CSS + JS, loads lib.js via a classic <script>
  lib.js                  pure logic, assigns globalThis.WF
  lib.test.ts             vitest tests over lib.js
  mobile-wireframes.json  Mert's saved work, committed to git
```

### Why `lib.js` is a classic script

`file://` blocks `<script type="module">` under the browser's CORS rules, so the tool cannot use
ES module imports if it is to stay double-clickable. A classic script that assigns
`globalThis.WF = {...}` loads fine over `file://`, and is *also* valid ESM as far as vitest is
concerned — so `lib.test.ts` can `import "./lib.js"` and then read `globalThis.WF`.

This is the one structural trick in the whole design, and it is what buys tested export logic
without forcing a dev server into the workflow. Vitest's default `include` already covers
`tools/**/*.test.ts`; no config change is needed.

## The canvas

| Property | Value |
|---|---|
| Phone frame | 360 × 780 CSS px |
| Columns | 12 (was 6; widened 2026-08-06 — see below) |
| Row height | 39px |
| Rows per screenful | 20 |

Six columns was chosen over four (cannot express thirds) and twelve (30px columns, precision Mert
explicitly did not want). Six expresses full-width, halves, thirds, and two-thirds + third.

**Update, same day:** widened to 12 columns (15px cells) after direct feedback that six was too
coarse. `CELL_W` is derived from `GRID.cols`, so nothing else in the geometry, overlap, or export
logic changed shape — only the box-art elevation width, which is now `GRID.cols * 3` characters so
narrow columns still have room for a label. A file saved under the old 6-column grid loads
correctly: `migrateDoc` reads the saved `grid.cols`, and if it differs from the current value,
scales every block's `x`/`w` proportionally before normalizing.

### Interaction

The core loop is **drag a rectangle → type a word → Enter.** Everything else is secondary.

- Drag on empty grid draws a new block, snapped to cells. On release, an inline name field
  appears, autofocused; Enter commits, Escape cancels the draw.
- Drag a block's body to move it; drag an edge or corner to resize. Both snap.
- `Delete` removes the selection, `Ctrl+D` duplicates it, `Ctrl+Z` / `Ctrl+Shift+Z` undo and redo.
- Arrow keys nudge the selection by one cell; `Shift`+arrows resize by one cell.

### Stacking

**Blocks may overlap freely** (changed 2026-08-06; overlap was originally refused outright). The
only placement constraints left are the frame's own edges, and the fold on a fixed screen. This has
three consequences the design has to answer:

- **Starting a draw inside an existing block.** A drag beginning on a block moves it, so drawing on
  top requires **Alt+drag** or a **Draw over** toggle in the toolbar.
- **Z-order.** Array order is stacking order; later is on top. `[` / `]` and inspector buttons
  reorder. The `overlay` flag is removed — it existed solely to bypass the old overlap check and
  has no job left.
- **Reaching a buried block.** A fully covered block cannot be clicked, so the inspector carries a
  **Layers** list of every block on the screen, top-first, as the way to select one.

### Scroll modes

Each screen is either **fixed** (clamped to exactly 20 rows; blocks cannot be drawn or dragged past
the fold) or **scrolling** (the canvas auto-grows two rows past the lowest block, with a bold fold
rule drawn every 20 rows). This is a per-screen property and it is exported, because "does this page
scroll" is one of the questions the desktop layouts cannot answer for us.

## Block data

| Field | Type | Notes |
|---|---|---|
| `name` | string | required; autocompletes from the widget catalog but accepts any text |
| `note` | string | optional free text |
| `flags` | set | `scrolls` · `sticky` · `collapsed` |
| `tint` | 0–5 | optional, purely for on-screen readability; not exported |

Flags exist for the things a rectangle physically cannot show. Floating chrome (a FAB, a sticky
action bar) is expressed by stacking plus the `sticky` flag.

## The shell

The app's persistent chrome is designed **once**, on a dedicated Shell screen, and rendered
**ghosted** on every page screen with the content area starting below it. Redrawing a nav bar 76
times was the single largest usability risk in the matrix approach, and this removes it.

Overlays and sequences do not get the shell — they take over the viewport by nature. This is a
group property, not a per-screen toggle, so there is no checkbox to forget.

## Screen model — the matrix

Navigation is two-level: a **left rail of rows**, a **top strip of the 8 `VisibilityState`s**, and a
**full-matrix overview** for sweeping progress. Screen ids are
`page:<row>@<state>`, `overlay:<row>@<state>`, `seq:<row>#<step>`.

Live cells for the PAGES group are derived exactly from `src/state/pageAccess.ts`, not guessed:

| Row | Live states | Cells |
|---|---|---|
| Home | all 8 (never gated) | 8 |
| About | all 8 (ungated route) | 8 |
| Predictions | logged-in, all phases | 4 |
| Knockout Predictions | logged-in, all phases | 4 |
| Leaderboard | logged-in, started phases | 3 |
| Forum | logged-in all phases + logged-out started | 7 |
| Stats | logged-in, started phases | 3 |
| Profile | logged-in, all phases | 4 |

OVERLAYS have no `pageAccess` entry, so their live cells are inferred from where each component is
actually rendered. This is explicitly a best guess; every cell can be marked N/A.

SEQUENCES have no state axis at all — each step is one non-scrolling screen: Signup (11 steps),
the Predictions flow, the Knockout Predictions flow.

### Aliases — the mechanic that makes 76 cells tractable

A cell may be an **alias** of another cell in the same row rather than holding its own blocks.
**Every cell in a row starts as an alias of the first cell drawn in that row.** Drawing Team Popup
once fills its entire row; Mert only breaks an alias where mobile genuinely differs.

This inverts the burden of the matrix: the task becomes "draw ~15 screens and break aliases where
needed" rather than "fill 76 cells." The export states aliasing honestly rather than duplicating
content — `loggedin_preknockout: identical to loggedin_leaguephase`.

Alias chains resolve transitively and **cycles must be detected and refused**, both at set time and
at resolve time.

## Widget catalog

Each cell carries a checklist of what its desktop counterpart actually renders, extracted from the
codebase (JSX usage per composition file, hand-curated to drop layout chrome, icons, and the popup
components that are their own rows). Clicking an entry drops a pre-named oblong; the entry greys out
once placed, and a counter reads "3 of 6 placed."

The checklist is a memory aid, not a constraint — arbitrary names are always allowed, and a mobile
layout is free to drop a widget entirely.

## Export

Two buttons:

- `[↓ Save file]` downloads `mobile-wireframes.json` (full fidelity — every screen, block, flag,
  alias, and note).
- `[⧉ Copy for Claude]` copies a text spec for the current screen or all screens.

Work also autosaves to `localStorage` on every change so a reload never loses anything; the JSON
file is the durable, git-committed record. If `localStorage` is unavailable the tool warns visibly
rather than silently losing work.

### Text format

Box art for human sanity-checking, plus a precise row listing to build from:

```
### Leaderboard — loggedin_leaguephase
scroll: vertical, 2.4 screenfuls · shell: yes

┌──────────────┐   rows  0–3   [6] phase-banner
│░░░░shell░░░░░│   rows  3–11  [6] team-table      ↕ scrolls inside
├──────────────┤   rows 11–15  [3] hero-carousel
│ phase-banner │                  [3] standings-mini
├──────────────┤   rows 15–20  [6] upcoming-matches  ▸ collapsed
│  team-table  │   ─── fold ───
│      ↕       │   rows 20–28  [6] full-standings
├──────┬───────┤
│ hero │stand. │   note on team-table:
├──────┴───────┤     "top 8 only, tap to expand"
│ upcoming   ▸ │
└─ fold ───────┘
```

Blocks are ordered top-to-bottom, then left-to-right, so the listing reads as a build order.

## Data format

```jsonc
{
  "version": 1,
  "savedAt": "2026-08-06T12:00:00.000Z",
  "grid": { "cols": 6, "rowsPerScreen": 20, "phoneW": 360, "phoneH": 780 },
  "shell": { "blocks": [ /* … */ ] },
  "screens": {
    "page:leaderboard@loggedin_leaguephase": {
      "scroll": "scrolling",
      "rows": 28,
      "alias": null,
      "na": false,
      "note": "",
      "sheetTopRow": null,
      "blocks": [
        { "id": "b1", "x": 0, "y": 0, "w": 6, "h": 3,
          "name": "phase-banner", "note": "", "flags": [], "tint": 0 }
      ]
    }
  }
}
```

`sheetTopRow` is non-null only for overlay screens: it is the row at which the sheet begins, with
the dimmed page showing above it. Dragging the sheet handle to row 0 expresses a full-screen popup.

## Testing

`lib.test.ts` covers the pure logic where a silent bug corrupts everything downstream:

- **snapping** — pixel coordinates to grid cells, including drags that start or end outside the frame
- **bounds** — rejection past the frame edges and past a fixed screen's fold
- **stacking** — z-order from array order, what a block covers, raise/lower, and the split between
  base blocks (drawable as art) and stacked ones (reported separately)
- **clamping** — fixed screens refuse blocks past row 20; scrolling screens grow correctly
- **aliases** — transitive resolution, cycle detection and refusal, and what happens when an alias
  target is deleted
- **export** — the row listing, fold placement, multi-block rows, and alias screens rendering as a
  reference rather than duplicated content

DOM wiring in `index.html` is not unit-tested; it is verified by opening the tool and using it.
The lesson recorded in `HANDOVER.md` on 2026-08-03 and re-earned on 2026-08-06 applies here — a
green suite proves the logic's shape, not that the thing works when you click it.

## Risks and accepted trade-offs

- **The overlay-row state cells are inferred, not derived.** Popups have no access-gate entry.
  Mitigated by the per-cell N/A toggle.
- **`Predictions` is 4 live cells per `pageAccess.ts`, but the page redirects home unless
  `loggedin_notstarted`.** Left as 4 rather than silently overriding the access table; expect three
  to be marked N/A.
- **`localStorage` on `file://` is browser-dependent.** Mitigated by explicit save/load to file and
  a visible warning when storage is unavailable.
- **Six columns cannot express fifths.** Accepted; a five-across row on a 360px phone is not a
  layout worth expressing.
