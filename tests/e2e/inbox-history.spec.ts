// The Inbox's history of collected messages (#1, Inbox/4): search by subject and
// sender, and delete an entry for good.
import { expect, test, type Page } from "@playwright/test";
import { onboard, open, person, settle, startCommunity } from "./helpers";

async function send(p: Page, to: string, subject: string, body: string) {
  await open(p, "#/inbox");
  await p.getByRole("button", { name: "✎ New message" }).click();
  await p.locator(".modal").getByLabel("To").fill(to);
  await expect(p.locator(".modal").getByText("→")).toContainText(to);
  await p.locator(".modal label", { hasText: "Subject" }).locator("input").fill(subject);
  await p.locator(".modal textarea").fill(body);
  await p.getByRole("button", { name: "Send" }).click();
  await settle(p);
}

test("collected messages can be searched and deleted on chain", async ({ browser }) => {
  const alice = await person(browser, "Alice");
  await onboard(alice, "Alice");
  const invite = await startCommunity(alice, "History Co-op");
  await settle(alice);
  const bob = await person(browser, "Bob");
  await onboard(bob, "Bob", invite);
  await settle(bob);

  await send(bob, "Alice", "Agenda", "Item one: the budget.");
  await send(bob, "Alice", "Minutes", "We agreed on the budget.");

  await open(alice, "#/inbox");
  await expect(alice.getByText("2 new messages")).toBeVisible();
  await alice.getByRole("button", { name: "Collect" }).click();
  await settle(alice);

  await open(alice, "#/inbox");
  await alice.getByRole("button", { name: "Search history" }).click();
  const history = alice.locator(".card.soft", { hasText: "Message history" });

  // By subject: only the minutes.
  await history.locator("label", { hasText: "Subject contains" }).locator("input").fill("Minutes");
  await history.getByRole("button", { name: "Search", exact: true }).click();
  await settle(alice);
  await expect(history.getByText("We agreed on the budget.")).toBeVisible();
  await expect(history.getByText("Item one: the budget.")).toHaveCount(0);

  // By sender, no subject: both, newest first.
  await history.locator("label", { hasText: "Subject contains" }).locator("input").fill("");
  await history.getByLabel("From").fill("Bob");
  await expect(history.getByText("→")).toContainText("Bob");
  await history.getByRole("button", { name: "Search", exact: true }).click();
  await settle(alice);
  await expect(history.locator(".card h3")).toHaveText(["Minutes", "Agenda"]);

  // Delete the agenda for good: a fresh search no longer finds it.
  alice.once("dialog", (d) => d.accept());
  await history.locator(".card", { hasText: "Agenda" }).getByRole("button", { name: "Delete from history" }).click();
  await settle(alice);
  await expect(history.locator(".card h3")).toHaveText(["Minutes"]);
  await history.getByRole("button", { name: "Search", exact: true }).click();
  await settle(alice);
  await expect(history.locator(".card h3")).toHaveText(["Minutes"]);
});
