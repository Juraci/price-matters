import { test, expect } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CSV_PATH = path.resolve(__dirname, '../Planilha-abril-2026-Dados.csv')

// Prices keyed by ticker — the mock route returns a result tailored to whichever
// ticker is in the request URL. Unmapped tickers get 0.00.
const MOCK_PRICES: Record<string, number> = {
  KLBN11: 99.99,
  KLBN4: 77.77,
}

function buildResult(symbol: string, price: number) {
  return {
    symbol,
    shortName: symbol,
    longName: symbol,
    currency: 'BRL',
    regularMarketPrice: price,
    regularMarketDayHigh: price,
    regularMarketDayLow: price,
    regularMarketChange: 0,
    regularMarketChangePercent: 0,
    regularMarketTime: '2026-04-24T17:08:00.000Z',
    marketCap: 0,
    regularMarketVolume: 0,
    logourl: `https://icons.brapi.dev/logos/${symbol}.png`,
  }
}

test.describe('Live quotes', () => {
  test.beforeEach(async ({ page }) => {
    // Seed the brapi API key into the persisted configStore so refresh can run.
    // Runs on every navigation, so it survives the localStorage.clear() + reload below.
    await page.addInitScript(() => {
      localStorage.setItem('config', JSON.stringify({ brapiApiKey: 'test-key' }))
    })

    await page.route('**/api/quote/**', async (route) => {
      const url = new URL(route.request().url())
      const symbol = url.pathname.split('/').pop() ?? ''
      const price = MOCK_PRICES[symbol] ?? 0
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ results: [buildResult(symbol, price)] }),
      })
    })

    await page.goto('/')
    await page.evaluate(() => {
      const { brapiApiKey } = JSON.parse(localStorage.getItem('config') ?? '{}')
      localStorage.clear()
      if (brapiApiKey) {
        localStorage.setItem('config', JSON.stringify({ brapiApiKey }))
      }
    })
    await page.reload()
    await expect(page.getByTestId('import-button')).toBeVisible()
    await page.locator('input[type="file"]').setInputFiles(CSV_PATH)
    await expect(page.getByTestId('import-success')).toBeVisible()
  })

  test('clicking refresh updates Cotação cells with mocked prices', async ({ page }) => {
    const table = page.locator('[data-testid="stock-table"]')
    const klbn11Row = table.locator('tr').filter({ hasText: 'KLBN11' })
    // CSV seed for KLBN11 is R$ 18,76.
    await expect(klbn11Row).toContainText('R$ 18,76')

    await page.getByTestId('live-quotes-refresh').click()

    await expect(klbn11Row).toContainText('R$ 99,99')
    await expect(table.locator('tr').filter({ hasText: 'KLBN4' })).toContainText('R$ 77,77')
  })

  test('status text updates to show last-fetched time after refresh', async ({ page }) => {
    const status = page.getByTestId('live-quotes-status')
    await page.getByTestId('live-quotes-refresh').click()
    await expect(status).toContainText('Atualizado às')
  })

  test('live price survives page reload (persisted via pinia)', async ({ page }) => {
    const table = page.locator('[data-testid="stock-table"]')
    const klbn11Row = table.locator('tr').filter({ hasText: 'KLBN11' })

    await page.getByTestId('live-quotes-refresh').click()
    await expect(klbn11Row).toContainText('R$ 99,99')

    await page.unroute('**/api/quote/**')
    await page.route('**/api/quote/**', async (route) => {
      await route.fulfill({ status: 500, body: 'offline for test' })
    })

    await page.reload()
    const klbn11RowAfter = page
      .locator('[data-testid="stock-table"] tr')
      .filter({ hasText: 'KLBN11' })
    await expect(klbn11RowAfter).toContainText('R$ 99,99')
  })
})
