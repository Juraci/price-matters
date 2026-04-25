<script setup lang="ts">
import { computed, ref } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import MultiSelect from 'primevue/multiselect'
import { useTickerStore } from '@/stores/tickerStore'
import {
  useConfigStore,
  STOCK_TOGGLEABLE_COLUMNS,
  type StockToggleableColumn,
} from '@/stores/configStore'
import { useLiveQuotes } from '@/composables/useLiveQuotes'
import LiveQuotesControls from './LiveQuotesControls.vue'
import SettingsPopover from './SettingsPopover.vue'
import TickerHistoryDialog from './TickerHistoryDialog.vue'
import type { Ticker } from '@/types/stock'

const tickerStore = useTickerStore()
const configStore = useConfigStore()
const { lastFetchedAt, isFetching, lastError, refresh } = useLiveQuotes()

const selectedColumns = computed<StockToggleableColumn[]>({
  get: () =>
    STOCK_TOGGLEABLE_COLUMNS.filter((c) =>
      configStore.stockTableVisibleColumns.includes(c.field),
    ),
  set: (cols) => configStore.setStockTableVisibleColumns(cols.map((c) => c.field)),
})

const historyVisible = ref(false)
const selectedTicker = ref<Ticker | null>(null)

interface TableRow {
  empresaNome: string
  codigo: string
  status: 'active' | 'removed'
  ticker: Ticker
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
  historyCount: number
}

const tableRows = computed<TableRow[]>(() =>
  tickerStore.allTickers
    .map((ticker) => {
      const snap = tickerStore.getLatestSnapshot(ticker.codigo)
      const derived = tickerStore.getDerived(ticker.codigo)
      return {
        empresaNome: ticker.empresaNome,
        codigo: ticker.codigo,
        status: ticker.status,
        ticker,
        atuacao: snap?.atuacao ?? '',
        quantidadeTotalAcoes: snap?.quantidadeTotalAcoes ?? 0,
        valorDeMercado: derived?.valorDeMercado ?? 0,
        lucroLiquidoEstimado: snap?.lucroLiquidoEstimado ?? 0,
        plProjetado: derived?.plProjetado ?? 0,
        plMedio10Anos: snap?.plMedio10Anos ?? 0,
        desvioPLMedia: snap?.desvioPLMedia ?? 0,
        cagrLucros5Anos: snap?.cagrLucros5Anos ?? 0,
        dividaLiquidaEbitda: snap?.dividaLiquidaEbitda ?? 0,
        lucroPorAcaoEstimado: derived?.lucroPorAcaoEstimado ?? 0,
        payoutEsperado: snap?.payoutEsperado ?? 0,
        dividendoPorAcaoBruto: derived?.dividendoPorAcaoBruto ?? 0,
        dividendYieldBruto: snap?.dividendYieldBruto ?? 0,
        cotacaoAtual: ticker.cotacaoAtual ?? 0,
        precoTeto: snap?.precoTeto ?? 0,
        margemSeguranca: derived?.margemSeguranca ?? 0,
        frequenciaAnuncios: snap?.frequenciaAnuncios ?? '',
        mesesAnunciosDividendos: snap?.mesesAnunciosDividendos ?? '',
        ultimaAtualizacao: snap?.ultimaAtualizacao ?? '',
        historyCount: ticker.history.length,
      }
    })
    .sort((a, b) => a.empresaNome.localeCompare(b.empresaNome, 'pt-BR')),
)

function openHistory(ticker: Ticker) {
  selectedTicker.value = ticker
  historyVisible.value = true
}

