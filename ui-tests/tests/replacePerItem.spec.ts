import { test, galata } from '@jupyterlab/galata';
import { expect } from '@playwright/test';
import * as path from 'path';

const fileName = 'conftest.py';
const fileNameHandler = 'test_handlers.py';

test.beforeEach(async ({ page, tmpPath }) => {
  const { contents } = page;
  await contents.uploadFile(
    path.resolve(__dirname, `./data/${fileName}`),
    `${tmpPath}/${fileName}`
  );
  await contents.uploadFile(
    path.resolve(__dirname, `./data/${fileNameHandler}`),
    `${tmpPath}/${fileNameHandler}`
  );
});

test('should replace results for a particular file only', async ({ page }) => {
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

  await page.waitForSelector(
    '.search-tree-files:has-text("conftest.py") >> .search-tree-matches:has-text(\'                "Is that Strange enough?",\')'
  );

  await page.locator('#jp-search-replace >> [title="Toggle Replace"]').click();
  await page
    .locator('#jp-search-replace >> input[placeholder="Replace"]')
    .fill('hello');

  const entry = page.locator('.search-tree-files:has-text("conftest.py")');
  await entry.hover();
  // press replace all matches for `conftest.py` only
  await entry.locator('[title="Replace All in File"]').click();

  // new results for previous query 'strange' should only have `test_handlers.py`
  await expect(page.locator('.jp-search-replace-statistics')).toHaveText(
    '55 result(s) in 1 file'
  );
  expect(await page.locator('.search-tree-files').count()).toEqual(1);
  expect(
    await page.waitForSelector(
      'jp-tree-view[role="tree"] >> text=test_handlers.py'
    )
  ).toBeTruthy();

  // new search with `hello`
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

  // verify if `conftest.py` has changed
  expect(
    await page.waitForSelector('jp-tree-view[role="tree"] >> text=5')
  ).toBeTruthy();

  await page.waitForSelector(
    '.search-tree-files:has-text("conftest.py") >> .search-tree-matches:has-text(\'                "Is that hellohello enough?",\')'
  );
});

test('should undo replace results for a particular file only', async ({
  page
}) => {
  await page.getByRole('tab', { name: 'Search and Replace' }).click();
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

  await page.locator('jp-tree-view[role="tree"] >> text=5').first().waitFor();

  await page.locator('#jp-search-replace >> [title="Toggle Replace"]').click();
  await page
    .locator('#jp-search-replace >> input[placeholder="Replace"]')
    .fill('hello QS');

  const entry = page.locator('.search-tree-files:has-text("conftest.py")');
  await entry.hover();
  // press replace all matches for `conftest.py` only
  await entry.locator('[title="Replace All in File"]').click();

  // new results for previous query 'strange' should only have `test_handlers.py`
  await expect(page.locator('.jp-search-replace-statistics')).toHaveText(
    '55 result(s) in 1 file'
  );
  expect(
    await page.locator('.search-tree-files >> text=test_handlers.py').count()
  ).toEqual(1);

  // Undo changes
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+s');

  // new search with `hello`
  await page
    .getByRole('textbox', { name: 'Search Files for Text' })
    .fill('hello QS');
  await Promise.all([
    page.waitForResponse(
      response =>
        /.*search\/[\w-]+\?query=hello/.test(response.url()) &&
        response.request().method() === 'GET'
    ),
    page.getByRole('textbox', { name: 'Search Files for Text' }).press('Enter')
  ]);

  // verify if `conftest.py` has not changed
  await expect(page.locator('.jp-search-replace-statistics')).toHaveText(
    'No results found.'
  );
});

test('should replace results for a particular match only', async ({ page }) => {
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
    await page.waitForSelector('jp-tree-view[role="tree"] >> text=55')
  ).toBeTruthy();

  const itemMatch = page.locator(
    '.search-tree-files:has-text("test_handlers.py") >> .search-tree-matches'
  );
  await itemMatch.first().waitFor();

  await page.locator('#jp-search-replace >> [title="Toggle Replace"]').click();
  await page
    .locator('#jp-search-replace >> input[placeholder="Replace"]')
    .fill('helloqs');

  await expect(itemMatch.nth(1)).toHaveText(
    '                    "line": "Unicode strangehelloqs sub file, very strange\\n",'
  );

  await itemMatch.nth(1).hover();
  // press replace match for a particular match in `test_handlers.py` only
  await itemMatch.nth(1).locator('[title="Replace"]').click();

  // new results for previous query 'strange' should have one less result in `test_handlers.py`
  await expect(page.locator('.jp-search-replace-statistics')).toHaveText(
    '59 results in 2 files'
  );
  expect(
    await page.waitForSelector('jp-tree-view[role="tree"] >> text=54')
  ).toBeTruthy();

  // new search with `helloqs`
  await page
    .getByRole('textbox', { name: 'Search Files for Text' })
    .fill('helloqs');
  await Promise.all([
    page.waitForResponse(
      response =>
        /.*search\/[\w-]+\?query=helloqs/.test(response.url()) &&
        response.request().method() === 'GET'
    ),
    page.getByRole('textbox', { name: 'Search Files for Text' }).press('Enter'),
    page.waitForSelector('.jp-search-replace-tab >> .jp-progress', {
      state: 'hidden'
    })
  ]);

  // verify if `test_handlers.py` has changed
  expect(
    await page.waitForSelector('jp-tree-view[role="tree"] >> text=1')
  ).toBeTruthy();

  await expect(itemMatch.first()).toHaveText(
    '                    "line": "Unicode helloqshelloqs sub file, very strange\\n",'
  );
});

