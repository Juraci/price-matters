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
    valorDeMercado: 1000000,
    lucroLiquidoEstimado: 100000,
    plProjetado: 10,
    plMedio10Anos: 8,
    desvioPLMedia: 25,
    cagrLucros5Anos: 5,
    dividaLiquidaEbitda: 0.5,
    lucroPorAcaoEstimado: 1,
    payoutEsperado: 50,
    dividendoPorAcaoBruto: 0.5,
    dividendYieldBruto: 5,
    cotacaoAtual: 10,
    precoTeto: 12,
    margemSeguranca: 17,
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
    store.upsertTicker('TEST3', 'TestCo', makeSnapshot())
    expect(store.allTickers).toHaveLength(1)
    expect(store.allTickers[0]!.codigo).toBe('TEST3')
  })

  it('returns "new" on first upsert', () => {
    const store = useTickerStore()
    const result = store.upsertTicker('TEST3', 'TestCo', makeSnapshot())
    expect(result).toBe('new')
  })

  it('returns "unchanged" when snapshot has same volatile values', () => {
    const store = useTickerStore()
    const snapshot = makeSnapshot()
    store.upsertTicker('TEST3', 'TestCo', snapshot)
    const result = store.upsertTicker('TEST3', 'TestCo', {
      ...snapshot,
      importId: 'import-2',
      importedAt: '2026-02-01T00:00:00.000Z',
    })
    expect(result).toBe('unchanged')
    expect(store.allTickers[0]!.history).toHaveLength(1)
  })

  it('returns "updated" and adds snapshot when precoTeto changes', () => {
    const store = useTickerStore()
    store.upsertTicker('TEST3', 'TestCo', makeSnapshot({ precoTeto: 12 }))
    const result = store.upsertTicker(
      'TEST3',
      'TestCo',
      makeSnapshot({ precoTeto: 14, importId: 'import-2' }),
    )
    expect(result).toBe('updated')
    expect(store.allTickers[0]!.history).toHaveLength(2)
  })

  it('returns "unchanged" when only cotacaoAtual changes (daily price noise)', () => {
    const store = useTickerStore()
    store.upsertTicker('TEST3', 'TestCo', makeSnapshot({ cotacaoAtual: 10 }))
    const result = store.upsertTicker(
      'TEST3',
      'TestCo',
      makeSnapshot({ cotacaoAtual: 15, importId: 'import-2' }),
    )
    expect(result).toBe('unchanged')
    expect(store.allTickers[0]!.history).toHaveLength(1)
  })

  it('marks active tickers missing from import as removed', () => {
    const store = useTickerStore()
    store.upsertTicker('TEST3', 'TestCo', makeSnapshot())
    store.upsertTicker('ANOT4', 'AnotherCo', makeSnapshot())
    const count = store.markRemovedIfNotIn(new Set(['TEST3']))
    expect(count).toBe(1)
    expect(store.tickers['ANOT4']!.status).toBe('removed')
    expect(store.tickers['TEST3']!.status).toBe('active')
  })

  it('reactivates a previously removed ticker if it reappears', () => {
    const store = useTickerStore()
    store.upsertTicker('TEST3', 'TestCo', makeSnapshot())
    store.markRemovedIfNotIn(new Set())
    expect(store.tickers['TEST3']!.status).toBe('removed')
    store.upsertTicker('TEST3', 'TestCo', makeSnapshot({ importId: 'import-2' }))
    expect(store.tickers['TEST3']!.status).toBe('active')
  })

  it('getLatestSnapshot returns the most recent snapshot', () => {
    const store = useTickerStore()
    store.upsertTicker('TEST3', 'TestCo', makeSnapshot({ precoTeto: 12 }))
    store.upsertTicker('TEST3', 'TestCo', makeSnapshot({ precoTeto: 15, importId: 'import-2' }))
    expect(store.getLatestSnapshot('TEST3')?.precoTeto).toBe(15)
  })

  it('reset clears all tickers', () => {
    const store = useTickerStore()
    store.upsertTicker('TEST3', 'TestCo', makeSnapshot())
    store.reset()
    expect(store.allTickers).toHaveLength(0)
  })
})
