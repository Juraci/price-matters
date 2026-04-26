import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.resolve(__dirname, './fixtures/stocks-sample-v1.csv');

test.describe('Stock table column toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator('[data-test-upload-csv]').setInputFiles(CSV_PATH);
    await expect(page.getByTestId('import-success')).toBeVisible();
  });

  test('hides a column when deselected from the toggle and persists across reload', async ({
    page,
  }) => {
    const tableHead = page.locator('[data-testid="stock-table"] .p-datatable-thead');
    const setorHeader = tableHead.locator('th').filter({ hasText: 'Setor' });
    await expect(setorHeader).toBeVisible();

    await page.getByTestId('column-toggle').click();
    const panel = page.locator('.p-multiselect-overlay');
    await expect(panel).toBeVisible();
    await panel.locator('li').filter({ hasText: 'Setor' }).click();
    await page.keyboard.press('Escape');

    await expect(setorHeader).toHaveCount(0);

    await page.reload();
    await expect(page.getByTestId('stock-table')).toBeVisible();
    await expect(
      page
        .locator('[data-testid="stock-table"] .p-datatable-thead th')
        .filter({ hasText: 'Setor' }),
    ).toHaveCount(0);
  });

  test('pinned columns (Código, Cotação, Preço Teto, Margem, Histórico) remain visible', async ({
    page,
  }) => {
    const headerCells = page.locator('[data-testid="stock-table"] .p-datatable-thead th');

    await expect(headerCells.filter({ hasText: 'Código' })).toHaveCount(1);
    await expect(headerCells.filter({ hasText: 'Cotação' })).toHaveCount(1);
    await expect(headerCells.filter({ hasText: 'Preço Teto' })).toHaveCount(1);
    await expect(headerCells.filter({ hasText: 'Margem' })).toHaveCount(1);
    await expect(headerCells.filter({ hasText: 'Histórico' })).toHaveCount(1);
  });
});
