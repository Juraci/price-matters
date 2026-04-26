// e2e/csvImport.spec.ts
// The file input in CsvImport.vue has display:none (hidden behind a Button).
// setInputFiles works on hidden inputs without needing force.
import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.resolve(__dirname, './fixtures/stocks-sample-v1.csv');
const CSV_PATH_V2 = path.resolve(__dirname, './fixtures/stocks-sample-v2.csv');

test.describe('CSV Stock Import', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByTestId('import-button')).toBeVisible();
  });

  test('imports CSV and displays data with empresa and ticker columns', async ({ page }) => {
    await page.locator('[data-test-upload-csv]').setInputFiles(CSV_PATH);

    await expect(page.getByTestId('import-success')).toBeVisible();
    await expect(page.getByText('Banco Itau').first()).toBeVisible();
    await expect(page.getByText('ITUB3')).toBeVisible();
    await expect(page.getByText('ITUB4')).toBeVisible();
  });

  test('all tickers of one empresa show the empresa name in their row', async ({ page }) => {
    await page.locator('[data-test-upload-csv]').setInputFiles(CSV_PATH);

    await expect(page.getByTestId('import-success')).toBeVisible();

    const table = page.locator('[data-testid="stock-table"]');
    const bancoItauRows = table.locator('tr').filter({ hasText: 'Banco Itau' });
    await expect(bancoItauRows.filter({ hasText: 'ITUB3' })).toBeVisible();
    await expect(bancoItauRows.filter({ hasText: 'ITUB4' })).toBeVisible();
  });

  test('importing same CSV twice does not create duplicate snapshots', async ({ page }) => {
    await page.locator('[data-test-upload-csv]').setInputFiles(CSV_PATH);
    await expect(page.getByTestId('import-success')).toBeVisible();

    await page.locator('[data-test-upload-csv]').setInputFiles(CSV_PATH);
    await expect(page.getByTestId('import-success')).toBeVisible();
    await expect(page.getByText('sem alteração')).toBeVisible();

    const historyButtons = page.locator('[data-test-history-button]');
    await historyButtons.first().click();
    const dialog = page.locator('[data-test-snapshot-history]');
    await expect(dialog).toBeVisible();
    const dialogRows = dialog.locator('.p-datatable-tbody tr');
    await expect(dialogRows).toHaveCount(1);
    await page.keyboard.press('Escape');
  });

  test('the history dialog shows diff bettwen snapshots', async ({ page }) => {
    await page.locator('[data-test-upload-csv]').setInputFiles(CSV_PATH);
    await expect(page.getByTestId('import-success')).toBeVisible();

    await page.locator('[data-test-upload-csv]').setInputFiles(CSV_PATH_V2);
    await expect(page.getByTestId('import-success')).toBeVisible();

    await expect(page.locator('[data-test-history-button]').first()).toHaveText('2');

    // KLBN4's precoTeto changed R$ 4,40 -> R$ 4,00 between v1 and v2.
    const table = page.locator('[data-testid="stock-table"]');
    const klabnRow = table.locator('tr').filter({ hasText: 'KLBN4' });
    await klabnRow.locator('[data-test-history-button]').click();

    const dialog = page.locator('[data-test-snapshot-history]');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.p-dialog-header')).toContainText('Histórico:');
    await expect(dialog.locator('.p-datatable-tbody tr').first()).toBeVisible();

    const klabnDiff = dialog.locator('[data-test-snapshot-diff]');
    await expect(klabnDiff).toBeVisible();
    await expect(klabnDiff).toContainText('Preço Teto');
    await expect(klabnDiff).toContainText('R$ 4,40');
    await expect(klabnDiff).toContainText('R$ 4,00');
    await page.getByLabel('Close').click();

    // Grendene's quantidade total de acoes should differ between the two snapshots.
    const grendeneRow = table.locator('tr').filter({ hasText: 'Grendene' });
    await grendeneRow.locator('[data-test-history-button]').click();

    const grendeneSnapshot = page.locator('[data-test-snapshot-history]');
    await expect(grendeneSnapshot).toBeVisible();
    await expect(grendeneSnapshot.locator('.p-dialog-header')).toContainText('Histórico:');
    await expect(grendeneSnapshot.locator('.p-datatable-tbody tr').first()).toBeVisible();

    const grendeneDiff = grendeneSnapshot.locator('[data-test-snapshot-diff]');
    await expect(grendeneDiff).toBeVisible();
    await expect(grendeneDiff).toContainText('Qtd. Ações');
    await expect(grendeneDiff).toContainText('902.160.000');
    await expect(grendeneDiff).toContainText('905.000.000');
  });

  test('importing updated CSV adds a new snapshot and shows updated count', async ({ page }) => {
    await page.locator('[data-test-upload-csv]').setInputFiles(CSV_PATH);
    await expect(page.getByTestId('import-success')).toBeVisible();

    const fs = await import('node:fs/promises');
    const originalCsv = await fs.readFile(CSV_PATH, 'utf-8');
    const modifiedCsv = originalCsv.replace('"R$ 81,00"', '"R$ 85,00"'); // change precoTeto for BMEB3

    await page.evaluate((csvContent) => {
      const dt = new DataTransfer();
      dt.items.add(new File([csvContent], 'modified.csv', { type: 'text/csv' }));
      const input = document.querySelector('[data-test-upload-csv]') as HTMLInputElement;
      Object.defineProperty(input, 'files', { value: dt.files, configurable: true });
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, modifiedCsv);

    await expect(page.getByText('atualizados')).toBeVisible();
  });

  test('reset button clears all data', async ({ page }) => {
    await page.locator('[data-test-upload-csv]').setInputFiles(CSV_PATH);
    await expect(page.getByTestId('import-success')).toBeVisible();
    await expect(page.getByText('ITUB3')).toBeVisible();

    await page.getByTestId('reset-button').click();

    await expect(page.getByText('Nenhum dado importado')).toBeVisible();
    await expect(page.getByTestId('reset-button')).toBeHidden();
  });
});
