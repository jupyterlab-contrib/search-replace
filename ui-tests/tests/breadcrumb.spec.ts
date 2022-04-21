import { test, galata } from '@jupyterlab/galata';
import { expect } from '@playwright/test';
import * as path from 'path';

const fileName = 'conftest.py';
const fileNameHandler = 'test_handlers.py';
test.use({ tmpPath: 'search-replace-breadcrumb-test' });

test.beforeAll(async ({ baseURL, tmpPath }) => {
  const contents = galata.newContentsHelper(baseURL);
  await contents.uploadFile(
    path.resolve(
      __dirname,
      `../../jupyterlab_search_replace/tests/${fileName}`
    ),
    `${tmpPath}/aaa/${fileName}`
  );
  await contents.uploadFile(
    path.resolve(
      __dirname,
      `../../jupyterlab_search_replace/tests/${fileNameHandler}`
    ),
    `${tmpPath}/aaa/bbb/${fileNameHandler}`
  );
});

test.afterAll(async ({ baseURL, tmpPath }) => {
  const contents = galata.newContentsHelper(baseURL);
  await contents.deleteDirectory(tmpPath);
});

test('should switch directory and update results', async ({
  page,
  tmpPath
}) => {
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

  await page.waitForTimeout(100);
  expect(await page.locator('.search-tree-files').count()).toEqual(2);
  expect(
    await page.waitForSelector(
      'jp-tree-view[role="tree"] >> text=aaa/bbb/test_handlers.py'
    )
  ).toBeTruthy();
  expect(
    await page.waitForSelector(
      'jp-tree-view[role="tree"] >> text=aaa/conftest.py'
    )
  ).toBeTruthy();

  // Click on File Browser Tab
  await page.locator('#tab-key-0').first().click();
  await page.locator('span:has-text("aaa")').first().dblclick();
  await expect(page).toHaveURL(`http://localhost:8888/lab/tree/${tmpPath}/aaa`);
  await page
    .locator('[aria-label="File\\ Browser\\ Section"] >> text=bbb')
    .dblclick();
  await expect(page).toHaveURL(
    `http://localhost:8888/lab/tree/${tmpPath}/aaa/bbb`
  );
  await page.locator('[title="Search and Replace"]').click();
  await page.waitForSelector('.jp-search-replace-tab >> .jp-progress', {
    state: 'hidden'
  });

  await page.waitForTimeout(800);
  expect(await page.locator('.search-tree-files').count()).toEqual(1);
  expect(
    await page.waitForSelector(
      'jp-tree-view[role="tree"] >> text=test_handlers.py'
    )
  ).toBeTruthy();
});

test('should not update file browser on clicking of breadcrumb', async ({
  page,
  tmpPath
}) => {
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

  await page.waitForTimeout(100);
  // Click on File Browser Tab
  await page.locator('#tab-key-0').first().click();
  await page.locator('span:has-text("aaa")').first().dblclick();
  await expect(page).toHaveURL(`http://localhost:8888/lab/tree/${tmpPath}/aaa`);
  await page
    .locator('[aria-label="File\\ Browser\\ Section"] >> text=bbb')
    .dblclick();
  await expect(page).toHaveURL(
    `http://localhost:8888/lab/tree/${tmpPath}/aaa/bbb`
  );
  await page.locator('[title="Search and Replace"]').click();
  await page.waitForSelector('.jp-search-replace-tab >> .jp-progress', {
    state: 'hidden'
  });

  await page
    .locator('jp-breadcrumb[role="navigation"] >> text=aaa >> button')
    .click();
  await page.waitForTimeout(800);
  expect(await page.locator('.search-tree-files').count()).toEqual(2);
  expect(
    await page.waitForSelector(
      'jp-tree-view[role="tree"] >> text=bbb/test_handlers.py'
    )
  ).toBeTruthy();
  expect(
    await page.waitForSelector('jp-tree-view[role="tree"] >> text=conftest.py')
  ).toBeTruthy();

  // Click on File Browser Tab
  await page.locator('#tab-key-0').first().click();
  expect(
    await page.waitForSelector(
      '[aria-label="File\\ Browser\\ Section"] >> text=bbb'
    )
  ).toBeTruthy();
});
