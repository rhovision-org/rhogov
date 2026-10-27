// Voter rolls follow group membership (#6): a member who joins before anyone votes is
// added when the opener next looks at the vote; after the first ballot it takes a press.
import { expect, test } from "@playwright/test";
import { onboard, open, person, settle, startCommunity } from "./helpers";

test("the roll follows the group until the first ballot", async ({ browser }) => {
  const alice = await person(browser, "Alice");
  await onboard(alice, "Alice");
  const invite = await startCommunity(alice, "Roll Call");
  await settle(alice);

  await open(alice, "#/groups");
  await alice.getByRole("button", { name: "＋ New group" }).click();
  await alice.getByPlaceholder("e.g. Budget committee").fill("Choir");
  await alice.getByRole("button", { name: "Create group" }).click();
  await settle(alice);
  const groupHash = await alice.evaluate(() => location.hash);

  await alice.getByRole("button", { name: "＋ New vote" }).click();
  await expect(alice.getByText("anyone who joins before the first ballot")).toBeVisible();
  await alice.getByPlaceholder("e.g. Which venue for the spring meetup?").fill("Which carol first?");
  await alice.getByPlaceholder("Option 1").fill("Silent Night");
  await alice.getByPlaceholder("Option 2").fill("Jingle Bells");
  await alice.getByRole("button", { name: "Open vote" }).click();
  await settle(alice);
  const issueHash = await alice.evaluate(() => location.hash);

  // Bob joins after the vote opened, before anyone voted.
  const bob = await person(browser, "Bob");
  await onboard(bob, "Bob", invite);
  await settle(bob);
  await open(bob, groupHash);
  await bob.getByRole("button", { name: "Join group" }).click();
  await settle(bob);
  await open(bob, issueHash);
  await expect(bob.getByText("Nobody has voted yet, so you'll be added")).toBeVisible();

  // Help tells Alice; opening the vote adds Bob without a press.
  await open(alice, "#/");
  await alice.getByRole("link", { name: "Help for you" }).click();
  await expect(alice.getByText(/1 person joined Choir after you opened/)).toBeVisible({ timeout: 60_000 });
  await open(alice, issueHash);
  await expect(alice.getByText("Adding Bob to the vote")).toBeVisible({ timeout: 60_000 });
  await settle(alice);
  await open(alice, issueHash);
  await expect(alice.getByText("0 of 2 voted")).toBeVisible();

  await open(bob, issueHash);
  await bob.locator("label.choice", { hasText: "Jingle Bells" }).click();
  await bob.getByRole("button", { name: "Vote", exact: true }).click();
  await settle(bob);

  // Carol joins after the first ballot: now it waits for Alice's press.
  const carol = await person(browser, "Carol");
  await onboard(carol, "Carol", invite);
  await settle(carol);
  await open(carol, groupHash);
  await carol.getByRole("button", { name: "Join group" }).click();
  await settle(carol);
  await open(carol, issueHash);
  await expect(carol.getByText("so it isn't open to you yet")).toBeVisible();

  await open(alice, issueHash);
  const add = alice.getByRole("button", { name: "Add 1 new member to the vote" });
  await expect(add).toBeVisible();
  await expect(alice.getByText("1 of 2 voted")).toBeVisible();
  alice.once("dialog", (d) => d.accept());
  await add.click();
  await settle(alice);
  await open(alice, issueHash);
  await expect(alice.getByText("1 of 3 voted")).toBeVisible();
});
