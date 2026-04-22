import type { TickerSnapshot } from '@/types/stock'

export function slugify(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

const VOLATILE_FIELDS: (keyof TickerSnapshot)[] = [
  'precoTeto',
  'margemSeguranca',
  'dividendYieldBruto',
  'lucroLiquidoEstimado',
  'plProjetado',
  'dividaLiquidaEbitda',
  'lucroPorAcaoEstimado',
  'dividendoPorAcaoBruto',
  'payoutEsperado',
  'valorDeMercado',
  'cagrLucros5Anos',
]

export function snapshotsDiffer(a: TickerSnapshot, b: TickerSnapshot): boolean {
  return VOLATILE_FIELDS.some((field) => a[field] !== b[field])
}
