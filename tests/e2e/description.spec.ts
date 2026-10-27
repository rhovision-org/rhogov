// A vote's description (#94, #84): written in the Markdown subset, stored with the
// vote, shown on its page with working links and nothing that runs.
import { expect, test } from "@playwright/test";
import { onboard, open, person, settle, startCommunity } from "./helpers";

test("a vote carries a description with links", async ({ browser }) => {
  const alice = await person(browser, "Alice");
  await onboard(alice, "Alice");
  await startCommunity(alice, "Described Co-op");
  await settle(alice);
  await open(alice, "#/groups");
  await alice.getByRole("button", { name: "＋ New group" }).click();
  await alice.getByPlaceholder("e.g. Budget committee").fill("Designers");
  await alice.getByRole("button", { name: "Create group" }).click();
  await settle(alice);

  await alice.getByRole("button", { name: "＋ New vote" }).click();
  await alice.getByPlaceholder("e.g. Which venue for the spring meetup?").fill("Which logo?");
  await alice.getByLabel(/^Description/).fill("We need a **new logo**.\n\n- [Draft A](https://example.org/a.png)\n- [bad](javascript:alert(1))");
  await alice.getByText("Preview").click();
  await expect(alice.locator(".modal .md b", { hasText: "new logo" })).toBeVisible();
  await alice.getByPlaceholder("Option 1").fill("Draft A");
  await alice.getByPlaceholder("Option 2").fill("Draft B");
  await alice.getByRole("button", { name: "Open vote" }).click();
  await settle(alice);
  const issueHash = await alice.evaluate(() => location.hash);

  // The group lists one vote, not the description's own record.
  await open(alice, issueHash);
  const md = alice.locator(".md").first();
  await expect(md.locator("b", { hasText: "new logo" })).toBeVisible();
  await expect(md.getByRole("link", { name: "Draft A" })).toHaveAttribute("href", "https://example.org/a.png");
  await expect(md.getByRole("link", { name: "bad" })).toHaveCount(0);
  await alice.locator(".crumbs a").nth(1).click();
  await expect(alice.getByRole("tab", { name: "Votes (1)" })).toBeVisible();
});
