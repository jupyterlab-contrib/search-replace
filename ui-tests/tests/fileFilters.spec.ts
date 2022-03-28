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
    await page.locator('[title="Search and replace"]').click();
    // Fill input[type="search"]
    await page.locator('input[type="search"]').fill('strange');
  
    await Promise.all([
      page.waitForResponse(
        response =>
          /.*search\/\?query=strange/.test(response.url()) &&
          response.request().method() === 'GET'
      ),
      page.locator('input[type="search"]').press('Enter'),
      page.waitForSelector('.jp-search-replace-tab >> .jp-progress', {
        state: 'hidden'
      })
    ]);
  
    await Promise.all([
      page.waitForResponse(
        response =>
          /.*search\/\?query=strange/.test(response.url()) &&
          response.request().method() === 'GET'
      ),
      await page.locator('text=File filters >> [placeholder="Files\\ filter"]').fill('conftest.py')
    ]);

    await page.waitForTimeout(20);
    expect(await page.locator('.search-tree-files').count()).toEqual(1);
    expect(await page.waitForSelector('jp-tree-view[role="tree"] >> text=conftest.py')).toBeTruthy();
});

test('should test for exclude filter', async ({ page }) => {
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
      page.locator('input[type="search"]').press('Enter'),
      page.waitForSelector('.jp-search-replace-tab >> .jp-progress', {
        state: 'hidden'
      })
    ]);

    await page.locator('[title="switch to toggle the file filter mode"]').click();

    await Promise.all([
      page.waitForResponse(
        response =>
          /.*search\/\?query=strange/.test(response.url()) &&
          response.request().method() === 'GET'
      ),
      await page.locator('text=File filters >> [placeholder="Files\\ filter"]').fill('conftest.py')
    ]);

    await page.waitForTimeout(20);
    expect(await page.locator('.search-tree-files').count()).toEqual(1);
    expect(await page.waitForSelector('jp-tree-view[role="tree"] >> text=test_handlers.py')).toBeTruthy();
});
