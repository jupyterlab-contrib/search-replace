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
    await page.locator('[title="Search and replace"]').click();
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
  
    await expect(page.locator('[id="tree-item-file-0"] >> jp-tree-item:nth-child(5)')).toHaveText(
      '                "Is that Strange enough?",'
    );
  
    await page.locator('#jp-search-replace >> text=Replace >> [placeholder="Replace"]').click();
    await page.locator('#jp-search-replace >> text=Replace >> [placeholder="Replace"]').fill('hello');

    // press replace all matches for `conftest.py` only
    await page.locator('[id="replace-matches-in-file-button-0"]').click();

    // new results for previous query 'strange' should only have `test_handlers.py`
    await page.waitForTimeout(800);
    expect(await page.locator('.search-tree-files').count()).toEqual(1);
    expect(await page.waitForSelector('jp-tree-view[role="tree"] >> text=test_handlers.py')).toBeTruthy();
  
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
  
    await expect(page.locator('[id="tree-item-file-0"] >> jp-tree-item:nth-child(5)')).toHaveText(
      '                "Is that hello enough?",'
    );
});

test('should replace results for a particular match only', async ({ page }) => {
    // Click #tab-key-0 .lm-TabBar-tabIcon svg >> nth=0
    await page.locator('[title="Search and replace"]').click();
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

    await page.pause();
  
    // id for `test_handlers.py` is `tree-item-file-0` since everything inside `conftest.py` has already
    // been replaced in the preceding test above
    await expect(page.locator('[id="tree-item-file-0"] >> jp-tree-item:nth-child(5)')).toHaveText(
      '                    "line": "Unicode strange sub file, very strange\\n",'
    );
  
    await page.locator('#jp-search-replace >> text=Replace >> [placeholder="Replace"]').click();
    await page.locator('#jp-search-replace >> text=Replace >> [placeholder="Replace"]').fill('hello');

    // press replace match for a particular match in `test_handlers.py` only
    await page.locator('[id="tree-item-file-0"] >> [id="replace-match-button-1"]').click();

    // new results for previous query 'strange' should have one less result in `test_handlers.py`
    await page.waitForTimeout(800);
    expect(
        await page.waitForSelector('jp-tree-view[role="tree"] >> text=54')
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
  
    // verify if `test_handlers.py` has changed
    expect(
      await page.waitForSelector('jp-tree-view[role="tree"] >> text=12')
    ).toBeTruthy();
  
    // `conftest.py` will appear again in search query for `hello` since everything was
    // replaced inside it in the preceding test. Thus, `test_handlers.py` is the 2nd file and has
    // id as `tree-item-file-1`
    await expect(page.locator('[id="tree-item-file-1"] >> jp-tree-item:nth-child(4)')).toHaveText(
      '                    "line": "Unicode hello sub file, very strange\\n",'
    );
});
