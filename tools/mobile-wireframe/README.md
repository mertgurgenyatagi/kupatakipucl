# Mobile wireframe tool

Double-click `index.html`. No server, no build, no install.

## The loop

**Drag a rectangle on the phone → type a word → Enter.** That's it.

Everything else is optional: drag a block to move it, drag its corner to resize, click it to add a
note or a flag. `Del` removes, `Ctrl+D` duplicates below, `Ctrl+Z` undoes, arrows nudge,
`Shift`+arrows resize.

The grid is 6 columns wide and 20 rows tall per screenful, so a block can be full-width, a half,
a third, or two-thirds. Blocks cannot overlap unless you flag one as `overlay`.

## Screens

The left rail is the row (Home, Leaderboard, Team Popup, Signup…). The strip under the toolbar is
the 8 `VisibilityState`s; greyed-out ones aren't reachable for that page. **Matrix** shows the whole
grid at once.

**Every state mirrors the first one you draw in that row.** Draw Home once and all 8 states are
filled. When a state genuinely differs on mobile, open it and hit *Edit this state separately* —
it copies the mirrored layout as a starting point and detaches. Cells that make no sense get
*Mark not applicable*.

The **App Shell** screen is drawn once and appears ghosted on every page, so you never redraw the
nav. Popups and sequences don't get it — they take over the viewport. A popup instead gets a
draggable sheet handle: drag it down for a bottom sheet, up to row 0 for a full-screen one.

The right panel lists what that screen's **desktop version** actually renders. Click an entry to
drop a pre-named block. It's a memory aid, not a requirement — mobile is allowed to drop widgets.

## Handing work to Claude

- **Save file** downloads `mobile-wireframes.json`. Put it in this folder and commit it. Then just
  say "read the wireframes file."
- **Copy for Claude** copies a text spec — one screen or all of them — for pasting into chat.

Work autosaves to the browser as you go, but the browser is not the record. Save the file.
