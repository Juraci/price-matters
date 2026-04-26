import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.resolve(__dirname, './fixtures/stocks-sample-v1.csv');

test.describe('Stock table sort & filter persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator('[data-test-upload-csv]').setInputFiles(CSV_PATH);
    await expect(page.getByTestId('import-success')).toBeVisible();
  });

  test('clicking a sortable header persists sort across reload', async ({ page }) => {
    const tableHead = page.locator('[data-testid="stock-table"] .p-datatable-thead');
    const cotacaoHeader = tableHead.locator('th').filter({ hasText: 'Cotação' });

    // First click → ascending, second click → descending.
    await cotacaoHeader.click();
    await cotacaoHeader.click();
    await expect(cotacaoHeader).toHaveAttribute('aria-sort', 'descending');

    await page.reload();
    const cotacaoHeaderAfter = page
      .locator('[data-testid="stock-table"] .p-datatable-thead th')
      .filter({ hasText: 'Cotação' });
    await expect(cotacaoHeaderAfter).toHaveAttribute('aria-sort', 'descending');
  });

  test('applied filter narrows rows and persists across reload', async ({ page }) => {
    const table = page.locator('[data-testid="stock-table"]');
    const tableHead = table.locator('.p-datatable-thead');
    const codigoHeader = tableHead.locator('th').filter({ hasText: 'Código' });

    // Pre-filter sanity: at least KLBN4 and BBSE3 are present.
    await expect(table.locator('tr').filter({ hasText: 'KLBN4' })).toBeVisible();
    await expect(table.locator('tr').filter({ hasText: 'BBSE3' })).toBeVisible();

    await codigoHeader.locator('.p-datatable-column-filter-button').click();
    const overlay = page.locator('.p-datatable-filter-overlay-popover');
    await expect(overlay).toBeVisible();

    await overlay.locator('input[type="text"]').first().fill('KLBN');
    await overlay.locator('.p-datatable-filter-apply-button').click();

    // Wait for the overlay to close before asserting row state.
    await expect(overlay).toBeHidden();
    await expect(table.locator('tr').filter({ hasText: 'KLBN4' })).toBeVisible();
    await expect(table.locator('tr').filter({ hasText: 'BBSE3' })).toHaveCount(0);

    await page.reload();
    const tableAfter = page.locator('[data-testid="stock-table"]');
    await expect(tableAfter.locator('tr').filter({ hasText: 'KLBN4' })).toBeVisible();
    await expect(tableAfter.locator('tr').filter({ hasText: 'BBSE3' })).toHaveCount(0);
  });
});
