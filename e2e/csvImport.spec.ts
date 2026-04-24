// e2e/csvImport.spec.ts
// The file input in CsvImport.vue has display:none (hidden behind a Button).
// setInputFiles works on hidden inputs without needing force.
import { test, expect } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CSV_PATH = path.resolve(__dirname, '../Planilha-abril-2026-Dados.csv')

test.describe('CSV Stock Import', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.getByTestId('import-button')).toBeVisible()
  })

  test('imports CSV and displays data with empresa and ticker columns', async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(CSV_PATH)

    await expect(page.getByTestId('import-success')).toBeVisible()
    await expect(page.getByText('Klabin').first()).toBeVisible()
    await expect(page.getByText('KLBN11')).toBeVisible()
    await expect(page.getByText('KLBN4')).toBeVisible()
    await expect(page.getByText('KLBN3')).toBeVisible()
  })

  test('all tickers of one empresa show the empresa name in their row', async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(CSV_PATH)

    await expect(page.getByTestId('import-success')).toBeVisible()

    const table = page.locator('[data-testid="stock-table"]')
    const klabinRows = table.locator('tr').filter({ hasText: 'Klabin' })
    await expect(klabinRows.filter({ hasText: 'KLBN11' })).toBeVisible()
    await expect(klabinRows.filter({ hasText: 'KLBN4' })).toBeVisible()
    await expect(klabinRows.filter({ hasText: 'KLBN3' })).toBeVisible()
  })

  test('importing same CSV twice does not create duplicate snapshots', async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(CSV_PATH)
    await expect(page.getByTestId('import-success')).toBeVisible()

    await page.locator('input[type="file"]').setInputFiles(CSV_PATH)
    await expect(page.getByTestId('import-success')).toBeVisible()
    await expect(page.getByText('sem alteração')).toBeVisible()

    const historyButtons = page.getByTestId('history-button')
    await historyButtons.first().click()
    const dialog = page.locator('.p-dialog')
    await expect(dialog).toBeVisible()
    const dialogRows = dialog.locator('.p-datatable-tbody tr')
    await expect(dialogRows).toHaveCount(1)
    await page.keyboard.press('Escape')
  })

  test('opens ticker history dialog with snapshot data', async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(CSV_PATH)
    await expect(page.getByTestId('import-success')).toBeVisible()

    await page.getByTestId('history-button').first().click()

    const dialog = page.locator('.p-dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('.p-dialog-header')).toContainText('Histórico:')
    await expect(dialog.locator('.p-datatable-tbody tr')).toHaveCount(1)
  })

  test('importing updated CSV adds a new snapshot and shows updated count', async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(CSV_PATH)
    await expect(page.getByTestId('import-success')).toBeVisible()

    const fs = await import('node:fs/promises')
    const originalCsv = await fs.readFile(CSV_PATH, 'utf-8')
    const modifiedCsv = originalCsv.replace('"R$ 81,00"', '"R$ 85,00"') // change precoTeto for BMEB3

    await page.evaluate((csvContent) => {
      const dt = new DataTransfer()
      dt.items.add(new File([csvContent], 'modified.csv', { type: 'text/csv' }))
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      Object.defineProperty(input, 'files', { value: dt.files, configurable: true })
      input.dispatchEvent(new Event('change', { bubbles: true }))
    }, modifiedCsv)

    await expect(page.getByText('atualizados')).toBeVisible()
  })

  test('reset button clears all data', async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(CSV_PATH)
    await expect(page.getByTestId('import-success')).toBeVisible()
    await expect(page.getByText('KLBN11')).toBeVisible()

    await page.getByTestId('reset-button').click()

    await expect(page.getByText('Nenhum dado importado')).toBeVisible()
    await expect(page.getByTestId('reset-button')).toBeHidden()
  })
})
