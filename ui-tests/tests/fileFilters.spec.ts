import { test, galata } from '@jupyterlab/galata';
import { expect } from '@playwright/test';
import * as path from 'path';

const fileName = 'conftest.py';
const fileNameHandler = 'test_handlers.py';

test.beforeEach(async ({ page, tmpPath }) => {
  await page.contents.uploadFile(
    path.resolve(__dirname, `./data/${fileName}`),
    `${tmpPath}/${fileName}`
  );
  await page.contents.uploadFile(
    path.resolve(__dirname, `./data/${fileNameHandler}`),
    `${tmpPath}/${fileNameHandler}`
  );
});

test('should test for include filter', async ({ page }) => {
  // Click #tab-key-0 .lm-TabBar-tabIcon svg >> nth=0
  await page.getByRole('tab', { name: 'Search and Replace' }).click();
  // Fill input[placeholder="Search"]
  await page
    .getByRole('textbox', { name: 'Search Files for Text' })
    .fill('strange');

  await Promise.all([
    page.waitForResponse(
      response =>
        /.*search\/[\w-]+\?query=strange/.test(response.url()) &&
        response.request().method() === 'GET'
    ),
    page.getByRole('textbox', { name: 'Search Files for Text' }).press('Enter'),
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
    await page.locator('text=Include file filters >> input').fill('conftest.py')
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
  await page.getByRole('tab', { name: 'Search and Replace' }).click();
  // Fill input[placeholder="Search"]
  await page
    .getByRole('textbox', { name: 'Search Files for Text' })
    .fill('strange');

  await Promise.all([
    page.waitForResponse(
      response =>
        /.*search\/[\w-]+\?query=strange/.test(response.url()) &&
        response.request().method() === 'GET'
    ),
    page.getByRole('textbox', { name: 'Search Files for Text' }).press('Enter'),
    page.waitForSelector('.jp-search-replace-tab >> .jp-progress', {
      state: 'hidden'
    })
  ]);

  await page
    .locator('#jp-search-replace >> .jp-search-replace-filters-collapser')
    .click();

  await Promise.all([
    page.waitForResponse(
      response =>
        /.*search\/[\w-]+\?query=strange/.test(response.url()) &&
        response.request().method() === 'GET'
    ),
    await page.locator('text=Exclude file filters >> input').fill('conftest.py')
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