test('should undo replace results for a particular match only', async ({
  page
}) => {
  await page.getByRole('tab', { name: 'Search and Replace' }).click();
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

  await page.locator('jp-tree-view[role="tree"] >> text=5').first().waitFor();

  await page.locator('#jp-search-replace >> [title="Toggle Replace"]').click();
  await page
    .locator('#jp-search-replace >> input[placeholder="Replace"]')
    .fill('hello QS');

  const itemMatch = page.locator(
    '.search-tree-files:has-text("conftest.py") >> .search-tree-matches'
  );

  await itemMatch.nth(1).hover();
  await itemMatch.nth(1).locator('[title="Replace"]').click();

  // new results for previous query 'strange' should only have `test_handlers.py`
  await expect(page.locator('.jp-search-replace-statistics')).toHaveText(
    '59 results in 2 files'
  );

  // Undo changes
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+s');

  // new search with `hello`
  await page
    .getByRole('textbox', { name: 'Search Files for Text' })
    .fill('hello QS');
  await Promise.all([
    page.waitForResponse(
      response =>
        /.*search\/[\w-]+\?query=hello/.test(response.url()) &&
        response.request().method() === 'GET'
    ),
    page.getByRole('textbox', { name: 'Search Files for Text' }).press('Enter')
  ]);

  // verify if `conftest.py` has not changed
  await expect(page.locator('.jp-search-replace-statistics')).toHaveText(
    'No results found.'
  );
});

test('should replace with regexp group matching', async ({ page }) => {
  // Click #tab-key-0 .lm-TabBar-tabIcon svg >> nth=0
  await page.getByRole('tab', { name: 'Search and Replace' }).click();
  await page.locator('[title="Use Regular Expression"]').click();
  await page
    .getByRole('textbox', { name: 'Search Files for Text' })
    .fill('(str)an(g)e');

  await page.pause();
  await Promise.all([
    page.waitForResponse(
      response =>
        /.*search\/[\w-]+\?query=%28str%29an%28g%29e/.test(response.url()) &&
        response.request().method() === 'GET'
    ),
    page.getByRole('textbox', { name: 'Search Files for Text' }).press('Enter'),
    page.waitForSelector('.jp-search-replace-tab >> .jp-progress', {
      state: 'hidden'
    })
  ]);

  await expect(
    page.locator('.search-tree-files:has-text("test_handlers.py") >> jp-badge')
  ).toHaveText('55');

  const itemMatch = page.locator(
    '.search-tree-files:has-text("test_handlers.py") >> .search-tree-matches'
  );
  await itemMatch.first().waitFor();

  await page.locator('#jp-search-replace >> [title="Toggle Replace"]').click();
  await page
    .locator('#jp-search-replace >> jp-text-field[placeholder="Replace"]')
    .click();
  await page
    .locator('#jp-search-replace >> input[placeholder="Replace"]')
    .fill('$1on$2');

  await expect(itemMatch.nth(1)).toHaveText(
    '                    "line": "Unicode strangestrong sub file, very strange\\n",'
  );

  await itemMatch.nth(1).hover();
  // press replace match for a particular match in `test_handlers.py` only
  await itemMatch.nth(1).locator('[title="Replace"]').click();

  // new results for previous query 'strange' should have one less result in `test_handlers.py`
  await expect(page.locator('.jp-search-replace-statistics')).toHaveText(
    '59 results in 2 files'
  );
  expect(
    await page.waitForSelector('jp-tree-view[role="tree"] >> text=54')
  ).toBeTruthy();

  // new search with `strong`
  await page
    .getByRole('textbox', { name: 'Search Files for Text' })
    .fill('strong');
  await Promise.all([
    page.waitForResponse(
      response =>
        /.*search\/[\w-]+\?query=strong/.test(response.url()) &&
        response.request().method() === 'GET'
    ),
    page.getByRole('textbox', { name: 'Search Files for Text' }).press('Enter'),
    page.waitForSelector('.jp-search-replace-tab >> .jp-progress', {
      state: 'hidden'
    })
  ]);

  // verify if `test_handlers.py` has changed
  expect(
    await page.waitForSelector('jp-tree-view[role="tree"] >> text=1')
  ).toBeTruthy();

  await expect(itemMatch.first()).toHaveText(
    '                    "line": "Unicode strong$1on$2 sub file, very strange\\n",'
  );
});
