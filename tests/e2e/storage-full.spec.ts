// localStorage is shared by every app at the same site (quantum-os sits beside
// rhogov on rhovision-org.github.io). When it is full, setting up a key used to
// work until the next reload and then be gone. Now it is kept in IndexedDB.
import { expect, test } from "@playwright/test";
import { APP, onboard, startCommunity } from "./helpers";

const ALICE = "1111bn92xHbttqWHEXqD8PiykFxgeUjizzquT6JRePj2pAoHFAuiK";

test("a full localStorage doesn't lose your identity on reload", async ({ page }) => {
  await page.goto(APP);
  await page.evaluate(() => {
    // Fill the site's storage, as another app's rooms might.
    const chunk = "x".repeat(100_000);
    for (let i = 0; ; i++) { try { localStorage.setItem("qos-chat-" + i, chunk); } catch { break; } }
    let s = "";
    for (const step of [10_000, 100, 1]) {
      try { for (;;) { localStorage.setItem("qos-pad", s + "x".repeat(step)); s += "x".repeat(step); } } catch { /* full at this step */ }
    }
  });
  await onboard(page, "Alice");
  await startCommunity(page, "Full storage");
  expect(await page.evaluate(() => localStorage.getItem("rhogov:key"))).toBeNull();

  await page.goto(APP + "#/account");
  await page.reload();
  await expect(page.getByText(ALICE, { exact: true })).toBeVisible();
  await expect(page.locator(".foot")).toContainText("Alice");
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("reloading on the setup page, already set up, lands on Home", async ({ page }) => {
  await onboard(page, "Alice");
  await startCommunity(page, "Reload on setup");
  await page.goto(APP + "#/welcome");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Hello, Alice" })).toBeVisible();
  expect(new URL(page.url()).hash).toBe("#/");
});