function rowClass(row: TableRow) {
  return row.status === 'removed' ? 'removed-row' : ''
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Fades from transparent at 0% to full color at ±50%, clamped beyond.
// +50% → #63d196 (green), -50% → #e57b72 (red).
function margemBgColor(margem: number): string {
  if (margem > 0) {
    const t = Math.min(margem / 50, 1)
    return `rgba(99, 209, 150, ${t})`
  }
  if (margem < 0) {
    const t = Math.min(-margem / 50, 1)
    return `rgba(229, 123, 114, ${t})`
  }
  return 'transparent'
}
</script>

<template>
  <div data-testid="stock-table">
    <div v-if="tableRows.length === 0" class="empty-state">
      Nenhum dado importado. Use o botão acima para importar um arquivo CSV.
    </div>

    <DataTable v-else :value="tableRows" rowGroupMode="subheader" sortMode="single" sortField="empresaNome"
      :showGridlines="true" :sortOrder="1" scrollable :rowClass="rowClass" size="small" stripedRows>
      <template #header>
        <div class="table-header">
          <MultiSelect v-model="selectedColumns" :options="STOCK_TOGGLEABLE_COLUMNS" optionLabel="header"
            display="chip" placeholder="Selecionar colunas" data-testid="column-toggle" />
          <LiveQuotesControls :last-fetched-at="lastFetchedAt" :is-fetching="isFetching" :last-error="lastError"
            @refresh="refresh" />
          <SettingsPopover />
        </div>
      </template>
      <Column v-if="configStore.isStockColumnVisible('empresaNome')" field="empresaNome" header="Empresa" frozen
        style="min-width: 90px; font-weight: 600" />
      <Column field="codigo" header="Código" frozen style="min-width: 90px; font-weight: 600" />
      <Column v-if="configStore.isStockColumnVisible('status')" field="status" header="Status"
        style="min-width: 100px">
        <template #body="{ data }">
          <Tag :value="data.status === 'active' ? 'Ativo' : 'Removido'"
            :severity="data.status === 'active' ? 'success' : 'danger'" />
        </template>
      </Column>
      <Column v-if="configStore.isStockColumnVisible('atuacao')" field="atuacao" header="Setor" sortable
        style="min-width: 160px" />
      <Column field="cotacaoAtual" header="Cotação" sortable style="min-width: 110px">
        <template #body="{ data }">{{ formatBRL(data.cotacaoAtual) }}</template>
      </Column>
      <Column field="precoTeto" header="Preço Teto" sortable style="min-width: 110px">
        <template #body="{ data }">{{ formatBRL(data.precoTeto) }}</template>
      </Column>
      <Column field="margemSeguranca" header="Margem (%)" sortable style="min-width: 110px"
        bodyClass="margem-cell-td">
        <template #body="{ data }">
          <div class="margem-cell" :style="{ backgroundColor: margemBgColor(data.margemSeguranca) }">
            {{ data.margemSeguranca.toFixed(1) }}%
          </div>
        </template>
      </Column>
      <Column v-if="configStore.isStockColumnVisible('dividendYieldBruto')" field="dividendYieldBruto"
        header="DY (%)" sortable style="min-width: 90px">
        <template #body="{ data }">{{ data.dividendYieldBruto }}%</template>
      </Column>
      <Column v-if="configStore.isStockColumnVisible('plProjetado')" field="plProjetado" header="P/L Proj."
        sortable style="min-width: 90px">
        <template #body="{ data }">{{ data.plProjetado.toFixed(1) }}</template>
      </Column>
      <Column v-if="configStore.isStockColumnVisible('plMedio10Anos')" field="plMedio10Anos" header="P/L Médio"
        sortable style="min-width: 100px" />
      <Column v-if="configStore.isStockColumnVisible('desvioPLMedia')" field="desvioPLMedia" header="Desvio P/L"
        sortable style="min-width: 110px">
        <template #body="{ data }">{{ data.desvioPLMedia }}%</template>
      </Column>
      <Column v-if="configStore.isStockColumnVisible('cagrLucros5Anos')" field="cagrLucros5Anos" header="CAGR 5a"
        sortable style="min-width: 100px">
        <template #body="{ data }">{{ data.cagrLucros5Anos }}%</template>
      </Column>
      <Column v-if="configStore.isStockColumnVisible('dividaLiquidaEbitda')" field="dividaLiquidaEbitda"
        header="Dívida/EBITDA" sortable style="min-width: 130px" />
      <Column v-if="configStore.isStockColumnVisible('lucroLiquidoEstimado')" field="lucroLiquidoEstimado"
        header="Lucro Líq." sortable style="min-width: 140px">
        <template #body="{ data }">{{ formatBRL(data.lucroLiquidoEstimado) }}</template>
      </Column>
      <Column v-if="configStore.isStockColumnVisible('lucroPorAcaoEstimado')" field="lucroPorAcaoEstimado"
        header="LPA" sortable style="min-width: 90px">
        <template #body="{ data }">{{ formatBRL(data.lucroPorAcaoEstimado) }}</template>
      </Column>
      <Column v-if="configStore.isStockColumnVisible('payoutEsperado')" field="payoutEsperado" header="Payout"
        sortable style="min-width: 90px">
        <template #body="{ data }">{{ data.payoutEsperado }}%</template>
      </Column>
      <Column v-if="configStore.isStockColumnVisible('dividendoPorAcaoBruto')" field="dividendoPorAcaoBruto"
        header="DPA Bruto" sortable style="min-width: 110px">
        <template #body="{ data }">{{ formatBRL(data.dividendoPorAcaoBruto) }}</template>
      </Column>
      <Column v-if="configStore.isStockColumnVisible('valorDeMercado')" field="valorDeMercado"
        header="Valor Mercado" sortable style="min-width: 150px">
        <template #body="{ data }">{{ formatBRL(data.valorDeMercado) }}</template>
      </Column>
      <Column v-if="configStore.isStockColumnVisible('quantidadeTotalAcoes')" field="quantidadeTotalAcoes"
        header="Qtd. Ações" sortable style="min-width: 130px">
        <template #body="{ data }">{{ data.quantidadeTotalAcoes.toLocaleString('pt-BR') }}</template>
      </Column>
      <Column v-if="configStore.isStockColumnVisible('frequenciaAnuncios')" field="frequenciaAnuncios"
        header="Frequência" style="min-width: 120px" />
      <Column v-if="configStore.isStockColumnVisible('mesesAnunciosDividendos')" field="mesesAnunciosDividendos"
        header="Meses" style="min-width: 180px" />
      <Column v-if="configStore.isStockColumnVisible('ultimaAtualizacao')" field="ultimaAtualizacao"
        header="Atualizado em" style="min-width: 130px" />
      <Column header="Histórico" style="min-width: 100px">
        <template #body="{ data }">
          <Button icon="pi pi-history" text size="small" :badge="String(data.historyCount)" aria-label="Histórico"
            data-testid="history-button" @click="openHistory(data.ticker)" />
        </template>
      </Column>
    </DataTable>

    <TickerHistoryDialog v-model:visible="historyVisible" :ticker="selectedTicker" />
  </div>
</template>

<style scoped>
.empty-state {
  text-align: center;
  padding: 1.25rem;
  color: var(--p-text-muted-color);
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

:deep(.removed-row) {
  opacity: 0.5;
}

:deep(td.margem-cell-td) {
  padding: 0;
}

.margem-cell {
  width: 100%;
  height: 100%;
  padding: 0.375rem 0.5rem;
  box-sizing: border-box;
}
</style>
