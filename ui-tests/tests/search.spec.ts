import { test, galata } from '@jupyterlab/galata';
import { expect } from '@playwright/test';
import * as path from 'path';

const fileName = 'conftest.py';
test.use({ tmpPath: 'search-replace-test' });

test.beforeAll(async ({ baseURL, tmpPath }) => {
  const contents = galata.newContentsHelper(baseURL);
  await contents.uploadFile(
    path.resolve(
      __dirname,
      `../../jupyterlab_search_replace/tests/${fileName}`
    ),
    `${tmpPath}/${fileName}`
  );
});

test.afterAll(async ({ baseURL, tmpPath }) => {
  const contents = galata.newContentsHelper(baseURL);
  await contents.deleteDirectory(tmpPath);
});

test('should get 5 matches', async ({ page }) => {
  // Click #tab-key-0 .lm-TabBar-tabIcon svg >> nth=0
  await page.locator('[title="Search and replace"]').click();
  // Fill input[type="search"]
  await page.locator('input[type="search"]').fill('strange');

  await Promise.all([
    page.waitForResponse(
      response =>
        /.*search\/\?query=strange/.test(response.url()) &&
        response.request().method() === 'GET'
    ),
    page.locator('input[type="search"]').press('Enter')
  ]);

  expect(
    await page.waitForSelector('jp-tree-view[role="tree"] >> text=5')
  ).toBeTruthy();

  await expect(page.locator('jp-tree-item:nth-child(4)')).toHaveText(
    '                "Unicode strange sub file, very strange",'
  );
});

test('should get no matches', async ({ page }) => {
  // Click #tab-key-0 .lm-TabBar-tabIcon svg >> nth=0
  await page.locator('[title="Search and replace"]').click();
  // Fill input[type="search"]
  await page.locator('input[type="search"]').fill('dhit');

  await Promise.all([
    page.waitForResponse(
      response =>
        /.*search\/\?query=dhit/.test(response.url()) &&
        response.request().method() === 'GET'
    ),
    page.locator('input[type="search"]').press('Enter')
  ]);

  expect(
    await page.waitForSelector('#jp-search-replace >> text="No Matches Found"')
  ).toBeTruthy();
});
