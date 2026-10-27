// Reading the inbox without collecting it (#2): the messages show, and stay on chain.
import { expect, test } from "@playwright/test";
import { onboard, open, person, settle, startCommunity } from "./helpers";

test("messages can be read on chain without collecting them", async ({ browser }) => {
  const alice = await person(browser, "Alice");
  await onboard(alice, "Alice");
  const invite = await startCommunity(alice, "Peek Co-op");
  await settle(alice);
  const bob = await person(browser, "Bob");
  await onboard(bob, "Bob", invite);
  await settle(bob);

  await open(bob, "#/inbox");
  await bob.getByRole("button", { name: "✎ New message" }).click();
  await bob.locator(".modal").getByLabel("To").fill("Alice");
  await expect(bob.locator(".modal").getByText("→")).toContainText("Alice");
  await bob.locator(".modal label", { hasText: "Subject" }).locator("input").fill("Agenda");
  await bob.locator(".modal textarea").fill("Item one: the budget.");
  await bob.getByRole("button", { name: "Send" }).click();
  await settle(bob);

  await open(alice, "#/inbox");
  await alice.getByRole("button", { name: "Read, leave on chain" }).click();
  await settle(alice);
  await expect(alice.getByText("Still on chain (1)")).toBeVisible();
  await expect(alice.getByText("Item one: the budget.")).toBeVisible();

  // Still there: a reload counts it again, and Collect takes it.
  await open(alice, "#/inbox");
  await expect(alice.getByText("1 new message")).toBeVisible();
  await alice.getByRole("button", { name: "Collect" }).click();
  await settle(alice);
  await expect(alice.getByText("Item one: the budget.")).toBeVisible();
  await open(alice, "#/inbox");
  await expect(alice.getByText("No new messages on chain.")).toBeVisible();
});
