import { test } from '@jupyterlab/galata';
import { expect } from '@playwright/test';

test('test', async ({ page }) => {
  // Click #tab-key-0 .lm-TabBar-tabIcon svg >> nth=0
  await page.locator('[title="Search and replace"]').click();
  // Click input[type="search"]
  await page.locator('input[type="search"]').click();
  // Fill input[type="search"]
  await page.locator('input[type="search"]').fill('strange');

  await Promise.all([
    page.waitForResponse(
      response =>
        /.*search\/\?query=strange/.test(
          response.url()
        ) && response.request().method() === 'GET'
    ),
    page.locator('input[type="search"]').press('Enter')
  ]);

  expect(
    await page.waitForSelector(`#jp-search-replace >> text=${JSON.stringify({"matches":[]}, undefined, 4)}`)
  ).toBeTruthy();
});
