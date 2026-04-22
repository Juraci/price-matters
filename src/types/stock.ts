// src/types/stock.ts

export interface TickerSnapshot {
  importId: string
  importedAt: string
  filename: string
  atuacao: string
  quantidadeTotalAcoes: number
  valorDeMercado: number
  lucroLiquidoEstimado: number
  plProjetado: number
  plMedio10Anos: number
  desvioPLMedia: number
  cagrLucros5Anos: number
  dividaLiquidaEbitda: number
  lucroPorAcaoEstimado: number
  payoutEsperado: number
  dividendoPorAcaoBruto: number
  dividendYieldBruto: number
  cotacaoAtual: number
  precoTeto: number
  margemSeguranca: number
  frequenciaAnuncios: string
  mesesAnunciosDividendos: string
  ultimaAtualizacao: string
}

export type TickerStatus = 'active' | 'removed'

export interface Ticker {
  codigo: string
  empresaNome: string
  status: TickerStatus
  history: TickerSnapshot[]
}

export interface Empresa {
  id: string
  nome: string
  codigos: string[]
  createdAt: string
  updatedAt: string
}

export interface ImportBatch {
  id: string
  filename: string
  importedAt: string
  rowCount: number
  stats: {
    newEmpresas: number
    newTickers: number
    updatedTickers: number
    removedTickers: number
    unchangedTickers: number
  }
}

export interface ParsedCsvRow {
  empresa: string
  codigo: string
  snapshot: TickerSnapshot
}
