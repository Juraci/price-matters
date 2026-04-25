interface BrapiQuoteResult {
  symbol?: string
  regularMarketPrice?: number | null
}

interface BrapiQuoteResponse {
  results?: BrapiQuoteResult[]
}

async function fetchOne(codigo: string, apiKey: string): Promise<[string, number] | null> {
  const params = new URLSearchParams({ interval: '1d', token: apiKey })
  const url = `https://brapi.dev/api/quote/${codigo}?${params.toString()}`
  const res = await fetch(url)
  if (!res.ok) return null
  const body = (await res.json()) as BrapiQuoteResponse
  const r = body.results?.[0]
  if (!r?.symbol || typeof r.regularMarketPrice !== 'number') return null
  return [r.symbol, r.regularMarketPrice]
}

export async function fetchQuotes(
  codigos: string[],
  apiKey: string,
): Promise<Record<string, number>> {
  if (codigos.length === 0) return {}

  // brapi's free tier limits each GET /api/quote to a single ticker, so fan out
  // one request per code. allSettled: a failure on one ticker must not cancel
  // the others — we just skip it and the caller keeps the previous price.
  const settled = await Promise.allSettled(codigos.map((c) => fetchOne(c, apiKey)))
  const out: Record<string, number> = {}
  for (const r of settled) {
    if (r.status === 'fulfilled' && r.value) {
      const [symbol, price] = r.value
      out[symbol] = price
    }
  }
  return out
}
