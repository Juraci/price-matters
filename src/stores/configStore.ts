import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface StockToggleableColumn {
  field: string
  header: string
}

export const STOCK_TOGGLEABLE_COLUMNS: StockToggleableColumn[] = [
  { field: 'empresaNome', header: 'Empresa' },
  { field: 'status', header: 'Status' },
  { field: 'atuacao', header: 'Setor' },
  { field: 'dividendYieldBruto', header: 'DY (%)' },
  { field: 'plProjetado', header: 'P/L Proj.' },
  { field: 'plMedio10Anos', header: 'P/L Médio' },
  { field: 'desvioPLMedia', header: 'Desvio P/L' },
  { field: 'cagrLucros5Anos', header: 'CAGR 5a' },
  { field: 'dividaLiquidaEbitda', header: 'Dívida/EBITDA' },
  { field: 'lucroLiquidoEstimado', header: 'Lucro Líq.' },
  { field: 'lucroPorAcaoEstimado', header: 'LPA' },
  { field: 'payoutEsperado', header: 'Payout' },
  { field: 'dividendoPorAcaoBruto', header: 'DPA Bruto' },
  { field: 'valorDeMercado', header: 'Valor Mercado' },
  { field: 'quantidadeTotalAcoes', header: 'Qtd. Ações' },
  { field: 'frequenciaAnuncios', header: 'Frequência' },
  { field: 'mesesAnunciosDividendos', header: 'Meses' },
  { field: 'ultimaAtualizacao', header: 'Atualizado em' },
]

const DEFAULT_VISIBLE: string[] = STOCK_TOGGLEABLE_COLUMNS.map((c) => c.field)

export const useConfigStore = defineStore(
  'config',
  () => {
    const stockTableVisibleColumns = ref<string[]>([...DEFAULT_VISIBLE])

    const isStockColumnVisible = computed(
      () => (field: string) => stockTableVisibleColumns.value.includes(field),
    )

    function setStockTableVisibleColumns(fields: string[]): void {
      stockTableVisibleColumns.value = fields
    }

    return {
      stockTableVisibleColumns,
      isStockColumnVisible,
      setStockTableVisibleColumns,
    }
  },
  { persist: true },
)
