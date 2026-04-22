import { describe, it, expect } from 'vitest'
import { slugify, snapshotsDiffer } from '../stockUtils'
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

describe('slugify', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(slugify('Banco Mercantil')).toBe('banco-mercantil')
  })

  it('strips accents (NFD normalization)', () => {
    expect(slugify('Oléo e Gás')).toBe('oleo-e-gas')
  })

  it('strips non-alphanumeric characters', () => {
    expect(slugify('BB Seguridade')).toBe('bb-seguridade')
  })

  it('same slug for same name across calls', () => {
    expect(slugify('Klabin')).toBe(slugify('Klabin'))
  })
})

describe('snapshotsDiffer', () => {
  it('returns false for two identical snapshots', () => {
    const s = makeSnapshot()
    expect(snapshotsDiffer(s, { ...s })).toBe(false)
  })

  it('returns true when precoTeto differs', () => {
    const a = makeSnapshot({ precoTeto: 12 })
    const b = makeSnapshot({ precoTeto: 14 })
    expect(snapshotsDiffer(a, b)).toBe(true)
  })

  it('returns false when only cotacaoAtual differs (daily price noise)', () => {
    const a = makeSnapshot({ cotacaoAtual: 10 })
    const b = makeSnapshot({ cotacaoAtual: 11 })
    expect(snapshotsDiffer(a, b)).toBe(false)
  })

  it('returns true when dividendYieldBruto differs', () => {
    const a = makeSnapshot({ dividendYieldBruto: 5 })
    const b = makeSnapshot({ dividendYieldBruto: 6 })
    expect(snapshotsDiffer(a, b)).toBe(true)
  })

  it('returns false when only importId and importedAt differ (metadata)', () => {
    const a = makeSnapshot({ importId: 'import-1', importedAt: '2026-01-01T00:00:00.000Z' })
    const b = makeSnapshot({ importId: 'import-2', importedAt: '2026-02-01T00:00:00.000Z' })
    expect(snapshotsDiffer(a, b)).toBe(false)
  })
})
