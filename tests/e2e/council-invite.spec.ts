// Inviting someone into a council by picking them from a list (#90): people the
// community knows but the council doesn't are offered; council members are not.
import { expect, test } from "@playwright/test";
import { onboard, open, person, settle, startCommunity } from "./helpers";

test("a facilitator invites a newcomer by picking them from a list", async ({ browser }) => {
  const alice = await person(browser, "Alice");
  await onboard(alice, "Alice");
  const invite = await startCommunity(alice, "Invite Co-op");
  await settle(alice);

  await open(alice, "#/councils");
  await alice.getByRole("button", { name: "＋ New council" }).click();
  await alice.getByPlaceholder("e.g. Protocol upgrade council").fill("Garden council");
  await alice.getByPlaceholder("e.g. Decide which protocol upgrades").fill("Decide what the garden grows.");
  await alice.getByRole("button", { name: "Create council" }).click();
  await settle(alice);
  const council = await alice.evaluate(() => location.hash);

  // Bob joins a stakeholder group; Dave only arrives in the community (his name goes on its list).
  const bob = await person(browser, "Bob"), dave = await person(browser, "Dave");
  await onboard(bob, "Bob", invite);
  await settle(bob);
  await open(bob, council + "/stakeholders");
  await bob.locator(".card", { hasText: "Developers" }).getByText("I belong here").click();
  await bob.getByRole("button", { name: /^Join \d group/ }).click();
  await settle(bob);
  await onboard(dave, "Dave", invite);
  await settle(dave);

  await open(alice, council);
  await alice.getByRole("button", { name: "Invite someone to a stakeholder group" }).click();
  const modal = alice.locator(".modal");
  await expect(modal.getByText("New to Garden council")).toBeVisible({ timeout: 60_000 });
  await expect(modal.locator("label.choice", { hasText: "Dave" })).toBeVisible();
  await expect(modal.locator("label.choice", { hasText: "Bob" })).toHaveCount(0);
  await modal.locator("label.choice", { hasText: "Dave" }).click();
  await modal.getByRole("combobox").selectOption({ label: "Users" });
  await modal.getByRole("button", { name: "Invite", exact: true }).click();
  await settle(alice);

  await open(dave, "#/inbox");
  await dave.getByRole("button", { name: "Collect" }).click();
  await settle(dave);
  await expect(dave.getByText(/invited to join Users/)).toBeVisible({ timeout: 60_000 });
});
