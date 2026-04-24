import { ref } from 'vue'
import { useTickerStore } from '@/stores/tickerStore'
import { fetchQuotes, isLiveQuotesConfigured } from '@/services/brapiClient'

export function useLiveQuotes() {
  const tickerStore = useTickerStore()

  const lastFetchedAt = ref<string | null>(null)
  const isFetching = ref<boolean>(false)
  const lastError = ref<string | null>(null)

  async function refresh(): Promise<void> {
    if (!isLiveQuotesConfigured()) {
      lastError.value = 'VITE_BRAPI_API_KEY is not configured'
      return
    }
    const codigos = tickerStore.allTickers.map((t) => t.codigo)
    if (codigos.length === 0) return

    isFetching.value = true
    try {
      const quotes = await fetchQuotes(codigos)
      const now = new Date().toISOString()
      for (const [codigo, price] of Object.entries(quotes)) {
        tickerStore.setLiveQuote(codigo, price, now)
      }
      lastFetchedAt.value = now
      lastError.value = null
    } catch (e) {
      lastError.value = e instanceof Error ? e.message : String(e)
    } finally {
      isFetching.value = false
    }
  }

  return { lastFetchedAt, isFetching, lastError, refresh }
}
