import { test, galata } from '@jupyterlab/galata';
import { expect } from '@playwright/test';
import * as path from 'path';

const fileName = 'conftest.py';
const fileNameHandler = 'test_handlers.py';
test.use({ tmpPath: 'search-replace-file-filter-test' });

test.beforeAll(async ({ baseURL, tmpPath }) => {
  const contents = galata.newContentsHelper(baseURL);
  await contents.uploadFile(
    path.resolve(
      __dirname,
      `../../jupyterlab_search_replace/tests/${fileName}`
    ),
    `${tmpPath}/${fileName}`
  );
  await contents.uploadFile(
    path.resolve(
      __dirname,
      `../../jupyterlab_search_replace/tests/${fileNameHandler}`
    ),
    `${tmpPath}/${fileNameHandler}`
  );
});

test.afterAll(async ({ baseURL, tmpPath }) => {
  const contents = galata.newContentsHelper(baseURL);
  await contents.deleteDirectory(tmpPath);
});

test('should test for include filter', async ({ page }) => {
  // Click #tab-key-0 .lm-TabBar-tabIcon svg >> nth=0
  await page.locator('[title="Search and Replace"]').click();
  // Fill input[type="search"]
  await page.locator('input[type="search"]').fill('strange');

  await Promise.all([
    page.waitForResponse(
      response =>
        /.*search\/[\w-]+\?query=strange/.test(response.url()) &&
        response.request().method() === 'GET'
    ),
    page.locator('input[type="search"]').press('Enter'),
    page.waitForSelector('.jp-search-replace-tab >> .jp-progress', {
      state: 'hidden'
    })
  ]);

  await expect(page.locator('.jp-search-replace-statistics')).toHaveText(
    '60 results in 2 files'
  );

  await page
    .locator('#jp-search-replace >> .jp-search-replace-filters-collapser')
    .click();

  await Promise.all([
    page.waitForResponse(
      response =>
        /.*search\/[\w-]+\?query=strange/.test(response.url()) &&
        response.request().method() === 'GET'
    ),
    await page
      .locator('text=File filters >> [placeholder="e.g. *.py, src/**/include"]')
      .fill('conftest.py')
  ]);

  await expect(page.locator('.jp-search-replace-statistics')).toHaveText(
    '5 result(s) in 1 file'
  );
  expect(await page.locator('.search-tree-files').count()).toEqual(1);
  expect(
    await page.waitForSelector('jp-tree-view[role="tree"] >> text=conftest.py')
  ).toBeTruthy();
});

test('should test for exclude filter', async ({ page }) => {
  // Click #tab-key-0 .lm-TabBar-tabIcon svg >> nth=0
  await page.locator('[title="Search and Replace"]').click();
  // Fill input[type="search"]
  await page.locator('input[type="search"]').fill('strange');

  await Promise.all([
    page.waitForResponse(
      response =>
        /.*search\/[\w-]+\?query=strange/.test(response.url()) &&
        response.request().method() === 'GET'
    ),
    page.locator('input[type="search"]').press('Enter'),
    page.waitForSelector('.jp-search-replace-tab >> .jp-progress', {
      state: 'hidden'
    })
  ]);

  await page
    .locator('#jp-search-replace >> .jp-search-replace-filters-collapser')
    .click();

  await page.locator('[title="Toggle File Filter Mode"]').click();

  await Promise.all([
    page.waitForResponse(
      response =>
        /.*search\/[\w-]+\?query=strange/.test(response.url()) &&
        response.request().method() === 'GET'
    ),
    await page
      .locator('text=File filters >> [placeholder="e.g. *.py, src/**/include"]')
      .fill('conftest.py')
  ]);

  await expect(page.locator('.jp-search-replace-statistics')).toHaveText(
    '55 result(s) in 1 file'
  );
  expect(await page.locator('.search-tree-files').count()).toEqual(1);
  expect(
    await page.waitForSelector(
      'jp-tree-view[role="tree"] >> text=test_handlers.py'
    )
  ).toBeTruthy();
});
