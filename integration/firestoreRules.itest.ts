import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from "firebase/firestore";

/**
 * Rules tests for the pre-launch lockdown (2026-08-27).
 *
 * This file exists because every rules defect this project has hit was
 * invisible to the rest of the suite. The signup lockout — a deleted account
 * unable to sign up again, because `allow update: if false` on
 * surveyResponses met a setDoc on a document that had outlived its profile —
 * sat in production unnoticed while 129 test files passed. Rules are the only
 * thing standing between a participant and everyone else's data, and nothing
 * was exercising them.
 *
 * Runs against the emulator, so it needs a JDK 21+ on PATH — same prerequisite
 * as the leaderboard integration test, see vitest.integration.config.ts.
 */

// One of the three admin uids baked into firestore.rules.
const ADMIN = "oRAfUtCOwyL57WwgciNCddvkmrB3";
const ALICE = "alice-uid";
const BOB = "bob-uid";

const VALID_SURVEY = {
  age: 25,
  footballKnowledge: 5,
  messiOrRonaldo: "messi",
  superLigTeam: "Tutmuyorum",
  uclTeam: "real-madrid",
  device: "desktop",
  submittedAt: 1_700_000_000_000,
};

const VALID_RANKING = Array.from({ length: 36 }, (_, i) => `team-${i + 1}`);

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "kupatakipucl",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

/** Puts the site into a started phase, bypassing rules to do it. */
async function startTournament(phase = "leaguephase") {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "tournamentState", "current"), { phase });
  });
}

async function seed(path: string, data: Record<string, unknown>) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), path), data);
  });
}

describe("surveyResponses", () => {
  it("lets an owner create their own answers", async () => {
    const db = env.authenticatedContext(ALICE).firestore();
    await assertSucceeds(setDoc(doc(db, "surveyResponses", ALICE), VALID_SURVEY));
  });

  it("refuses answers written for somebody else", async () => {
    const db = env.authenticatedContext(ALICE).firestore();
    await assertFails(setDoc(doc(db, "surveyResponses", BOB), VALID_SURVEY));
  });

  it("still validates the shape on create", async () => {
    const db = env.authenticatedContext(ALICE).firestore();
    await assertFails(
      setDoc(doc(db, "surveyResponses", ALICE), { ...VALID_SURVEY, footballKnowledge: 99 }),
    );
  });

  /**
   * The signup lockout. A deleted account leaves this document behind;
   * ProfileGate then routes the user back through SignupFlow, whose closing
   * setDoc Firestore treats as an update. That used to be denied outright,
   * which locked the account out of the whole site permanently.
   */
  it("lets an owner overwrite answers that outlived their profile", async () => {
    await seed(`surveyResponses/${ALICE}`, VALID_SURVEY);
    const db = env.authenticatedContext(ALICE).firestore();
    await assertSucceeds(
      setDoc(doc(db, "surveyResponses", ALICE), { ...VALID_SURVEY, age: 31 }),
    );
  });

  it("still validates the shape on overwrite", async () => {
    await seed(`surveyResponses/${ALICE}`, VALID_SURVEY);
    const db = env.authenticatedContext(ALICE).firestore();
    await assertFails(
      setDoc(doc(db, "surveyResponses", ALICE), { ...VALID_SURVEY, device: "smartwatch" }),
    );
  });

  it("lets an owner delete their answers, so deleting an account is complete", async () => {
    await seed(`surveyResponses/${ALICE}`, VALID_SURVEY);
    const db = env.authenticatedContext(ALICE).firestore();
    await assertSucceeds(deleteDoc(doc(db, "surveyResponses", ALICE)));
  });

  it("refuses to let anyone delete somebody else's answers", async () => {
    await seed(`surveyResponses/${ALICE}`, VALID_SURVEY);
    const db = env.authenticatedContext(BOB).firestore();
    await assertFails(deleteDoc(doc(db, "surveyResponses", ALICE)));
  });
});

