const { cloudEvent } = require("@google-cloud/functions-framework");
const { CloudBillingClient } = require("@google-cloud/billing");
const { Firestore } = require("@google-cloud/firestore");
const { shouldDisableBilling } = require("./actionGuard");
const billing = new CloudBillingClient();
const firestore = new Firestore();

/**
 * Single doc tracking what this function has seen and acted on — see
 * actionGuard.js. Read-modify-write, not a transaction: the only writer is
 * this function, and Cloud Billing's own notification cadence (observed
 * minutes to tens of minutes apart, occasionally seconds during a backlog
 * drain) makes a concurrent invocation a non-concern, the same reasoning
 * fixtures/syncControl.js's single-writer docs rely on.
 */
const stateRef = firestore.doc("stopbilling/state");

cloudEvent("stopBillingOnBudgetExceeded", async (event) => {
  const pubsubData = JSON.parse(Buffer.from(event.data.message.data, "base64").toString());

  const costAmount = pubsubData.costAmount;
  const budgetAmount = pubsubData.budgetAmount;

  if (!process.env.PROJECT_ID) {
    throw new Error("Missing PROJECT_ID environment variable.");
  }
  const projectName = `projects/${process.env.PROJECT_ID}`;

  // Always read billingInfo, even for a routine within-budget ping — it's a
  // free API read, and unconditionally reading it (rather than only on the
  // over-budget path) keeps shouldDisableBilling as the single place that
  // decides anything, instead of duplicating a staleness check here too.
  const [[billingInfo], stateSnap] = await Promise.all([
    billing.getProjectBillingInfo({ name: projectName }),
    stateRef.get(),
  ]);
  const state = stateSnap.exists ? stateSnap.data() : {};
  const lastActionedCost = state.lastActionedCost ?? null;
  const highestKnownBudget = state.highestKnownBudget ?? null;
  const nextHighestKnownBudget =
    highestKnownBudget == null || budgetAmount > highestKnownBudget ? budgetAmount : highestKnownBudget;

  const act = shouldDisableBilling({
    costAmount,
    budgetAmount,
    billingEnabled: billingInfo.billingEnabled,
    lastActionedCost,
    highestKnownBudget,
  });

  if (!act) {
    console.log(
      `No action. cost=${costAmount} budget=${budgetAmount} billingEnabled=${billingInfo.billingEnabled} ` +
        `lastActionedCost=${lastActionedCost} highestKnownBudget=${highestKnownBudget}`
    );
    // Still worth remembering a higher budget figure even when it didn't
    // change the outcome this time — it's exactly what lets a *later*
    // stale message be recognised and ignored.
    if (nextHighestKnownBudget !== highestKnownBudget) {
      await stateRef.set({ highestKnownBudget: nextHighestKnownBudget }, { merge: true });
    }
    return;
  }

  console.log(
    `Cost ${costAmount} exceeded budget ${budgetAmount} — disabling billing for ${projectName}.`
  );
  await billing.updateProjectBillingInfo({
    name: projectName,
    projectBillingInfo: { billingAccountName: "" },
  });
  await stateRef.set({
    lastActionedCost: costAmount,
    highestKnownBudget: nextHighestKnownBudget,
    lastActionedAt: new Date(),
  });
  console.log("Billing disabled.");
});
