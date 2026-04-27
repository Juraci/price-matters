import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { FilterMatchMode, FilterOperator } from '@primevue/core/api';
import type { DataTableFilterMeta } from 'primevue/datatable';

export interface StockToggleableColumn {
  field: string;
  header: string;
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
];

// Hidden by default on a fresh install when the user is on a narrow viewport.
// This is initialization only — the user can re-enable any of these via the
// column toggle, and persisted state always wins on subsequent loads.
export const MOBILE_HIDDEN_COLUMNS = new Set<string>([
  'empresaNome',
  'status',
  'atuacao',
  'ultimaAtualizacao',
]);

const MOBILE_BREAKPOINT_PX = 768;

function isMobileViewport(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`).matches;
}

function buildDefaultVisibleColumns(): string[] {
  const mobile = isMobileViewport();
  return STOCK_TOGGLEABLE_COLUMNS.map((c) => c.field).filter(
    (field) => !mobile || !MOBILE_HIDDEN_COLUMNS.has(field),
  );
}

export type StockFilterKind = 'text' | 'numeric' | 'enum';

export interface StockFilterableColumn {
  field: string;
  kind: StockFilterKind;
}

// Single source of truth for which columns expose a filter and what their default
// match mode is. Pinned columns (codigo, cotacaoAtual, precoTeto, margemSeguranca)
// plus every toggleable column are filterable; the Histórico action column is not.
export const STOCK_FILTERABLE_COLUMNS: StockFilterableColumn[] = [
  { field: 'empresaNome', kind: 'text' },
  { field: 'codigo', kind: 'text' },
  { field: 'status', kind: 'enum' },
  { field: 'atuacao', kind: 'text' },
  { field: 'cotacaoAtual', kind: 'numeric' },
  { field: 'precoTeto', kind: 'numeric' },
  { field: 'margemSeguranca', kind: 'numeric' },
  { field: 'dividendYieldBruto', kind: 'numeric' },
  { field: 'plProjetado', kind: 'numeric' },
  { field: 'plMedio10Anos', kind: 'numeric' },
  { field: 'desvioPLMedia', kind: 'numeric' },
  { field: 'cagrLucros5Anos', kind: 'numeric' },
  { field: 'dividaLiquidaEbitda', kind: 'numeric' },
  { field: 'lucroLiquidoEstimado', kind: 'numeric' },
  { field: 'lucroPorAcaoEstimado', kind: 'numeric' },
  { field: 'payoutEsperado', kind: 'numeric' },
  { field: 'dividendoPorAcaoBruto', kind: 'numeric' },
  { field: 'valorDeMercado', kind: 'numeric' },
  { field: 'quantidadeTotalAcoes', kind: 'numeric' },
  { field: 'frequenciaAnuncios', kind: 'text' },
  { field: 'mesesAnunciosDividendos', kind: 'text' },
  { field: 'ultimaAtualizacao', kind: 'text' },
];

function defaultMatchModeFor(kind: StockFilterKind): string {
  switch (kind) {
    case 'numeric':
      return FilterMatchMode.GREATER_THAN;
    case 'enum':
      return FilterMatchMode.EQUALS;
    default:
      return FilterMatchMode.STARTS_WITH;
  }
}

export function buildDefaultStockTableFilters(): DataTableFilterMeta {
  const filters: DataTableFilterMeta = {};
  for (const col of STOCK_FILTERABLE_COLUMNS) {
    filters[col.field] = {
      operator: FilterOperator.AND,
      constraints: [{ value: null, matchMode: defaultMatchModeFor(col.kind) }],
    };
  }
  return filters;
}

export const useConfigStore = defineStore(
  'config',
  () => {
    const stockTableVisibleColumns = ref<string[]>(buildDefaultVisibleColumns());
    const brapiApiKey = ref<string>('');
    const stockTableSortField = ref<string>('empresaNome');
    const stockTableSortOrder = ref<number | undefined>(1);
    const stockTableFilters = ref<DataTableFilterMeta>(buildDefaultStockTableFilters());

    const isStockColumnVisible = computed(
      () => (field: string) => stockTableVisibleColumns.value.includes(field),
    );

    const isBrapiConfigured = computed(() => brapiApiKey.value.trim().length > 0);

    function setStockTableVisibleColumns(fields: string[]): void {
      stockTableVisibleColumns.value = fields;
    }

    function setBrapiApiKey(key: string): void {
      brapiApiKey.value = key.trim();
    }

    function setStockTableSort(field: string, order: number | undefined): void {
      stockTableSortField.value = field;
      stockTableSortOrder.value = order;
    }

    function setStockTableFilters(filters: DataTableFilterMeta): void {
      stockTableFilters.value = filters;
    }

    function resetStockTableFilters(): void {
      stockTableFilters.value = buildDefaultStockTableFilters();
    }

    return {
      stockTableVisibleColumns,
      brapiApiKey,
      stockTableSortField,
      stockTableSortOrder,
      stockTableFilters,
      isStockColumnVisible,
      isBrapiConfigured,
      setStockTableVisibleColumns,
      setBrapiApiKey,
      setStockTableSort,
      setStockTableFilters,
      resetStockTableFilters,
    };
  },
  { persist: true },
);
