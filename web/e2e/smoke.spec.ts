import { expect, test } from "@playwright/test";
import deployments from "../src/config/deployments.json" with { type: "json" };

test("landing page tells the story", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Savings circles nobody can");
  await expect(page.getByRole("link", { name: /Try it live/ }).first()).toBeVisible();
  await expect(page.getByText("RM1.7M", { exact: true })).toBeVisible();
  // No horizontal scroll on any viewport.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("demo page shows the five steps", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Try Giliran live" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Demo steps" }).getByRole("listitem")).toHaveCount(5);
  await expect(page.getByRole("button", { name: /Sign in to start/ })).toBeVisible();
});

test("checker shows red ribbons for the fake circle", async ({ page }) => {
  await page.goto(`/check?address=${deployments.FakeCircleDemo}`);
  await expect(page.getByText(/Don't send money\. \d+ red flags?\./)).toBeVisible();
  await expect(page.getByText("7 of 10 listed members have no deposit")).toBeVisible();
  await expect(page.getByText("Takes a 5% fee from members.")).toBeVisible();
  await expect(page.getByText(/Promises a 20% return/)).toBeVisible();
});

test("passport page reads the registry", async ({ page }) => {
  await page.goto(`/passport/${deployments.deployer}`);
  await expect(page.getByRole("heading", { name: "Savings Passport", level: 1 })).toBeVisible();
  await expect(page.getByText("For lenders: verify it yourself")).toBeVisible();
  await expect(page.locator("article[aria-label*='Savings Passport']")).toBeVisible();
});
