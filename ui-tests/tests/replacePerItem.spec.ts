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

test('should replace results for a particular file only', async ({ page }) => {
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

  expect(
    await page.waitForSelector('jp-tree-view[role="tree"] >> text=5')
  ).toBeTruthy();

  await page.waitForSelector(
    '.search-tree-files:has-text("conftest.py") >> .search-tree-matches:has-text(\'                "Is that Strange enough?",\')'
  );

  await page
    .locator('#jp-search-replace >> text=Replace >> [placeholder="Replace"]')
    .click();
  await page
    .locator('#jp-search-replace >> text=Replace >> [placeholder="Replace"]')
    .fill('hello');

  // press replace all matches for `conftest.py` only
  await page
    .locator(
      '.search-tree-files:has-text("conftest.py") >> [title="button to replace a results from a particular file"]'
    )
    .click();

  // new results for previous query 'strange' should only have `test_handlers.py`
  await page.waitForTimeout(800);
  expect(await page.locator('.search-tree-files').count()).toEqual(1);
  expect(
    await page.waitForSelector(
      'jp-tree-view[role="tree"] >> text=test_handlers.py'
    )
  ).toBeTruthy();

  // new search with `hello`
  await page.locator('input[type="search"]').fill('hello');
  await Promise.all([
    page.waitForResponse(
      response =>
        /.*search\/[\w-]+\?query=hello/.test(response.url()) &&
        response.request().method() === 'GET'
    ),
    page.locator('input[type="search"]').press('Enter'),
    page.waitForSelector('.jp-search-replace-tab >> .jp-progress', {
      state: 'hidden'
    })
  ]);

  // verify if `conftest.py` has changed
  expect(
    await page.waitForSelector('jp-tree-view[role="tree"] >> text=5')
  ).toBeTruthy();

  await page.waitForSelector(
    '.search-tree-files:has-text("conftest.py") >> .search-tree-matches:has-text(\'                "Is that hello enough?",\')'
  );
});

test('should replace results for a particular match only', async ({ page }) => {
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

  expect(
    await page.waitForSelector('jp-tree-view[role="tree"] >> text=55')
  ).toBeTruthy();

  const itemMatch = page.locator(
    '.search-tree-files:has-text("test_handlers.py") >> .search-tree-matches'
  );
  await itemMatch.first().waitFor();

  await page
    .locator('#jp-search-replace >> text=Replace >> [placeholder="Replace"]')
    .click();
  await page
    .locator('#jp-search-replace >> text=Replace >> [placeholder="Replace"]')
    .fill('helloqs');

  // press replace match for a particular match in `test_handlers.py` only
  await itemMatch
    .nth(1)
    .locator('[title="button to replace a particular match"]')
    .click();

  // new results for previous query 'strange' should have one less result in `test_handlers.py`
  await page.waitForTimeout(800);
  expect(
    await page.waitForSelector('jp-tree-view[role="tree"] >> text=54')
  ).toBeTruthy();

  // new search with `helloqs`
  await page.locator('input[type="search"]').fill('helloqs');
  await Promise.all([
    page.waitForResponse(
      response =>
        /.*search\/[\w-]+\?query=helloqs/.test(response.url()) &&
        response.request().method() === 'GET'
    ),
    page.locator('input[type="search"]').press('Enter'),
    page.waitForSelector('.jp-search-replace-tab >> .jp-progress', {
      state: 'hidden'
    })
  ]);

  // verify if `test_handlers.py` has changed
  expect(
    await page.waitForSelector('jp-tree-view[role="tree"] >> text=1')
  ).toBeTruthy();

  await expect(itemMatch.first()).toHaveText(
    '                    "line": "Unicode helloqs sub file, very strange\\n",'
  );
});
