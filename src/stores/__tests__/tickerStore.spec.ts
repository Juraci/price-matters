import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTickerStore } from '../tickerStore'
import type { TickerSnapshot } from '@/types/stock'

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

describe('useTickerStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('creates new ticker on first upsert', () => {
    const store = useTickerStore()
    store.upsertTicker('TEST3', 'TestCo', makeSnapshot(), 10)
    expect(store.allTickers).toHaveLength(1)
    expect(store.allTickers[0]!.codigo).toBe('TEST3')
  })

  it('seeds cotacaoAtual on new ticker from the CSV value', () => {
    const store = useTickerStore()
    store.upsertTicker('TEST3', 'TestCo', makeSnapshot(), 10)
    expect(store.allTickers[0]!.cotacaoAtual).toBe(10)
  })

  it('returns "new" on first upsert', () => {
    const result = useTickerStore().upsertTicker('TEST3', 'TestCo', makeSnapshot(), 10)
    expect(result).toBe('new')
  })

  it('returns "unchanged" when snapshot has same volatile values', () => {
    const store = useTickerStore()
    const snapshot = makeSnapshot()
    store.upsertTicker('TEST3', 'TestCo', snapshot, 10)
    const result = store.upsertTicker(
      'TEST3',
      'TestCo',
      { ...snapshot, importId: 'import-2', importedAt: '2026-02-01T00:00:00.000Z' },
      10,
    )
    expect(result).toBe('unchanged')
    expect(store.allTickers[0]!.history).toHaveLength(1)
  })

  it('returns "updated" and adds snapshot when precoTeto changes', () => {
    const store = useTickerStore()
    store.upsertTicker('TEST3', 'TestCo', makeSnapshot({ precoTeto: 12 }), 10)
    const result = store.upsertTicker(
      'TEST3',
      'TestCo',
      makeSnapshot({ precoTeto: 14, importId: 'import-2' }),
      10,
    )
    expect(result).toBe('updated')
    expect(store.allTickers[0]!.history).toHaveLength(2)
  })

  it('does not overwrite an already-set cotacaoAtual when CSV re-imports', () => {
    const store = useTickerStore()
    store.upsertTicker('TEST3', 'TestCo', makeSnapshot(), 10)
    store.setLiveQuote('TEST3', 42.5, '2026-04-24T10:00:00.000Z')
    store.upsertTicker('TEST3', 'TestCo', makeSnapshot({ importId: 'import-2' }), 11)
    expect(store.tickers['TEST3']!.cotacaoAtual).toBe(42.5)
  })

  it('setLiveQuote updates cotacaoAtual and cotacaoFetchedAt', () => {
    const store = useTickerStore()
    store.upsertTicker('TEST3', 'TestCo', makeSnapshot(), 10)
    store.setLiveQuote('TEST3', 99.99, '2026-04-24T10:00:00.000Z')
    expect(store.tickers['TEST3']!.cotacaoAtual).toBe(99.99)
    expect(store.tickers['TEST3']!.cotacaoFetchedAt).toBe('2026-04-24T10:00:00.000Z')
  })

  it('setLiveQuote is a no-op for unknown tickers', () => {
    const store = useTickerStore()
    store.setLiveQuote('MISSING', 50, '2026-04-24T10:00:00.000Z')
    expect(store.tickers['MISSING']).toBeUndefined()
  })

  it('marks active tickers missing from import as removed', () => {
    const store = useTickerStore()
    store.upsertTicker('TEST3', 'TestCo', makeSnapshot(), 10)
    store.upsertTicker('ANOT4', 'AnotherCo', makeSnapshot(), 10)
    const count = store.markRemovedIfNotIn(new Set(['TEST3']))
    expect(count).toBe(1)
    expect(store.tickers['ANOT4']!.status).toBe('removed')
    expect(store.tickers['TEST3']!.status).toBe('active')
  })

  it('reactivates a previously removed ticker if it reappears', () => {
    const store = useTickerStore()
    store.upsertTicker('TEST3', 'TestCo', makeSnapshot(), 10)
    store.markRemovedIfNotIn(new Set())
    expect(store.tickers['TEST3']!.status).toBe('removed')
    store.upsertTicker('TEST3', 'TestCo', makeSnapshot({ importId: 'import-2' }), 10)
    expect(store.tickers['TEST3']!.status).toBe('active')
  })

  it('getLatestSnapshot returns the most recent snapshot', () => {
    const store = useTickerStore()
    store.upsertTicker('TEST3', 'TestCo', makeSnapshot({ precoTeto: 12 }), 10)
    store.upsertTicker('TEST3', 'TestCo', makeSnapshot({ precoTeto: 15, importId: 'import-2' }), 10)
    expect(store.getLatestSnapshot('TEST3')?.precoTeto).toBe(15)
  })

  it('activeTickers excludes removed tickers', () => {
    const store = useTickerStore()
    store.upsertTicker('TEST3', 'TestCo', makeSnapshot(), 10)
    store.upsertTicker('ANOT4', 'AnotherCo', makeSnapshot(), 10)
    store.markRemovedIfNotIn(new Set(['TEST3']))
    expect(store.activeTickers).toHaveLength(1)
    expect(store.activeTickers[0]!.codigo).toBe('TEST3')
  })

  it('reset clears all tickers', () => {
    const store = useTickerStore()
    store.upsertTicker('TEST3', 'TestCo', makeSnapshot(), 10)
    store.reset()
    expect(store.allTickers).toHaveLength(0)
  })

  it('lastFetchedAt defaults to null', () => {
    const store = useTickerStore()
    expect(store.lastFetchedAt).toBeNull()
  })

  it('setLastFetchedAt updates the timestamp', () => {
    const store = useTickerStore()
    store.setLastFetchedAt('2026-04-25T10:00:00.000Z')
    expect(store.lastFetchedAt).toBe('2026-04-25T10:00:00.000Z')
  })

  it('reset clears lastFetchedAt', () => {
    const store = useTickerStore()
    store.setLastFetchedAt('2026-04-25T10:00:00.000Z')
    store.reset()
    expect(store.lastFetchedAt).toBeNull()
  })

  it('getDerived returns computed metrics using ticker.cotacaoAtual', () => {
    const store = useTickerStore()
    store.upsertTicker(
      'TEST3',
      'TestCo',
      makeSnapshot({
        precoTeto: 81,
        lucroLiquidoEstimado: 200000,
        quantidadeTotalAcoes: 100000,
        payoutEsperado: 50,
      }),
      62.21,
    )
    const d = store.getDerived('TEST3')!
    expect(d.lucroPorAcaoEstimado).toBe(2)
    expect(d.plProjetado).toBeCloseTo(31.105, 3)
    expect(d.margemSeguranca).toBeCloseTo(23.1975, 3)
    expect(d.dividendoPorAcaoBruto).toBe(1)
    expect(d.valorDeMercado).toBe(6221000)
  })

  it('getDerived reflects an updated live quote', () => {
    const store = useTickerStore()
    store.upsertTicker(
      'TEST3',
      'TestCo',
      makeSnapshot({ precoTeto: 100, quantidadeTotalAcoes: 1000 }),
      50,
    )
    expect(store.getDerived('TEST3')!.valorDeMercado).toBe(50_000)
    store.setLiveQuote('TEST3', 75, '2026-04-24T10:00:00.000Z')
    expect(store.getDerived('TEST3')!.valorDeMercado).toBe(75_000)
  })

  it('getDerived returns undefined for unknown ticker', () => {
    const store = useTickerStore()
    expect(store.getDerived('MISSING')).toBeUndefined()
  })
})
