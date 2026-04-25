import { ref, toRef } from 'vue'
import { useTickerStore } from '@/stores/tickerStore'
import { useConfigStore } from '@/stores/configStore'
import { fetchQuotes } from '@/services/brapiClient'

export function useLiveQuotes() {
  const tickerStore = useTickerStore()
  const configStore = useConfigStore()

  const lastFetchedAt = toRef(tickerStore, 'lastFetchedAt')
  const isFetching = ref<boolean>(false)
  const lastError = ref<string | null>(null)

  async function refresh(): Promise<void> {
    if (!configStore.isBrapiConfigured) {
      lastError.value = 'Brapi API key is not configured. Open Settings to add one.'
      return
    }
    const codigos = tickerStore.allTickers.map((t) => t.codigo)
    if (codigos.length === 0) return

    isFetching.value = true
    try {
      const quotes = await fetchQuotes(codigos, configStore.brapiApiKey)
      const now = new Date().toISOString()
      for (const [codigo, price] of Object.entries(quotes)) {
        tickerStore.setLiveQuote(codigo, price, now)
      }
      tickerStore.setLastFetchedAt(now)
      lastError.value = null
    } catch (e) {
      lastError.value = e instanceof Error ? e.message : String(e)
    } finally {
      isFetching.value = false
    }
  }

  return { lastFetchedAt, isFetching, lastError, refresh }
}
