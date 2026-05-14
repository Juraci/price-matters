// e2e/importDiffDialog.spec.ts
import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.resolve(__dirname, './fixtures/stocks-sample-v1.csv');
const CSV_PATH_V2 = path.resolve(__dirname, './fixtures/stocks-sample-v2.csv');

test.describe('Post-Import Diff Dialog', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByTestId('import-button')).toBeVisible();
  });

  test('opens automatically after first import showing "Sem atualizações"', async ({ page }) => {
    await page.locator('[data-test-upload-csv]').setInputFiles(CSV_PATH);
    await expect(page.getByTestId('import-success')).toBeVisible();

    const dialog = page.getByTestId('import-diff-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Atualizações da Importação');
    await expect(dialog).toContainText('Sem atualizações');
  });

  test('opens automatically after reimporting same CSV showing "Sem atualizações"', async ({
    page,
  }) => {
    await page.locator('[data-test-upload-csv]').setInputFiles(CSV_PATH);
    await expect(page.getByTestId('import-success')).toBeVisible();
    await page.keyboard.press('Escape');

    await page.locator('[data-test-upload-csv]').setInputFiles(CSV_PATH);
    await expect(page.getByTestId('import-success')).toBeVisible();

    const dialog = page.getByTestId('import-diff-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Sem atualizações');
  });

  test('shows changed fields for updated tickers after second import', async ({ page }) => {
    await page.locator('[data-test-upload-csv]').setInputFiles(CSV_PATH);
    await expect(page.getByTestId('import-success')).toBeVisible();
    await page.keyboard.press('Escape');

    await page.locator('[data-test-upload-csv]').setInputFiles(CSV_PATH_V2);
    await expect(page.getByTestId('import-success')).toBeVisible();

    const dialog = page.getByTestId('import-diff-dialog');
    await expect(dialog).toBeVisible();

    // KLBN4's precoTeto changed R$ 4,40 -> R$ 4,00 between v1 and v2.
    await expect(dialog).toContainText('KLBN4');
    await expect(dialog).toContainText('Preço Teto');
    await expect(dialog).toContainText('R$ 4,40');
    await expect(dialog).toContainText('R$ 4,00');
  });

  test('applies bad tone and ↓ arrow for an unfavorable decrease (precoTeto down)', async ({
    page,
  }) => {
    await page.locator('[data-test-upload-csv]').setInputFiles(CSV_PATH);
    await expect(page.getByTestId('import-success')).toBeVisible();
    await page.keyboard.press('Escape');

    await page.locator('[data-test-upload-csv]').setInputFiles(CSV_PATH_V2);
    await expect(page.getByTestId('import-success')).toBeVisible();

    const dialog = page.getByTestId('import-diff-dialog');
    await expect(dialog).toBeVisible();

    // KLBN4 precoTeto 4,40 -> 4,00: decrease, good direction = 'up', so decrease is bad (red ↓).
    const klabnSection = dialog.getByTestId('ticker-diff-KLBN4');
    const badCell = klabnSection.locator('[data-test-diff-tone="bad"]').first();
    await expect(badCell).toBeVisible();
    await expect(badCell).toContainText('↓');
  });

  test('closing the dialog leaves other UI state unchanged', async ({ page }) => {
    await page.locator('[data-test-upload-csv]').setInputFiles(CSV_PATH);
    await expect(page.getByTestId('import-success')).toBeVisible();

    const dialog = page.getByTestId('import-diff-dialog');
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    await expect(page.getByTestId('import-success')).toBeVisible();
    await expect(page.getByText('ITUB3')).toBeVisible();
  });
});
