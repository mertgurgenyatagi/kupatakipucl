const { cloudEvent } = require("@google-cloud/functions-framework");
const { CloudBillingClient } = require("@google-cloud/billing");
const billing = new CloudBillingClient();

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
  const [billingInfo] = await billing.getProjectBillingInfo({ name: projectName });

  if (billingInfo.billingEnabled === false) {
    console.log("Billing is already disabled for this project.");
    return;
  }

  console.log(
    `Cost ${costAmount} exceeded budget ${budgetAmount} — disabling billing for ${projectName}.`
  );
  await billing.updateProjectBillingInfo({
    name: projectName,
    projectBillingInfo: { billingAccountName: "" },
  });
  console.log("Billing disabled.");
});
