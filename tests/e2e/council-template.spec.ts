// Loading a council template: a whole structure from one definition, checked
// before signing, created in two deploys; a "later" council created from its
// parent's page when needed; and the structure exported back as a template.
import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { onboard, open, person, settle, startCommunity } from "./helpers";

test("the rholo template creates a network council and its issue councils when needed", async ({ browser }) => {
  const alice = await person(browser, "Alice");
  await onboard(alice, "Alice");
  const invite = await startCommunity(alice, "rholo");
  await settle(alice);

  await open(alice, "#/councils");
  await alice.getByRole("button", { name: "Load a template…" }).click();
  const modal = alice.locator(".modal");
  // A broken definition says what to fix and creates nothing.
  await modal.getByRole("textbox", { name: /Definition/ }).fill(`{"kind": "rhogov-council-definition", "version": 1, "councils": [{"slug": "x", "name": "X", "purpose": "p", "chambers": []}]}`);
  await expect(modal.getByText("list at least two stakeholder groups")).toBeVisible();
  await expect(modal.getByRole("button", { name: /^Create/ })).toBeDisabled();

  await modal.getByRole("button", { name: "Start from the rholo template" }).click();
  await expect(modal.getByText("Creates now")).toBeVisible();
  await expect(modal.getByText("Later, when first needed")).toBeVisible();
  await expect(modal.getByText(/^Treasury, under rholo Network Council/)).toBeVisible();
  await modal.getByRole("button", { name: "Create council" }).click();
  await settle(alice);

  await expect(alice.getByRole("heading", { name: "rholo Network Council" })).toBeVisible();
  const network = await alice.evaluate(() => location.hash);
  await open(alice, network + "/stakeholders");
  for (const g of ["Validators", "Developers", "Users", "Token holders", "Service providers", "Governance stewards", "Regulators (advisory)"])
    await expect(alice.locator(".card", { hasText: g }).first()).toBeVisible();

  // Someone else sees the councils still to come, but only the facilitator can create one.
  const bob = await person(browser, "Bob");
  await onboard(bob, "Bob", invite);
  await settle(bob);
  await open(bob, network);
  const under = bob.locator(".card", { hasText: "Councils under this one" });
  await expect(under).toContainText("Treasury");
  await expect(under.getByRole("button", { name: "Create it now" })).toHaveCount(0);

  await open(alice, network);
  await alice.locator(".card", { hasText: "Councils under this one" }).locator(".row", { hasText: "Treasury" }).getByRole("button", { name: "Create it now" }).click();
  await settle(alice);
  await expect(alice.getByRole("heading", { name: "Treasury" })).toBeVisible();
  await expect(alice.getByText("Part of rholo Network Council.")).toBeVisible();

  await open(alice, network);
  const listed = alice.locator(".card", { hasText: "Councils under this one" });
  await expect(listed.getByRole("link", { name: "Treasury" })).toBeVisible();
  await expect(listed.locator(".row", { hasText: "Treasury" }).getByRole("button")).toHaveCount(0);

  // Export: the tree as it stands, with the councils not yet created still marked later.
  const [download] = await Promise.all([alice.waitForEvent("download"), alice.getByRole("button", { name: "Export as a template" }).click()]);
  const def = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(def.kind).toBe("rhogov-council-definition");
  const treasury = def.councils.find((c: any) => c.slug === "rholo-treasury");
  expect(treasury.parent).toBe("rholo-network");
  expect(treasury.later).toBeUndefined();
  expect(def.councils.find((c: any) => c.slug === "rholo-fees").later).toBe(true);
  expect(def.councils).toHaveLength(7);

  // Loading it again here is refused: those councils already exist.
  await open(alice, "#/councils");
  await alice.getByRole("button", { name: "Load a template…" }).click();
  await alice.locator(".modal").getByRole("textbox", { name: /Definition/ }).fill(JSON.stringify(def));
  await expect(alice.locator(".modal").getByText(/already has a council "council-rholo-network"/)).toBeVisible();
});
