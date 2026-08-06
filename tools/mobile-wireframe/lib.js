/*
 * Mobile wireframe tool — pure logic.
 *
 * Loaded two ways, which is why it is a classic script rather than an ES module:
 *   - the browser, via <script src="lib.js"> over file:// (modules are CORS-blocked there)
 *   - vitest, via `import "./lib.js"` in lib.test.ts (top-level assignment is valid ESM)
 *
 * Nothing here touches the DOM. See ./index.html for the UI.
 */
globalThis.WF = (function () {
  "use strict";

  // ---------------------------------------------------------------- constants

  const GRID = Object.freeze({
    cols: 6,
    rowsPerScreen: 20,
    phoneW: 360,
    phoneH: 780,
  });

  const CELL_W = GRID.phoneW / GRID.cols; // 60
  const CELL_H = GRID.phoneH / GRID.rowsPerScreen; // 39

  const PHASES = ["notstarted", "leaguephase", "preknockout", "knockout"];
  const STARTED_PHASES = ["leaguephase", "preknockout", "knockout"];

  /** The 8 VisibilityStates, grouped logged-out first so the top strip reads as two runs. */
  const STATES = [
    "loggedout_notstarted",
    "loggedout_leaguephase",
    "loggedout_preknockout",
    "loggedout_knockout",
    "loggedin_notstarted",
    "loggedin_leaguephase",
    "loggedin_preknockout",
    "loggedin_knockout",
  ];

  const STATE_LABELS = {
    notstarted: "Başlamadı",
    leaguephase: "Lig",
    preknockout: "Ön-eleme",
    knockout: "Eleme",
  };

  // `overlay` used to exist purely to bypass the overlap check. Blocks may now stack
  // freely, so the flag has no job left and is dropped from saved data on load.
  const FLAGS = ["scrolls", "sticky", "collapsed"];

  const FLAG_LABELS = {
    scrolls: "scrolls inside",
    sticky: "sticky",
    collapsed: "collapsed",
  };

  function statesFor(logins, phases) {
    const out = [];
    for (const isIn of logins) {
      for (const p of phases) out.push(`${isIn ? "loggedin" : "loggedout"}_${p}`);
    }
    return out.filter((s) => STATES.includes(s));
  }

  // ------------------------------------------------------------------ catalog

  /**
   * Widget checklists, curated from the real JSX composition of each page.
   * Layout chrome (Frame/FrameBody/…), icons, and the popup components that are
   * their own rows have been dropped. These are memory aids, never constraints.
   */
  const W = {
    homeLoggedOut: [
      "DustHaze (animated backdrop)",
      "SlotNumber headline",
      "LoginButton",
      "SignupCta",
      "AvatarStack + katıldı count",
      "CountdownDigit ×4",
      "game explanation text",
    ],
    homeLoggedIn: [
      "HomeWelcomeBanner",
      "ParticipantStatusList (Katılımcılar)",
      "LobbySwitcher",
      "LobbyManagementPanel",
      "RecentPostsPreview (Forum)",
      "HomeHero (carousel)",
      "ChatRoom (Sohbet)",
    ],
    homeLoggedOutStarted: [
      "LeagueTableList",
      "UpcomingMatchesPreview",
      "RecentPostsPreview",
      "HomeHero (carousel)",
      "LeaderboardTable",
    ],
    homeLoggedInStarted: [
      "HomeWelcomeVertical",
      "HomeStartedHero (carousel + fixtures drawer)",
      "RecentPostsPreview",
      "NearbyStandingsList",
      "ChatRoom (Sohbet)",
      "KnockoutPredictionWidget",
      "LobbySwitcher",
      "LobbyManagementPanel",
    ],
    about: [
      "DustHaze (animated backdrop)",
      "hero headline",
      "encyclopedic body paragraph",
      "DateTimeline",
    ],
    predictions: [
      "IntroBeat (narrative beats)",
      "ScoringExampleDiagram",
      "TeamRanker — TeamDropList (36 slots)",
      "TeamRanker — TeamGrid",
      "submit CTA",
      "BounceCheck confirmation",
    ],
    knockoutPredictions: [
      "IntroBeat",
      "KnockoutStagePicker",
      "KnockoutPrediction (bracket)",
      "BounceCheck confirmation",
    ],
    leaderboardLeague: ["TeamTable", "HeroCarousel", "UpcomingMatchesDrawer", "LeaderboardTable"],
    leaderboardKnockout: [
      "KnockoutBracket",
      "HeroCarousel",
      "UpcomingMatchesDrawer",
      "LeaderboardTable",
    ],
    forum: [
      "PostForm (composer)",
      "search field",
      "ThreadCard list",
      "ReplyRow",
      "ForumImageThumb",
      "Daha eski konuları yükle",
    ],
    stats: [
      "StatsHero (carousel)",
      "Turnuva İstatistikleri frame",
      "Katılımcı İstatistikleri frame",
      "BarChartWidget ×N",
      "NumberBox",
      "RankedStatList",
    ],
    profileNotStarted: [
      "AvatarImage + photo edit",
      "name",
      "quiz answers table",
      "TeamRanker (re-edit prediction)",
      "delete account",
    ],
    profileStarted: [
      "AvatarImage + photo edit",
      "name",
      "rank / points mini-stat",
      "quiz answers table",
      "RankingList (read-only + averages)",
      "KnockoutBracket",
      "delete account",
    ],
    teamPopup: [
      "TeamCrest + rank/points",
      "PitchDiagram (starting XI)",
      "StatList — Gol Krallığı",
      "StatList — Asist Krallığı",
      "StatList — En İyiler",
      "predicted-by list",
      "MatchRow history",
    ],
    participantPopup: [
      "AvatarImage + name",
      "prediction grid (RankedEntry)",
      "quiz answers",
      "RankHistoryChart",
      "KnockoutBracket",
    ],
    matchupPopup: [
      "TeamColumn (home)",
      "MatchupCenter (score / date)",
      "TeamColumn (away)",
      "PredictorList ×2",
    ],
    threadPopup: [
      "root post",
      "ForumImageThumb",
      "ReplyRow list",
      "PostForm (reply composer)",
    ],
    upcomingDrawer: ["FixtureRow list", "collapse handle"],
    lobbyPanel: [
      "rename field",
      "invite link generator",
      "member list (Crown on owner)",
      "remove member",
      "leave lobby",
      "delete lobby",
    ],
    shell: [
      "logo / wordmark",
      "nav links",
      "account slot (avatar + name)",
      "LoginButton / LogoutButton",
      "Toaster",
    ],
  };

  /** `widgets` may be a flat array, or a map keyed by state with a `default`. */
  const ROWS = [
    // ---- PAGES ----
    {
      id: "home",
      group: "pages",
      label: "Home",
      route: "/",
      states: STATES,
      widgets: {
        loggedout_notstarted: W.homeLoggedOut,
        loggedin_notstarted: W.homeLoggedIn,
        loggedout_leaguephase: W.homeLoggedOutStarted,
        loggedout_preknockout: W.homeLoggedOutStarted,
        loggedout_knockout: W.homeLoggedOutStarted,
        loggedin_leaguephase: W.homeLoggedInStarted,
        loggedin_preknockout: W.homeLoggedInStarted,
        loggedin_knockout: W.homeLoggedInStarted,
      },
    },
    {
      id: "about",
      group: "pages",
      label: "About",
      route: "/about",
      states: STATES,
      widgets: W.about,
    },
    {
      id: "predictions",
      group: "pages",
      label: "Predictions",
      route: "/predictions",
      states: statesFor([true], PHASES),
      widgets: W.predictions,
      note: "Only genuinely reachable at loggedin_notstarted — the page redirects home otherwise.",
    },
    {
      id: "knockoutPredictions",
      group: "pages",
      label: "Knockout Predictions",
      route: "/knockout-predictions",
      states: statesFor([true], PHASES),
      widgets: W.knockoutPredictions,
    },
    {
      id: "leaderboard",
      group: "pages",
      label: "Leaderboard",
      route: "/leaderboard",
      states: statesFor([true], STARTED_PHASES),
      widgets: {
        default: W.leaderboardLeague,
        loggedin_preknockout: W.leaderboardKnockout,
        loggedin_knockout: W.leaderboardKnockout,
      },
    },
    {
      id: "forum",
      group: "pages",
      label: "Forum",
      route: "/forum",
      states: [...statesFor([true], PHASES), ...statesFor([false], STARTED_PHASES)],
      widgets: W.forum,
    },
    {
      id: "stats",
      group: "pages",
      label: "Stats",
      route: "/stats",
      states: statesFor([true], STARTED_PHASES),
      widgets: W.stats,
    },
    {
      id: "profile",
      group: "pages",
      label: "Profile",
      route: "/profile",
      states: statesFor([true], PHASES),
      widgets: {
        default: W.profileStarted,
        loggedin_notstarted: W.profileNotStarted,
      },
    },

    // ---- OVERLAYS ----
    {
      id: "teamPopup",
      group: "overlays",
      label: "Team Popup",
      states: [...statesFor([true], PHASES), ...statesFor([false], STARTED_PHASES)],
      widgets: W.teamPopup,
    },
    {
      id: "participantPopup",
      group: "overlays",
      label: "Participant Popup",
      states: [...statesFor([true], PHASES), ...statesFor([false], STARTED_PHASES)],
      widgets: W.participantPopup,
    },
    {
      id: "matchupPopup",
      group: "overlays",
      label: "Matchup Popup",
      states: [...statesFor([true], PHASES), ...statesFor([false], STARTED_PHASES)],
      widgets: W.matchupPopup,
    },
    {
      id: "threadPopup",
      group: "overlays",
      label: "Thread Popup",
      states: [...statesFor([true], PHASES), ...statesFor([false], STARTED_PHASES)],
      widgets: W.threadPopup,
    },
    {
      id: "upcomingDrawer",
      group: "overlays",
      label: "Upcoming Matches Drawer",
      states: statesFor([true], STARTED_PHASES),
      widgets: W.upcomingDrawer,
    },
    {
      id: "lobbyPanel",
      group: "overlays",
      label: "Lobby Management",
      states: statesFor([true], PHASES),
      widgets: W.lobbyPanel,
    },

    // ---- SEQUENCES (no state axis) ----
    {
      id: "signup",
      group: "sequences",
      label: "Signup",
      steps: [
        "welcome",
        "photo",
        "name",
        "bounce-profile",
        "quiz-age",
        "quiz-knowledge",
        "quiz-messi",
        "quiz-superlig",
        "quiz-uclteam",
        "quiz-device",
        "bounce-survey",
      ],
      widgets: ["progress bar", "back button", "step content", "continue CTA"],
    },
    {
      id: "predictionsFlow",
      group: "sequences",
      label: "Predictions flow",
      steps: ["intro-beat", "scoring-example", "ranker", "submit-confirm"],
      widgets: W.predictions,
    },
    {
      id: "knockoutFlow",
      group: "sequences",
      label: "Knockout flow",
      steps: ["intro-beat", "stage-picker", "bracket", "submit-confirm"],
      widgets: W.knockoutPredictions,
    },
  ];

  const ROW_BY_ID = Object.fromEntries(ROWS.map((r) => [r.id, r]));

  function widgetsFor(rowId, state) {
    const row = ROW_BY_ID[rowId];
    if (!row) return [];
    const w = row.widgets;
    if (Array.isArray(w)) return w;
    if (!w) return [];
    return w[state] || w.default || [];
  }

  // --------------------------------------------------------------- screen ids

  const SHELL_ID = "shell";

  function makeScreenId(rowId, stateOrStep) {
    const row = ROW_BY_ID[rowId];
    if (!row) throw new Error(`unknown row: ${rowId}`);
    if (row.group === "sequences") return `seq:${rowId}#${stateOrStep}`;
    return `${row.group === "overlays" ? "overlay" : "page"}:${rowId}@${stateOrStep}`;
  }

  function parseScreenId(id) {
    if (id === SHELL_ID) return { kind: "shell", rowId: null };
    const seq = /^seq:([^#]+)#(\d+)$/.exec(id);
    if (seq) return { kind: "sequence", rowId: seq[1], step: Number(seq[2]) };
    const m = /^(page|overlay):([^@]+)@(.+)$/.exec(id);
    if (!m) return null;
    return { kind: m[1], rowId: m[2], state: m[3] };
  }

  /** Every screen id in the matrix, in rail order. */
  function allScreenIds() {
    const out = [SHELL_ID];
    for (const row of ROWS) {
      if (row.group === "sequences") {
        row.steps.forEach((_, i) => out.push(makeScreenId(row.id, i)));
      } else {
        for (const s of row.states) out.push(makeScreenId(row.id, s));
      }
    }
    return out;
  }

  function screenIdsForRow(rowId) {
    const row = ROW_BY_ID[rowId];
    if (!row) return [];
    return row.group === "sequences"
      ? row.steps.map((_, i) => makeScreenId(rowId, i))
      : row.states.map((s) => makeScreenId(rowId, s));
  }

  function screenTitle(id) {
    if (id === SHELL_ID) return "App Shell";
    const p = parseScreenId(id);
    if (!p) return id;
    const row = ROW_BY_ID[p.rowId];
    const label = row ? row.label : p.rowId;
    if (p.kind === "sequence") {
      const step = row && row.steps[p.step] ? row.steps[p.step] : `step ${p.step}`;
      return `${label} — ${p.step + 1}. ${step}`;
    }
    return `${label} — ${p.state}`;
  }

  // ------------------------------------------------------------------ document

  function emptyScreen(id) {
    const p = parseScreenId(id);
    const isOverlay = p && p.kind === "overlay";
    const isSequence = p && p.kind === "sequence";
    return {
      // "auto" = mirror this row's first drawn cell. null = independent. string = explicit alias.
      alias: id === SHELL_ID || isSequence ? null : "auto",
      na: false,
      scroll: isSequence || id === SHELL_ID ? "fixed" : "scrolling",
      note: "",
      sheetTopRow: isOverlay ? 6 : null,
      blocks: [],
    };
  }

  function createDoc() {
    const screens = {};
    for (const id of allScreenIds()) screens[id] = emptyScreen(id);
    return {
      version: 1,
      savedAt: null,
      grid: { ...GRID },
      screens,
    };
  }

  /** Fill in anything a loaded file is missing, so old saves keep opening. */
  function migrateDoc(raw) {
    const doc = createDoc();
    if (!raw || typeof raw !== "object") return doc;
    doc.savedAt = raw.savedAt || null;
    const incoming = raw.screens || {};
    for (const id of Object.keys(doc.screens)) {
      const s = incoming[id];
      if (!s) continue;
      doc.screens[id] = {
        ...doc.screens[id],
        ...s,
        blocks: Array.isArray(s.blocks) ? s.blocks.map(normalizeBlock) : [],
      };
      // A cell holding blocks cannot also be following its row — that combination
      // leaves the row with no primary and every state renders blank.
      if (doc.screens[id].alias === "auto" && doc.screens[id].blocks.length > 0) {
        doc.screens[id].alias = null;
      }
    }
    // Screens the current catalog no longer knows about are kept rather than dropped,
    // so a rename in ROWS can never silently delete someone's work.
    for (const id of Object.keys(incoming)) {
      if (!doc.screens[id]) doc.screens[id] = { ...emptyScreen(SHELL_ID), ...incoming[id] };
    }
    return doc;
  }

  let blockSeq = 0;
  function nextBlockId() {
    blockSeq += 1;
    return `b${Date.now().toString(36)}${blockSeq.toString(36)}`;
  }

  function normalizeBlock(b) {
    return {
      id: b.id || nextBlockId(),
      x: b.x | 0,
      y: b.y | 0,
      w: Math.max(1, b.w | 0),
      h: Math.max(1, b.h | 0),
      name: typeof b.name === "string" ? b.name : "",
      note: typeof b.note === "string" ? b.note : "",
      flags: Array.isArray(b.flags) ? b.flags.filter((f) => FLAGS.includes(f)) : [],
      tint: b.tint | 0,
    };
  }

  // ----------------------------------------------------------------- geometry

  function clamp(n, lo, hi) {
    return Math.min(hi, Math.max(lo, n));
  }

  /**
   * Two pixel corners (relative to the canvas top-left) to a snapped grid rect.
   * Handles drags in any direction and clamps into the frame. Always at least 1×1.
   */
  function snapRect(x0, y0, x1, y1, maxRows) {
    const rows = maxRows || GRID.rowsPerScreen;
    const cx0 = clamp(Math.floor(Math.min(x0, x1) / CELL_W), 0, GRID.cols - 1);
    const cy0 = clamp(Math.floor(Math.min(y0, y1) / CELL_H), 0, rows - 1);
    const cx1 = clamp(Math.ceil(Math.max(x0, x1) / CELL_W), cx0 + 1, GRID.cols);
    const cy1 = clamp(Math.ceil(Math.max(y0, y1) / CELL_H), cy0 + 1, rows);
    return { x: cx0, y: cy0, w: cx1 - cx0, h: cy1 - cy0 };
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  }

  /**
   * Blocks may stack freely, so the only constraints left are the frame's own edges:
   * inside the 6 columns, and — on a fixed screen — above the fold.
   */
  function canPlace(blocks, rect, opts) {
    const o = opts || {};
    if (rect.w < 1 || rect.h < 1) return false;
    if (rect.x < 0 || rect.y < 0 || rect.x + rect.w > GRID.cols) return false;
    if (o.maxRows != null && rect.y + rect.h > o.maxRows) return false;
    return true;
  }

  /**
   * Array order is stacking order: later blocks sit on top. For block `id`, the names of
   * whatever it covers — used by the export so a stack is never silently flattened.
   */
  function coveredBy(blocks, id) {
    const i = blocks.findIndex((b) => b.id === id);
    if (i < 0) return [];
    return blocks
      .slice(0, i)
      .filter((b) => rectsOverlap(b, blocks[i]))
      .map((b) => b.name || "(unnamed)");
  }

  /** Blocks that sit flat in the layout — nothing beneath them. Only these can be drawn as art. */
  function baseBlocks(blocks) {
    return blocks.filter((b) => coveredBy(blocks, b.id).length === 0);
  }

  function stackedBlocks(blocks) {
    return blocks.filter((b) => coveredBy(blocks, b.id).length > 0);
  }

  function raise(blocks, id) {
    const i = blocks.findIndex((b) => b.id === id);
    if (i < 0 || i === blocks.length - 1) return blocks;
    blocks.push(blocks.splice(i, 1)[0]);
    return blocks;
  }

  function lower(blocks, id) {
    const i = blocks.findIndex((b) => b.id === id);
    if (i <= 0) return blocks;
    blocks.unshift(blocks.splice(i, 1)[0]);
    return blocks;
  }

  function lowestRow(screen) {
    return (screen.blocks || []).reduce((m, b) => Math.max(m, b.y + b.h), 0);
  }

  /**
   * Canvas height, in whole screenfuls so fold rules always land on a boundary.
   * This is the grid's size, NOT how far the page actually scrolls — see contentDepth.
   */
  function screenRowCount(screen) {
    if (!screen || screen.scroll === "fixed") return GRID.rowsPerScreen;
    const grown = Math.ceil(lowestRow(screen) / GRID.rowsPerScreen) * GRID.rowsPerScreen;
    return Math.max(GRID.rowsPerScreen, grown);
  }

  /**
   * How far the page really scrolls, in screenfuls, measured to the last block —
   * a page whose content ends at row 26 is 1.3 screenfuls, not the 2.0 its canvas suggests.
   */
  function contentDepth(screen) {
    if (!screen || screen.scroll === "fixed") return 1;
    return Math.max(1, lowestRow(screen) / GRID.rowsPerScreen);
  }

  // ------------------------------------------------------------------ aliases

  /** The row's primary: first independent cell (in rail order) that has blocks. */
  function rowPrimary(doc, rowId) {
    for (const id of screenIdsForRow(rowId)) {
      const s = doc.screens[id];
      if (s && s.alias === null && !s.na && s.blocks.length > 0) return id;
    }
    return null;
  }

  /**
   * Resolve a screen id to the id whose blocks should actually render.
   * Returns { id, aliasOf } — aliasOf is null when the screen is its own source.
   * Cycles resolve to the starting screen rather than looping.
   */
  function resolveScreen(doc, id) {
    const seen = new Set();
    let cur = id;
    while (true) {
      if (seen.has(cur)) return { id, aliasOf: null, cycle: true };
      seen.add(cur);
      const s = doc.screens[cur];
      if (!s) return { id, aliasOf: null };
      let next = null;
      if (s.alias === "auto") {
        const p = parseScreenId(cur);
        next = p && p.rowId ? rowPrimary(doc, p.rowId) : null;
        if (next === cur) next = null;
      } else if (typeof s.alias === "string") {
        next = s.alias;
      }
      if (!next || !doc.screens[next]) {
        return { id: cur, aliasOf: cur === id ? null : cur };
      }
      cur = next;
    }
  }

  /** True when pointing `id` at `target` would create a cycle. */
  function wouldCycle(doc, id, target) {
    let cur = target;
    const seen = new Set([id]);
    while (cur) {
      if (seen.has(cur)) return true;
      seen.add(cur);
      const s = doc.screens[cur];
      if (!s || typeof s.alias !== "string" || s.alias === "auto") return false;
      cur = s.alias;
    }
    return false;
  }

  function setAlias(doc, id, target) {
    if (target !== null && target !== "auto") {
      if (target === id || !doc.screens[target]) return false;
      if (wouldCycle(doc, id, target)) return false;
    }
    doc.screens[id].alias = target;
    return true;
  }

  // ------------------------------------------------------------------- export

  function flagSuffix(b) {
    const f = (b.flags || []).map((x) => FLAG_LABELS[x]).filter(Boolean);
    return f.length ? `  ${f.join(", ")}` : "";
  }

  function sortedBlocks(blocks) {
    return [...blocks].sort((a, b) => a.y - b.y || a.x - b.x);
  }

  function pad(s, n) {
    return s.length >= n ? s : s + " ".repeat(n - s.length);
  }

  function truncate(s, n) {
    if (n <= 0) return "";
    return s.length <= n ? s : s.slice(0, Math.max(0, n - 1)) + "…";
  }

  /**
   * ASCII elevation, one text line per ~3 grid rows, folds marked. A flat elevation
   * cannot show depth, so only base blocks are drawn — anything stacked on top is
   * reported separately by renderScreenText rather than being dropped.
   */
  function renderBoxArt(allBlocks, totalRows) {
    const blocks = baseBlocks(allBlocks);
    const INNER = 26;
    const colW = INNER / GRID.cols;
    const bounds = new Set([0, totalRows]);
    for (const b of blocks) {
      bounds.add(b.y);
      bounds.add(b.y + b.h);
    }
    for (let r = GRID.rowsPerScreen; r < totalRows; r += GRID.rowsPerScreen) bounds.add(r);
    const edges = [...bounds].filter((n) => n >= 0 && n <= totalRows).sort((a, b) => a - b);

    const lines = [`┌${"─".repeat(INNER)}┐`];
    for (let i = 0; i < edges.length - 1; i++) {
      const top = edges[i];
      const bot = edges[i + 1];
      if (bot <= top) continue;
      const band = blocks.filter((b) => b.y < bot && b.y + b.h > top).sort((a, b) => a.x - b.x);
      const height = Math.max(1, Math.round((bot - top) / 3));
      for (let k = 0; k < height; k++) {
        const label = k === Math.floor((height - 1) / 2);
        const cells = [];
        let cursor = 0;
        for (const b of band) {
          if (b.x < cursor) continue;
          if (b.x > cursor) cells.push({ from: cursor, to: b.x, text: "" });
          cells.push({ from: b.x, to: b.x + b.w, text: label ? b.name || "?" : "" });
          cursor = b.x + b.w;
        }
        if (cursor < GRID.cols) cells.push({ from: cursor, to: GRID.cols, text: "" });

        // Widths come from cumulative rounded edges so the row always totals INNER
        // exactly — rounding each width independently drifts on thirds.
        let s = "";
        cells.forEach((c, ci) => {
          let width = Math.round(c.to * colW) - Math.round(c.from * colW);
          if (ci > 0) {
            s += "│";
            width -= 1;
          }
          const t = truncate(c.text, Math.max(0, width - 2));
          const left = Math.max(0, Math.floor((width - t.length) / 2));
          s += pad(" ".repeat(left) + t, width);
        });
        lines.push(`│${pad(s, INNER).slice(0, INNER)}│`);
      }
      if (bot < totalRows && bot % GRID.rowsPerScreen === 0) {
        lines.push(`├${"─ fold ".padEnd(INNER, "─").slice(0, INNER)}┤`);
      } else if (bot < totalRows) {
        lines.push(`├${"─".repeat(INNER)}┤`);
      }
    }
    lines.push(`└${"─".repeat(INNER)}┘`);
    return lines;
  }

  /** The precise, build-from listing: one line per block, top-to-bottom then left-to-right. */
  function renderRowListing(blocks, totalRows) {
    const out = [];
    let nextFold = GRID.rowsPerScreen;
    let prevY = null;
    for (const b of sortedBlocks(blocks)) {
      while (nextFold < totalRows && b.y >= nextFold) {
        out.push(`─── fold (row ${nextFold}) ───`);
        nextFold += GRID.rowsPerScreen;
        prevY = null;
      }
      const range = b.y === prevY ? " ".repeat(11) : pad(`rows ${b.y}–${b.y + b.h}`, 11);
      const over = coveredBy(blocks, b.id);
      const stack = over.length ? `  over ${over.join(" + ")}` : "";
      out.push(`${range} [${b.w}] ${b.name || "(unnamed)"}${flagSuffix(b)}${stack}`);
      prevY = b.y;
    }
    return out;
  }

  function renderScreenText(doc, id) {
    const screen = doc.screens[id];
    if (!screen) return `### ${id}\n(unknown screen)\n`;
    const title = screenTitle(id);
    if (screen.na) return `### ${title}\nnot applicable\n`;

    const resolved = resolveScreen(doc, id);
    if (resolved.aliasOf && resolved.aliasOf !== id) {
      return `### ${title}\nidentical to ${screenTitle(resolved.aliasOf)}\n`;
    }

    const src = doc.screens[resolved.id];
    const blocks = src.blocks || [];
    const totalRows = screenRowCount(src);
    const parsed = parseScreenId(id);
    const meta = [];
    if (src.scroll === "fixed") {
      meta.push("scroll: none (one screenful)");
    } else {
      meta.push(`scroll: vertical, ${contentDepth(src).toFixed(1)} screenfuls`);
    }
    meta.push(`shell: ${parsed && parsed.kind === "page" ? "yes" : "no"}`);
    if (src.sheetTopRow != null) {
      meta.push(
        src.sheetTopRow === 0
          ? "sheet: full screen"
          : `sheet: opens at row ${src.sheetTopRow} of ${GRID.rowsPerScreen}`
      );
    }

    const lines = [`### ${title}`, meta.join(" · "), ""];
    if (blocks.length === 0) {
      lines.push("(empty)");
      lines.push("");
      return lines.join("\n");
    }

    const art = renderBoxArt(blocks, totalRows);
    const listing = renderRowListing(blocks, totalRows);
    const height = Math.max(art.length, listing.length);
    const artW = art.reduce((m, l) => Math.max(m, l.length), 0);
    for (let i = 0; i < height; i++) {
      lines.push(`${pad(art[i] || "", artW)}   ${listing[i] || ""}`.trimEnd());
    }

    const stacked = stackedBlocks(blocks);
    if (stacked.length) {
      lines.push(
        "",
        "stacked (not drawn in the elevation above, listed bottom to top):",
        ...stacked.map(
          (b) =>
            `  ${b.name || "(unnamed)"} — rows ${b.y}–${b.y + b.h}, cols ${b.x}–${b.x + b.w}` +
            `, over ${coveredBy(blocks, b.id).join(" + ")}`
        )
      );
    }

    const notes = blocks.filter((b) => b.note).map((b) => `  ${b.name}: "${b.note}"`);
    if (notes.length) lines.push("", "notes:", ...notes);
    if (src.note) lines.push("", `screen note: ${src.note}`);
    lines.push("");
    return lines.join("\n");
  }

  function renderAllText(doc) {
    const out = [
      "# Mobile wireframes — #kupatakipucl",
      `grid: ${GRID.cols} columns · ${GRID.rowsPerScreen} rows per screenful · phone ${GRID.phoneW}×${GRID.phoneH}`,
      "",
    ];
    let group = null;
    for (const id of allScreenIds()) {
      const screen = doc.screens[id];
      if (!screen) continue;
      if (screen.na) continue;
      const resolved = resolveScreen(doc, id);
      const src = doc.screens[resolved.id];
      if (!src || src.blocks.length === 0) continue;
      const p = parseScreenId(id);
      const g = id === SHELL_ID ? "shell" : ROW_BY_ID[p.rowId] && ROW_BY_ID[p.rowId].group;
      if (g !== group) {
        group = g;
        out.push(`## ${String(g).toUpperCase()}`, "");
      }
      out.push(renderScreenText(doc, id));
    }
    return out.join("\n");
  }

  /** Per-cell progress for the matrix overview. */
  function cellStatus(doc, id) {
    const s = doc.screens[id];
    if (!s) return "empty";
    if (s.na) return "na";
    if (s.blocks.length > 0) return "drawn";
    const r = resolveScreen(doc, id);
    if (r.aliasOf && doc.screens[r.id] && doc.screens[r.id].blocks.length > 0) return "alias";
    return "empty";
  }

  return {
    GRID,
    CELL_W,
    CELL_H,
    STATES,
    STATE_LABELS,
    PHASES,
    FLAGS,
    FLAG_LABELS,
    ROWS,
    ROW_BY_ID,
    SHELL_ID,
    statesFor,
    widgetsFor,
    makeScreenId,
    parseScreenId,
    allScreenIds,
    screenIdsForRow,
    screenTitle,
    createDoc,
    migrateDoc,
    emptyScreen,
    normalizeBlock,
    nextBlockId,
    snapRect,
    rectsOverlap,
    canPlace,
    coveredBy,
    baseBlocks,
    stackedBlocks,
    raise,
    lower,
    screenRowCount,
    contentDepth,
    rowPrimary,
    resolveScreen,
    wouldCycle,
    setAlias,
    renderScreenText,
    renderAllText,
    renderBoxArt,
    renderRowListing,
    cellStatus,
  };
})();