describe("admin-only collections", () => {
  it("refuses a participant rewriting the standings", async () => {
    const db = env.authenticatedContext(ALICE).firestore();
    await assertFails(
      setDoc(doc(db, "results", "real-madrid"), {
        position: 1,
        points: 99,
        goalDifference: 50,
        goalsFor: 60,
        goalsAgainst: 10,
      }),
    );
  });

  it("lets an admin write the standings", async () => {
    const db = env.authenticatedContext(ADMIN).firestore();
    await assertSucceeds(
      setDoc(doc(db, "results", "real-madrid"), {
        position: 1,
        points: 99,
        goalDifference: 50,
        goalsFor: 60,
        goalsAgainst: 10,
      }),
    );
  });

  it("keeps the standings publicly readable", async () => {
    await seed("results/real-madrid", { position: 1, points: 9 });
    const db = env.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, "results", "real-madrid")));
  });

  it("refuses a participant pushing the site into another phase", async () => {
    const db = env.authenticatedContext(ALICE).firestore();
    await assertFails(setDoc(doc(db, "tournamentState", "current"), { phase: "knockout" }));
  });

  it("lets an admin set the phase", async () => {
    const db = env.authenticatedContext(ADMIN).firestore();
    await assertSucceeds(setDoc(doc(db, "tournamentState", "current"), { phase: "leaguephase" }));
  });

  it("keeps the phase publicly readable", async () => {
    await startTournament();
    const db = env.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, "tournamentState", "current")));
  });

  it("refuses a participant deciding a match", async () => {
    const db = env.authenticatedContext(ALICE).firestore();
    await assertFails(setDoc(doc(db, "devMatches", "md1-x-y"), { outcome: "homewin" }));
  });

  it("lets an admin decide a match", async () => {
    const db = env.authenticatedContext(ADMIN).firestore();
    await assertSucceeds(setDoc(doc(db, "devMatches", "md1-x-y"), { outcome: "homewin" }));
  });

  /** TeamPopup, MatchupPopup and ParticipantPopup all read this in production. */
  it("keeps devMatches readable by signed-in participants", async () => {
    await seed("devMatches/md1-x-y", { outcome: "homewin" });
    const db = env.authenticatedContext(ALICE).firestore();
    await assertSucceeds(getDoc(doc(db, "devMatches", "md1-x-y")));
  });

  it("closes devConfig to participants entirely", async () => {
    await seed("devConfig/state", { phaseOverride: null });
    const db = env.authenticatedContext(ALICE).firestore();
    await assertFails(getDoc(doc(db, "devConfig", "state")));
    await assertFails(setDoc(doc(db, "devConfig", "state"), { phaseOverride: "knockout" }));
  });
});

describe("prediction privacy before the league phase", () => {
  it("lets you read your own prediction while the tournament has not started", async () => {
    await seed(`predictions/${ALICE}`, { ranking: VALID_RANKING, submittedAt: 1 });
    const db = env.authenticatedContext(ALICE).firestore();
    await assertSucceeds(getDoc(doc(db, "predictions", ALICE)));
  });

  it("hides another participant's prediction while the tournament has not started", async () => {
    await seed(`predictions/${BOB}`, { ranking: VALID_RANKING, submittedAt: 1 });
    const db = env.authenticatedContext(ALICE).firestore();
    await assertFails(getDoc(doc(db, "predictions", BOB)));
  });

  it("hides predictions from logged-out visitors before the league phase", async () => {
    await seed(`predictions/${BOB}`, { ranking: VALID_RANKING, submittedAt: 1 });
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "predictions", BOB)));
  });

  it("refuses a bulk read of the whole collection before the league phase", async () => {
    await seed(`predictions/${BOB}`, { ranking: VALID_RANKING, submittedAt: 1 });
    const db = env.authenticatedContext(ALICE).firestore();
    await assertFails(getDocs(collection(db, "predictions")));
  });

  it("opens everyone's predictions once the league phase begins", async () => {
    await seed(`predictions/${BOB}`, { ranking: VALID_RANKING, submittedAt: 1 });
    await startTournament();
    const db = env.authenticatedContext(ALICE).firestore();
    await assertSucceeds(getDoc(doc(db, "predictions", BOB)));
    await assertSucceeds(getDocs(collection(db, "predictions")));
  });

  it("lets logged-out visitors see predictions once the league phase begins", async () => {
    await seed(`predictions/${BOB}`, { ranking: VALID_RANKING, submittedAt: 1 });
    await startTournament();
    const db = env.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, "predictions", BOB)));
  });

  it("still lets you submit your own prediction before the league phase", async () => {
    const db = env.authenticatedContext(ALICE).firestore();
    await assertSucceeds(
      setDoc(doc(db, "predictions", ALICE), {
        ranking: VALID_RANKING,
        submittedAt: 1,
        updatedAt: 1,
      }),
    );
  });
});

describe("the leaderboard cache", () => {
  /**
   * The cache embeds every participant's full ranking, so leaving it
   * publicly readable would leak exactly what the prediction rules above
   * exist to protect.
   */
  it("is unreadable before the league phase, since it carries everyone's ranking", async () => {
    await seed("leaderboardCache/current", {
      entries: [{ uid: BOB, ranking: VALID_RANKING }],
      computedAt: 1,
    });
    const db = env.authenticatedContext(ALICE).firestore();
    await assertFails(getDoc(doc(db, "leaderboardCache", "current")));
  });

  it("is publicly readable once the league phase begins", async () => {
    await seed("leaderboardCache/current", { entries: [], computedAt: 1 });
    await startTournament();
    const db = env.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, "leaderboardCache", "current")));
  });

  it("is never client-writable, in any phase", async () => {
    await startTournament();
    const db = env.authenticatedContext(ADMIN).firestore();
    await assertFails(
      setDoc(doc(db, "leaderboardCache", "current"), { entries: [], computedAt: 2 }),
    );
  });

  it("exposes the submitter list without exposing any ranking", async () => {
    await seed("leaderboardCache/submitters", { uids: [ALICE, BOB], computedAt: 1 });
    const db = env.authenticatedContext(ALICE).firestore();
    const snap = await assertSucceeds(getDoc(doc(db, "leaderboardCache", "submitters")));
    expect(snap.data()?.uids).toEqual([ALICE, BOB]);
  });
});
