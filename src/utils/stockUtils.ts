import type { DerivedMetrics, TickerSnapshot } from '@/types/stock'

export function slugify(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

// Fields intentionally excluded from change detection:
// - cotacaoAtual: daily price noise, changes every market session
// - importId, importedAt, filename: import metadata, not business data
// - atuacao, quantidadeTotalAcoes, plMedio10Anos, desvioPLMedia,
//   frequenciaAnuncios, mesesAnunciosDividendos, ultimaAtualizacao:
//   slowly-changing dimensions; excluded to reduce snapshot churn
const VOLATILE_FIELDS: (keyof TickerSnapshot)[] = [
  'precoTeto',
  'dividendYieldBruto',
  'lucroLiquidoEstimado',
  'dividaLiquidaEbitda',
  'payoutEsperado',
  'cagrLucros5Anos',
]

export function snapshotsDiffer(a: TickerSnapshot, b: TickerSnapshot): boolean {
  return VOLATILE_FIELDS.some((field) => a[field] !== b[field])
}

export function computeDerived(snapshot: TickerSnapshot): DerivedMetrics {
  const { cotacaoAtual, precoTeto, lucroLiquidoEstimado, quantidadeTotalAcoes, payoutEsperado } =
    snapshot

  const lucroPorAcaoEstimado =
    quantidadeTotalAcoes === 0 ? 0 : lucroLiquidoEstimado / quantidadeTotalAcoes
  const margemSeguranca = precoTeto === 0 ? 0 : (1 - cotacaoAtual / precoTeto) * 100
  const plProjetado = lucroPorAcaoEstimado === 0 ? 0 : cotacaoAtual / lucroPorAcaoEstimado
  const dividendoPorAcaoBruto = (payoutEsperado / 100) * lucroPorAcaoEstimado
  const valorDeMercado = quantidadeTotalAcoes * cotacaoAtual

  return {
    margemSeguranca,
    lucroPorAcaoEstimado,
    plProjetado,
    dividendoPorAcaoBruto,
    valorDeMercado,
  }
}
