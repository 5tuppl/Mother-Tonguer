import { expect, test } from "@playwright/test";

test("translates text and saves it to history", async ({ page }) => {
  await page.route("**/api/translate", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        translation: "Сайн байна уу",
        detected_source: "en"
      })
    });
  });

  await page.goto("/");
  await expect(page.getByText("MotherTonguer")).toBeVisible();

  await page.getByRole("tab", { name: /Text/ }).click();
  await page.getByLabel("Input").fill("Hello");
  await page.getByRole("button", { name: /^Translate$/ }).last().click();

  await expect(page.getByText("Сайн байна уу")).toBeVisible();
  await page.getByRole("tab", { name: /History/ }).click();
  await expect(page.getByText("Hello")).toBeVisible();
});
