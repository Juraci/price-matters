import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DerivedMetrics, Ticker, TickerSnapshot } from '@/types/stock'
import { computeDerived, snapshotsDiffer } from '@/utils/stockUtils'

export const useTickerStore = defineStore(
  'ticker',
  () => {
    const tickers = ref<Record<string, Ticker>>({})

    function upsertTicker(
      codigo: string,
      empresaNome: string,
      snapshot: TickerSnapshot,
      cotacaoAtualFromCsv: number,
    ): 'new' | 'updated' | 'unchanged' {
      if (!tickers.value[codigo]) {
        tickers.value[codigo] = {
          codigo,
          empresaNome,
          status: 'active',
          history: [snapshot],
          cotacaoAtual: cotacaoAtualFromCsv,
        }
        return 'new'
      }

      const ticker = tickers.value[codigo]!
      ticker.status = 'active'

      // Seed from CSV only if we have no live quote yet.
      if (ticker.cotacaoAtual === undefined) ticker.cotacaoAtual = cotacaoAtualFromCsv

      const last = ticker.history[ticker.history.length - 1]
      if (last && snapshotsDiffer(last, snapshot)) {
        ticker.history.push(snapshot)
        return 'updated'
      }

      return 'unchanged'
    }

    function setLiveQuote(codigo: string, price: number, fetchedAt: string): void {
      const ticker = tickers.value[codigo]
      if (!ticker) return
      ticker.cotacaoAtual = price
      ticker.cotacaoFetchedAt = fetchedAt
    }

    function markRemovedIfNotIn(currentCodigos: Set<string>): number {
      let count = 0
      for (const ticker of Object.values(tickers.value)) {
        if (ticker.status === 'active' && !currentCodigos.has(ticker.codigo)) {
          ticker.status = 'removed'
          count++
        }
      }
      return count
    }

    function getLatestSnapshot(codigo: string): TickerSnapshot | undefined {
      const ticker = tickers.value[codigo]
      return ticker?.history[ticker.history.length - 1]
    }

    function getDerived(codigo: string): DerivedMetrics | undefined {
      const ticker = tickers.value[codigo]
      const snap = ticker?.history[ticker.history.length - 1]
      if (!snap || !ticker) return undefined
      return computeDerived(snap, ticker.cotacaoAtual ?? 0)
    }

    const allTickers = computed(() => Object.values(tickers.value))
    const activeTickers = computed(() => allTickers.value.filter((t) => t.status === 'active'))

    function reset(): void {
      tickers.value = {}
    }

    return {
      tickers,
      upsertTicker,
      setLiveQuote,
      markRemovedIfNotIn,
      getLatestSnapshot,
      getDerived,
      allTickers,
      activeTickers,
      reset,
    }
  },
  { persist: true },
)
