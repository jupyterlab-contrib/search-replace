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

  await page.waitForSelector('.jp-search-replace-tab >> .jp-progress', {
    state: 'hidden'
  })

  expect(
    await page.waitForSelector('jp-tree-view[role="tree"] >> text=5')
  ).toBeTruthy();

  await expect(page.locator('jp-tree-item:nth-child(4)')).toHaveText(
    '                "Is that Strange enough?",'
  );

  await page.locator('jp-tree-item:nth-child(4)').click();
  await expect(page).toHaveURL('http://localhost:8888/lab/tree/search-replace-test/conftest.py');
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

test('should test for case sensitive option', async ({ page }) => {
  // Click #tab-key-0 .lm-TabBar-tabIcon svg >> nth=0
  await page.locator('[title="Search and replace"]').click();
  // Fill input[type="search"]
  await page.locator('input[type="search"]').fill('Strange');

  let response_url: string;

  await Promise.all([
    page.waitForResponse(
      response => {
        response_url = response.url();
        return /.*search\/\?query=Strange/.test(response.url()) &&
        response.request().method() === 'GET'
      }
    ),
    page.locator('input[type="search"]').press('Enter'),
    page.locator('[title="button to enable case sensitive mode"]').click()
  ]);

  expect(/case_sensitive=true/.test(response_url)).toEqual(true);

  expect(await page.waitForSelector('jp-tree-view[role="tree"] >> text=1')).toBeTruthy();
});

test('should test for whole word option', async ({ page }) => {
  // Click #tab-key-0 .lm-TabBar-tabIcon svg >> nth=0
  await page.locator('[title="Search and replace"]').click();
  // Fill input[type="search"]
  await page.locator('input[type="search"]').fill('strange');

  let response_url: string;

  await Promise.all([
    page.waitForResponse(
      response => {
        response_url = response.url();
        return /.*search\/\?query=strange/.test(response.url()) &&
        response.request().method() === 'GET'
      }
    ),
    page.locator('input[type="search"]').press('Enter'),
    page.locator('[title="button to enable whole word mode"]').click()
  ]);

  expect(/whole_word=true/.test(response_url)).toEqual(true);

  expect(await page.waitForSelector('jp-tree-view[role="tree"] >> text=4')).toBeTruthy();
});

test('should test for use regex option', async ({ page }) => {
  // Click #tab-key-0 .lm-TabBar-tabIcon svg >> nth=0
  await page.locator('[title="Search and replace"]').click();
  // Fill input[type="search"]
  await page.locator('input[type="search"]').fill('str.*');

  let response_url: string;

  await Promise.all([
    page.waitForResponse(
      response => {
        response_url = response.url();
        return /.*search\/\?query=str.\*/.test(response.url()) &&
        response.request().method() === 'GET'
      }
    ),
    page.locator('input[type="search"]').press('Enter'),
    page.locator('[title="button to enable use regex mode"]').click()
  ]);

  expect(/use_regex=true/.test(response_url)).toEqual(true);

  expect(await page.waitForSelector('jp-tree-view[role="tree"] >> text=5')).toBeTruthy();
});


test('should make a new request on refresh', async ({ page }) => {
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

  await Promise.all([
    page.waitForResponse(
      response =>
        /.*search\/\?query=strange/.test(response.url()) &&
        response.request().method() === 'GET'
    ),
    page.locator('[title="button to refresh and reload results"]').click()
  ]);
});
