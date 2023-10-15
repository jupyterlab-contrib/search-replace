import { test } from '@jupyterlab/galata';
import { expect } from '@playwright/test';
import * as path from 'path';

const fileName = 'conftest.py';
const fileNameHandler = 'test_handlers.py';

test.beforeEach(async ({ page, tmpPath }) => {
  await page.contents.uploadFile(
    path.resolve(__dirname, `./data/${fileName}`),
    `${tmpPath}/aaa/${fileName}`
  );
  await page.contents.uploadFile(
    path.resolve(__dirname, `./data/${fileNameHandler}`),
    `${tmpPath}/aaa/bbb/${fileNameHandler}`
  );
});

test('should switch directory and update results', async ({
  page,
  tmpPath
}) => {
  // Click #tab-key-0 .lm-TabBar-tabIcon svg >> nth=0
  await page.getByRole('tab', { name: 'Search and Replace' }).click();
  // Fill input[placeholder="Search"]
  await page
    .getByRole('textbox', { name: 'Search Files for Text' })
    .fill('strange');

  await page.pause();
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
  await page.getByRole('tab', { name: 'File Browser (Ctrl+Shift+F)' }).click();
  await page
    .locator('[aria-label="File\\ Browser\\ Section"] >> text=aaa')
    .dblclick();
  await expect(page).toHaveURL(`http://localhost:8888/lab/tree/${tmpPath}/aaa`);
  await page
    .locator('[aria-label="File\\ Browser\\ Section"] >> text=bbb')
    .dblclick();
  await expect(page).toHaveURL(
    `http://localhost:8888/lab/tree/${tmpPath}/aaa/bbb`
  );
  await page.getByRole('tab', { name: 'Search and Replace' }).click();
  await page.waitForSelector('.jp-search-replace-tab >> .jp-progress', {
    state: 'hidden'
  });

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

test('should not update file browser on clicking of breadcrumb', async ({
  page,
  tmpPath
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

  await expect(page.locator('.jp-search-replace-statistics')).toHaveText(
    '60 results in 2 files'
  );
  // Click on File Browser Tab
  await page.getByRole('tab', { name: 'File Browser (Ctrl+Shift+F)' }).click();
  await page
    .locator('[aria-label="File\\ Browser\\ Section"] >> text=aaa')
    .dblclick();
  await expect(page).toHaveURL(`http://localhost:8888/lab/tree/${tmpPath}/aaa`);
  await page
    .locator('[aria-label="File\\ Browser\\ Section"] >> text=bbb')
    .dblclick();
  await expect(page).toHaveURL(
    `http://localhost:8888/lab/tree/${tmpPath}/aaa/bbb`
  );
  await page.getByRole('tab', { name: 'Search and Replace' }).click();
  await page.waitForSelector('.jp-search-replace-tab >> .jp-progress', {
    state: 'hidden'
  });

  await page
    .locator('jp-breadcrumb[role="navigation"] >> text=aaa >> button')
    .click();
  await expect(page.locator('.jp-search-replace-statistics')).toHaveText(
    '60 results in 2 files'
  );
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
  await page.getByRole('tab', { name: 'File Browser (Ctrl+Shift+F)' }).click();
  expect(
    await page.waitForSelector(
      '[aria-label="File\\ Browser\\ Section"] >> text=bbb'
    )
  ).toBeTruthy();
});
