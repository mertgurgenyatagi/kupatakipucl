const { cloudEvent } = require("@google-cloud/functions-framework");
const { CloudBillingClient } = require("@google-cloud/billing");
const { Firestore } = require("@google-cloud/firestore");
const { shouldDisableBilling } = require("./actionGuard");
const billing = new CloudBillingClient();
const firestore = new Firestore();

/**
 * Single doc tracking the cost this function last actually disabled billing
 * at — see actionGuard.js. Read-modify-write, not a transaction: the only
 * writer is this function, and Cloud Billing's own notification cadence
 * (observed 15-40 minutes apart) makes a concurrent invocation a
 * non-concern, the same reasoning fixtures/syncControl.js's single-writer
 * docs rely on.
 */
const stateRef = firestore.doc("stopbilling/state");

cloudEvent("stopBillingOnBudgetExceeded", async (event) => {
  const pubsubData = JSON.parse(Buffer.from(event.data.message.data, "base64").toString());

  const costAmount = pubsubData.costAmount;
  const budgetAmount = pubsubData.budgetAmount;

  if (costAmount <= budgetAmount) {
    console.log(`No action needed. Current cost: ${costAmount}, budget: ${budgetAmount}`);
    return;
  }

  if (!process.env.PROJECT_ID) {
    throw new Error("Missing PROJECT_ID environment variable.");
  }

  const projectName = `projects/${process.env.PROJECT_ID}`;
  const [[billingInfo], stateSnap] = await Promise.all([
    billing.getProjectBillingInfo({ name: projectName }),
    stateRef.get(),
  ]);
  const lastActionedCost = stateSnap.exists ? stateSnap.data().lastActionedCost : null;

  if (
    !shouldDisableBilling({
      costAmount,
      budgetAmount,
      billingEnabled: billingInfo.billingEnabled,
      lastActionedCost,
    })
  ) {
    console.log(
      `No action. cost=${costAmount} budget=${budgetAmount} billingEnabled=${billingInfo.billingEnabled} lastActionedCost=${lastActionedCost}`
    );
    return;
  }

  console.log(
    `Cost ${costAmount} exceeded budget ${budgetAmount} — disabling billing for ${projectName}.`
  );
  await billing.updateProjectBillingInfo({
    name: projectName,
    projectBillingInfo: { billingAccountName: "" },
  });
  await stateRef.set({ lastActionedCost: costAmount, lastActionedAt: new Date() });
  console.log("Billing disabled.");
});
