<script setup lang="ts">
import { computed, ref } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import { useTickerStore } from '@/stores/tickerStore'
import TickerHistoryDialog from './TickerHistoryDialog.vue'
import type { Ticker } from '@/types/stock'

const tickerStore = useTickerStore()

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
      return {
        empresaNome: ticker.empresaNome,
        codigo: ticker.codigo,
        status: ticker.status,
        ticker,
        atuacao: snap?.atuacao ?? '',
        quantidadeTotalAcoes: snap?.quantidadeTotalAcoes ?? 0,
        valorDeMercado: snap?.valorDeMercado ?? 0,
        lucroLiquidoEstimado: snap?.lucroLiquidoEstimado ?? 0,
        plProjetado: snap?.plProjetado ?? 0,
        plMedio10Anos: snap?.plMedio10Anos ?? 0,
        desvioPLMedia: snap?.desvioPLMedia ?? 0,
        cagrLucros5Anos: snap?.cagrLucros5Anos ?? 0,
        dividaLiquidaEbitda: snap?.dividaLiquidaEbitda ?? 0,
        lucroPorAcaoEstimado: snap?.lucroPorAcaoEstimado ?? 0,
        payoutEsperado: snap?.payoutEsperado ?? 0,
        dividendoPorAcaoBruto: snap?.dividendoPorAcaoBruto ?? 0,
        dividendYieldBruto: snap?.dividendYieldBruto ?? 0,
        cotacaoAtual: snap?.cotacaoAtual ?? 0,
        precoTeto: snap?.precoTeto ?? 0,
        margemSeguranca: snap?.margemSeguranca ?? 0,
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
</script>

<template>
  <div data-testid="stock-table">
    <div v-if="tableRows.length === 0" class="empty-state">
      Nenhum dado importado. Use o botão acima para importar um arquivo CSV.
    </div>

    <DataTable v-else :value="tableRows" rowGroupMode="subheader" sortMode="single" sortField="empresaNome"
      :showGridlines="true" :sortOrder="1" scrollable :rowClass="rowClass" size="small" stripedRows>
      <Column field="empresaNome" header="Empresa" frozen style="min-width: 90px; font-weight: 600" />
      <Column field="codigo" header="Código" frozen style="min-width: 90px; font-weight: 600" />
      <Column field="status" header="Status" style="min-width: 100px">
        <template #body="{ data }">
          <Tag :value="data.status === 'active' ? 'Ativo' : 'Removido'"
            :severity="data.status === 'active' ? 'success' : 'danger'" />
        </template>
      </Column>
      <Column field="atuacao" header="Setor" sortable style="min-width: 160px" />
      <Column field="cotacaoAtual" header="Cotação" sortable style="min-width: 110px">
        <template #body="{ data }">{{ formatBRL(data.cotacaoAtual) }}</template>
      </Column>
      <Column field="precoTeto" header="Preço Teto" sortable style="min-width: 110px">
        <template #body="{ data }">{{ formatBRL(data.precoTeto) }}</template>
      </Column>
      <Column field="margemSeguranca" header="Margem (%)" sortable style="min-width: 110px">
        <template #body="{ data }">{{ data.margemSeguranca }}%</template>
      </Column>
      <Column field="dividendYieldBruto" header="DY (%)" sortable style="min-width: 90px">
        <template #body="{ data }">{{ data.dividendYieldBruto }}%</template>
      </Column>
      <Column field="plProjetado" header="P/L Proj." sortable style="min-width: 90px" />
      <Column field="plMedio10Anos" header="P/L Médio" sortable style="min-width: 100px" />
      <Column field="desvioPLMedia" header="Desvio P/L" sortable style="min-width: 110px">
        <template #body="{ data }">{{ data.desvioPLMedia }}%</template>
      </Column>
      <Column field="cagrLucros5Anos" header="CAGR 5a" sortable style="min-width: 100px">
        <template #body="{ data }">{{ data.cagrLucros5Anos }}%</template>
      </Column>
      <Column field="dividaLiquidaEbitda" header="Dívida/EBITDA" sortable style="min-width: 130px" />
      <Column field="lucroLiquidoEstimado" header="Lucro Líq." sortable style="min-width: 140px">
        <template #body="{ data }">{{ formatBRL(data.lucroLiquidoEstimado) }}</template>
      </Column>
      <Column field="lucroPorAcaoEstimado" header="LPA" sortable style="min-width: 90px">
        <template #body="{ data }">{{ formatBRL(data.lucroPorAcaoEstimado) }}</template>
      </Column>
      <Column field="payoutEsperado" header="Payout" sortable style="min-width: 90px">
        <template #body="{ data }">{{ data.payoutEsperado }}%</template>
      </Column>
      <Column field="dividendoPorAcaoBruto" header="DPA Bruto" sortable style="min-width: 110px">
        <template #body="{ data }">{{ formatBRL(data.dividendoPorAcaoBruto) }}</template>
      </Column>
      <Column field="valorDeMercado" header="Valor Mercado" sortable style="min-width: 150px">
        <template #body="{ data }">{{ formatBRL(data.valorDeMercado) }}</template>
      </Column>
      <Column field="quantidadeTotalAcoes" header="Qtd. Ações" sortable style="min-width: 130px">
        <template #body="{ data }">{{ data.quantidadeTotalAcoes.toLocaleString('pt-BR') }}</template>
      </Column>
      <Column field="frequenciaAnuncios" header="Frequência" style="min-width: 120px" />
      <Column field="mesesAnunciosDividendos" header="Meses" style="min-width: 180px" />
      <Column field="ultimaAtualizacao" header="Atualizado em" style="min-width: 130px" />
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

:deep(.removed-row) {
  opacity: 0.5;
}
</style>
