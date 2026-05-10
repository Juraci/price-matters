import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.resolve(__dirname, './fixtures/stocks-sample-v1.csv');

test.describe('Ticker filter', () => {
  test.beforeEach(async ({ page }) => {
    // Conditionally seed the brapi key so that mid-test reloads don't wipe the
    // tickerFilter persisted in the same `config` localStorage key (Pinia
    // persistedstate writes the whole store to one key; an unconditional
    // overwrite here would clobber the filter on reload).
    await page.addInitScript(() => {
      if (!localStorage.getItem('config')) {
        localStorage.setItem('config', JSON.stringify({ brapiApiKey: 'test-key' }));
      }
    });

    await page.goto('/');
    await expect(page.getByTestId('import-button')).toBeVisible();
    await page.locator('[data-test-upload-csv]').setInputFiles(CSV_PATH);
    await expect(page.getByTestId('import-success')).toBeVisible();
  });

  test('saving "KLBN4, ITUB3" narrows the table to those rows and live-quote refresh fans out only to those codigos', async ({
    page,
  }) => {
    const requested: string[] = [];
    await page.route('**/api/quote/**', async (route) => {
      const url = new URL(route.request().url());
      const symbol = url.pathname.split('/').pop() ?? '';
      requested.push(symbol);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ results: [{ symbol, regularMarketPrice: 100 }] }),
      });
    });

    const table = page.locator('[data-testid="stock-table"]');

    // Sanity: pre-filter, the four codes from the user's scenario are all visible.
    await expect(table.locator('tr').filter({ hasText: 'KLBN4' })).toBeVisible();
    await expect(table.locator('tr').filter({ hasText: 'ITUB3' })).toBeVisible();
    await expect(table.locator('tr').filter({ hasText: 'BBSE3' })).toBeVisible();
    await expect(table.locator('tr').filter({ hasText: 'LEVE3' })).toBeVisible();

    await page.getByTestId('settings-trigger').click();
    await page.locator('[data-testid="settings-ticker-filter"]').fill('KLBN4, ITUB3');
    await page.getByTestId('settings-save').click();

    // Filter narrowed the table to KLBN4 + ITUB3 only.
    await expect(table.locator('tr').filter({ hasText: 'KLBN4' })).toBeVisible();
    await expect(table.locator('tr').filter({ hasText: 'ITUB3' })).toBeVisible();
    await expect(table.locator('tr').filter({ hasText: 'BBSE3' })).toHaveCount(0);
    await expect(table.locator('tr').filter({ hasText: 'LEVE3' })).toHaveCount(0);

    // Live-quote refresh hits brapi only for the filtered codigos.
    await page.getByTestId('live-quotes-refresh').click();
    await expect(page.getByTestId('live-quotes-status')).toContainText('Atualizado às');
    expect(requested.sort()).toEqual(['ITUB3', 'KLBN4']);
  });

  test('saving a filter with an unknown codigo shows an inline red error and applies the matching codigo (best-effort)', async ({
    page,
  }) => {
    const table = page.locator('[data-testid="stock-table"]');

    await page.getByTestId('settings-trigger').click();
    await page.locator('[data-testid="settings-ticker-filter"]').fill('XXX3, ITUB3');
    await page.getByTestId('settings-save').click();

    const error = page.getByTestId('settings-ticker-filter-error');
    await expect(error).toBeVisible();
    await expect(error).toContainText('Tickers não encontrados');
    await expect(error).toContainText('XXX3');
    await expect(error).not.toContainText('ITUB3');

    // Best-effort save: ITUB3 is the only data row in the table.
    await expect(table.locator('tr').filter({ hasText: 'ITUB3' })).toBeVisible();
    await expect(table.locator('tr').filter({ hasText: 'KLBN4' })).toHaveCount(0);
    await expect(table.locator('tr').filter({ hasText: 'BBSE3' })).toHaveCount(0);
    await expect(table.locator('tr').filter({ hasText: 'LEVE3' })).toHaveCount(0);
  });

  test('saved filter survives a page reload', async ({ page }) => {
    await page.getByTestId('settings-trigger').click();
    await page.locator('[data-testid="settings-ticker-filter"]').fill('KLBN4, ITUB3');
    await page.getByTestId('settings-save').click();

    const table = page.locator('[data-testid="stock-table"]');
    await expect(table.locator('tr').filter({ hasText: 'KLBN4' })).toBeVisible();
    await expect(table.locator('tr').filter({ hasText: 'BBSE3' })).toHaveCount(0);

    await page.reload();

    const tableAfter = page.locator('[data-testid="stock-table"]');
    await expect(tableAfter.locator('tr').filter({ hasText: 'KLBN4' })).toBeVisible();
    await expect(tableAfter.locator('tr').filter({ hasText: 'ITUB3' })).toBeVisible();
    await expect(tableAfter.locator('tr').filter({ hasText: 'BBSE3' })).toHaveCount(0);
    await expect(tableAfter.locator('tr').filter({ hasText: 'LEVE3' })).toHaveCount(0);
  });
});
