import { test, expect } from '@playwright/test'

test.describe('Settings popover', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('refresh without a configured key surfaces an error; saving via the popover enables it', async ({
    page,
  }) => {
    // Import the CSV to get tickers into the table (the refresh button only
    // matters once there are tickers to refresh).
    const { fileURLToPath } = await import('node:url')
    const path = await import('node:path')
    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    const CSV_PATH = path.resolve(__dirname, '../Planilha-abril-2026-Dados.csv')

    await page.locator('input[type="file"]').setInputFiles(CSV_PATH)
    await expect(page.getByTestId('import-success')).toBeVisible()

    // Mock brapi AFTER the key is configured — we only assert the call shape.
    let requested = false
    await page.route('**/api/quote/**', async (route) => {
      requested = true
      const url = new URL(route.request().url())
      const symbol = url.pathname.split('/').pop() ?? ''
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [{ symbol, regularMarketPrice: 42 }],
        }),
      })
    })

    // Refresh with no key → should produce the error tag, no request fired.
    await page.getByTestId('live-quotes-refresh').click()
    await expect(page.getByTestId('live-quotes-error')).toBeVisible()
    expect(requested).toBe(false)

    // Open the settings popover, type a key, save.
    await page.getByTestId('settings-trigger').click()
    await page.locator('#brapi-key-input').fill('my-secret-key')
    await page.getByTestId('settings-save').click()

    // Refresh again → request should fire and error clears.
    await page.getByTestId('live-quotes-refresh').click()
    await expect(page.getByTestId('live-quotes-error')).toBeHidden()
    expect(requested).toBe(true)
  })
})
