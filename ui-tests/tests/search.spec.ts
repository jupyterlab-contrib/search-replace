import { test } from '@jupyterlab/galata';
import { expect } from '@playwright/test';
import * as path from 'path';

const fileName = 'conftest.py';

test.beforeEach(async ({ page, tmpPath }) => {
  await page.contents.uploadFile(
    path.resolve(__dirname, `./data/${fileName}`),
    `${tmpPath}/${fileName}`
  );
});

test('should get 5 matches', async ({ page, tmpPath }) => {
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
    page.getByRole('textbox', { name: 'Search Files for Text' }).press('Enter')
  ]);

  await page.waitForSelector('.jp-search-replace-tab >> .jp-progress', {
    state: 'hidden'
  });

  await expect(page.locator('.jp-search-replace-statistics')).toHaveText(
    '5 result(s) in 1 file'
  );

  expect(
    await page.waitForSelector('jp-tree-view[role="tree"] >> text=5')
  ).toBeTruthy();

  await expect(page.locator('jp-tree-item').nth(5)).toHaveText(
    '                "Is that λ strange enough?",    '
  );

  await page.locator('jp-tree-item').nth(5).click();
  await expect(page).toHaveURL(
    `http://localhost:8888/lab/tree/${tmpPath}/conftest.py`
  );

  // Check the match is selected in the editor
  await page.getByLabel('conftest.py').getByRole('textbox').waitFor();
  const selection = await page.waitForFunction(
    () => `${window.getSelection()}`
  );
  expect(await selection.jsonValue()).toEqual('strange');
});

test('should get no matches', async ({ page }) => {
  // Click #tab-key-0 .lm-TabBar-tabIcon svg >> nth=0
  await page.getByRole('tab', { name: 'Search and Replace' }).click();
  // Fill input[placeholder="Search"]
  await page
    .getByRole('textbox', { name: 'Search Files for Text' })
    .fill('dhit');

  await Promise.all([
    page.waitForResponse(
      response =>
        /.*search\/[\w-]+\?query=dhit/.test(response.url()) &&
        response.request().method() === 'GET'
    ),
    page.getByRole('textbox', { name: 'Search Files for Text' }).press('Enter')
  ]);

  await expect(page.locator('.jp-search-replace-statistics')).toHaveText(
    'No results found.'
  );
  expect(
    await page.waitForSelector('#jp-search-replace >> text="No results found."')
  ).toBeTruthy();
});

test('should test for case sensitive option', async ({ page }) => {
  // Click #tab-key-0 .lm-TabBar-tabIcon svg >> nth=0
  await page.getByRole('tab', { name: 'Search and Replace' }).click();
  // Fill input[placeholder="Search"]
  await page
    .getByRole('textbox', { name: 'Search Files for Text' })
    .fill('Strange');

  let response_url: string;

  await Promise.all([
    page.waitForResponse(response => {
      response_url = response.url();
      return (
        /.*search\/[\w-]+\?query=Strange/.test(response.url()) &&
        response.request().method() === 'GET'
      );
    }),
    page.getByRole('textbox', { name: 'Search Files for Text' }).press('Enter'),
    page.locator('[title="Match Case"]').click()
  ]);

  expect(/case_sensitive=true/.test(response_url)).toEqual(true);

  expect(
    await page.waitForSelector('jp-tree-view[role="tree"] >> text=1')
  ).toBeTruthy();
});

test('should test for whole word option', async ({ page }) => {
  // Click #tab-key-0 .lm-TabBar-tabIcon svg >> nth=0
  await page.getByRole('tab', { name: 'Search and Replace' }).click();
  // Fill input[placeholder="Search"]
  await page
    .getByRole('textbox', { name: 'Search Files for Text' })
    .fill('strange');

  let response_url: string;

  await Promise.all([
    page.waitForResponse(response => {
      response_url = response.url();
      return (
        /.*search\/[\w-]+\?query=strange/.test(response.url()) &&
        response.request().method() === 'GET'
      );
    }),
    page.getByRole('textbox', { name: 'Search Files for Text' }).press('Enter'),
    page.locator('[title="Match Whole Word"]').click()
  ]);

  expect(/whole_word=true/.test(response_url)).toEqual(true);

  expect(
    await page.waitForSelector('jp-tree-view[role="tree"] >> text=4')
  ).toBeTruthy();
});

