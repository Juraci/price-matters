import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia, getActivePinia } from 'pinia'
import { useTickerStore } from '@/stores/tickerStore'
import { useConfigStore } from '@/stores/configStore'
import type { TickerSnapshot } from '@/types/stock'

const fetchQuotesMock =
  vi.fn<(codigos: string[], apiKey: string) => Promise<Record<string, number>>>()

vi.mock('@/services/brapiClient', () => ({
  fetchQuotes: (codigos: string[], apiKey: string) => fetchQuotesMock(codigos, apiKey),
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
    useConfigStore().setBrapiApiKey('test-key')
  })

  it('does not fetch on mount (manual refresh only)', () => {
    useTickerStore().upsertTicker('PETR4', 'Petrobras', makeSnapshot(), 30)
    mountHost()
    expect(fetchQuotesMock).not.toHaveBeenCalled()
  })

  it('sets lastError when brapi key is not configured and does not call fetchQuotes', async () => {
    useConfigStore().setBrapiApiKey('')
    useTickerStore().upsertTicker('PETR4', 'Petrobras', makeSnapshot(), 30)

    const api = mountHost()
    await api.refresh()

    expect(fetchQuotesMock).not.toHaveBeenCalled()
    expect(api.lastError).toMatch(/Brapi API key/i)
  })

  it('refresh updates cotacaoAtual and lastFetchedAt for returned quotes', async () => {
    const tickerStore = useTickerStore()
    tickerStore.upsertTicker('PETR4', 'Petrobras', makeSnapshot(), 30)
    tickerStore.upsertTicker('VALE3', 'Vale', makeSnapshot(), 60)

    fetchQuotesMock.mockResolvedValue({ PETR4: 38.5, VALE3: 72.1 })

    const api = mountHost()
    await api.refresh()

    expect(fetchQuotesMock).toHaveBeenCalledWith(['PETR4', 'VALE3'], 'test-key')
    expect(tickerStore.tickers['PETR4']!.cotacaoAtual).toBe(38.5)
    expect(tickerStore.tickers['VALE3']!.cotacaoAtual).toBe(72.1)
    expect(api.lastFetchedAt).not.toBeNull()
    expect(tickerStore.lastFetchedAt).toBe(api.lastFetchedAt)
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
