import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia, getActivePinia } from 'pinia'
import { useTickerStore } from '@/stores/tickerStore'
import type { TickerSnapshot } from '@/types/stock'

const fetchQuotesMock = vi.fn<(codigos: string[]) => Promise<Record<string, number>>>()
const isLiveQuotesConfiguredMock = vi.fn<() => boolean>()

vi.mock('@/services/brapiClient', () => ({
  fetchQuotes: (codigos: string[]) => fetchQuotesMock(codigos),
  isLiveQuotesConfigured: () => isLiveQuotesConfiguredMock(),
}))

import { useLiveQuotes } from '../useLiveQuotes'

function makeSnapshot(overrides: Partial<TickerSnapshot> = {}): TickerSnapshot {
  return {
    importId: 'import-1',
    importedAt: '2026-01-01T00:00:00.000Z',
    filename: 'test.csv',
    atuacao: 'Tecnologia',
    quantidadeTotalAcoes: 100000,
    lucroLiquidoEstimado: 100000,
    plMedio10Anos: 8,
    desvioPLMedia: 25,
    cagrLucros5Anos: 5,
    dividaLiquidaEbitda: 0.5,
    payoutEsperado: 50,
    dividendYieldBruto: 5,
    precoTeto: 12,
    frequenciaAnuncios: 'Anual',
    mesesAnunciosDividendos: 'dezembro',
    ultimaAtualizacao: '01/01/2026',
    ...overrides,
  }
}

interface HostExposed {
  lastFetchedAt: string | null
  isFetching: boolean
  lastError: string | null
  refresh: () => Promise<void>
}

function mountHost(): HostExposed {
  const Host = defineComponent({
    setup(_, { expose }) {
      const api = useLiveQuotes()
      expose(api)
      return () => h('div')
    },
  })
  const wrapper = mount(Host, { global: { plugins: [getActivePinia()!] } })
  return wrapper.vm as unknown as HostExposed
}

describe('useLiveQuotes', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchQuotesMock.mockReset()
    isLiveQuotesConfiguredMock.mockReset()
    isLiveQuotesConfiguredMock.mockReturnValue(true)
  })

  it('does not fetch on mount (manual refresh only)', () => {
    useTickerStore().upsertTicker('PETR4', 'Petrobras', makeSnapshot(), 30)
    mountHost()
    expect(fetchQuotesMock).not.toHaveBeenCalled()
  })

  it('sets lastError when brapi is not configured and does not call fetchQuotes', async () => {
    isLiveQuotesConfiguredMock.mockReturnValue(false)
    useTickerStore().upsertTicker('PETR4', 'Petrobras', makeSnapshot(), 30)

    const api = mountHost()
    await api.refresh()

    expect(fetchQuotesMock).not.toHaveBeenCalled()
    expect(api.lastError).toMatch(/VITE_BRAPI_API_KEY/)
  })

  it('refresh updates cotacaoAtual and lastFetchedAt for returned quotes', async () => {
    const tickerStore = useTickerStore()
    tickerStore.upsertTicker('PETR4', 'Petrobras', makeSnapshot(), 30)
    tickerStore.upsertTicker('VALE3', 'Vale', makeSnapshot(), 60)

    fetchQuotesMock.mockResolvedValue({ PETR4: 38.5, VALE3: 72.1 })

    const api = mountHost()
    await api.refresh()

    expect(fetchQuotesMock).toHaveBeenCalledWith(['PETR4', 'VALE3'])
    expect(tickerStore.tickers['PETR4']!.cotacaoAtual).toBe(38.5)
    expect(tickerStore.tickers['VALE3']!.cotacaoAtual).toBe(72.1)
    expect(api.lastFetchedAt).not.toBeNull()
  })

  it('preserves previous cotacaoAtual for tickers missing from the response', async () => {
    const tickerStore = useTickerStore()
    tickerStore.upsertTicker('PETR4', 'Petrobras', makeSnapshot(), 30)
    tickerStore.upsertTicker('VALE3', 'Vale', makeSnapshot(), 60)

    fetchQuotesMock.mockResolvedValue({ PETR4: 38.5 })

    const api = mountHost()
    await api.refresh()

    expect(tickerStore.tickers['PETR4']!.cotacaoAtual).toBe(38.5)
    expect(tickerStore.tickers['VALE3']!.cotacaoAtual).toBe(60)
  })

  it('captures fetch error into lastError and leaves prices unchanged', async () => {
    const tickerStore = useTickerStore()
    tickerStore.upsertTicker('PETR4', 'Petrobras', makeSnapshot(), 30)

    fetchQuotesMock.mockRejectedValue(new Error('boom'))

    const api = mountHost()
    await api.refresh()

    expect(api.lastError).toBe('boom')
    expect(tickerStore.tickers['PETR4']!.cotacaoAtual).toBe(30)
  })

  it('refresh is a no-op when there are no tickers', async () => {
    const api = mountHost()
    await api.refresh()
    expect(fetchQuotesMock).not.toHaveBeenCalled()
  })
})