test('should test for use regex option', async ({ page }) => {
  // Click #tab-key-0 .lm-TabBar-tabIcon svg >> nth=0
  await page.getByRole('tab', { name: 'Search and Replace' }).click();
  // Fill input[placeholder="Search"]
  await page
    .getByRole('textbox', { name: 'Search Files for Text' })
    .fill('str.*');

  let response_url: string;

  await Promise.all([
    page.waitForResponse(response => {
      response_url = response.url();
      return (
        /.*search\/[\w-]+\?query=str.\*/.test(response.url()) &&
        response.request().method() === 'GET'
      );
    }),
    page.getByRole('textbox', { name: 'Search Files for Text' }).press('Enter'),
    page.locator('[title="Use Regular Expression"]').click()
  ]);

  expect(/use_regex=true/.test(response_url)).toEqual(true);

  expect(
    await page.waitForSelector('jp-tree-view[role="tree"] >> text=5')
  ).toBeTruthy();
});

test('should make a new request on refresh', async ({ page }) => {
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
    page.getByRole('textbox', { name: 'Search Files for Text' }).press('Enter')
  ]);

  await Promise.all([
    page.waitForResponse(
      response =>
        /.*search\/[\w-]+\?query=strange/.test(response.url()) &&
        response.request().method() === 'GET'
    ),
    page.locator('[title="Refresh"]').click()
  ]);
});

test('should expand and collapse tree view on clicking expand-collapse button', async ({
  page
}) => {
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

  // added timeouts allowing DOM to update
  await page.waitForTimeout(60);
  await page.locator('#jp-search-replace >> [title="Collapse All"]').click();
  await page.waitForTimeout(60);
  expect(
    await page.locator('.search-tree-files').getAttribute('aria-expanded')
  ).toEqual('false');

  await page.locator('[title="Expand All"]').click();
  await page.waitForTimeout(60);
  expect(
    await page.locator('.search-tree-files').getAttribute('aria-expanded')
  ).toEqual('true');
});

test('should replace results on replace-all button', async ({ page }) => {
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

  expect(
    await page.waitForSelector('jp-tree-view[role="tree"] >> text=5')
  ).toBeTruthy();

  await expect(page.locator('jp-tree-item').nth(2)).toHaveText(
    '                "Is that Strange enough?",'
  );

  await page.locator('#jp-search-replace >> [title="Toggle Replace"]').click();
  await page
    .locator('#jp-search-replace >> jp-text-field[placeholder="Replace"]')
    .click();
  await page
    .locator('#jp-search-replace >> input[placeholder="Replace"]')
    .fill('hello');
  await page.locator('[title="Replace All"]').click();

  await page
    .getByRole('textbox', { name: 'Search Files for Text' })
    .fill('hello');
  await Promise.all([
    page.waitForResponse(
      response =>
        /.*search\/[\w-]+\?query=hello/.test(response.url()) &&
        response.request().method() === 'GET'
    ),
    page.getByRole('textbox', { name: 'Search Files for Text' }).press('Enter'),
    page.waitForSelector('.jp-search-replace-tab >> .jp-progress', {
      state: 'hidden'
    })
  ]);

  expect(
    await page.waitForSelector('jp-tree-view[role="tree"] >> text=5')
  ).toBeTruthy();
  await expect(page.locator('jp-tree-item').nth(2)).toHaveText(
    '                "Is that hellohello enough?",'
  );
});

test('should display a warning if a file is dirty', async ({ page }) => {
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
    page.getByRole('textbox', { name: 'Search Files for Text' }).press('Enter')
  ]);

  await page
    .locator('.jp-search-replace-statistics >> text=5 result(s) in 1 file')
    .waitFor();

  await page.locator('jp-tree-item').nth(2).click();

  await page
    .locator('[role="main"] >> text=Is that λ strange enough?')
    .waitFor();

  await Promise.all([
    page
      .locator('.jp-search-replace-statistics >> text=5 result(s) in 1 file')
      .waitFor(),
    page.keyboard.type('dirty'),
    page.locator('.jp-search-replace-tab >> [title="Refresh"]').click()
  ]);

  await expect(page.locator('.jp-search-replace-warning > p')).toHaveText(
    'You have unsaved changes. The result(s) may be inexact. Save your work and refresh.'
  );
});
