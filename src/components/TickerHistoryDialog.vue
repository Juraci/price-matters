<script setup lang="ts">
import { computed } from 'vue'
import Dialog from 'primevue/dialog'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import type { Ticker, TickerSnapshot } from '@/types/stock'

const props = defineProps<{
  visible: boolean
  ticker: Ticker | null
}>()

defineEmits<{ 'update:visible': [value: boolean] }>()

interface HistoryRow {
  importedAt: string
  filename: string
  precoTeto: number
  dividendYieldBruto: number
  lucroLiquidoEstimado: number
  snapshot: TickerSnapshot
}

const historyRows = computed<HistoryRow[]>(() =>
  (props.ticker?.history ?? []).map((snap) => ({
    importedAt: snap.importedAt,
    filename: snap.filename,
    precoTeto: snap.precoTeto,
    dividendYieldBruto: snap.dividendYieldBruto,
    lucroLiquidoEstimado: snap.lucroLiquidoEstimado,
    snapshot: snap,
  })),
)

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
</script>

<template>
  <Dialog
    :visible="visible"
    :header="`Histórico: ${ticker?.codigo ?? ''}`"
    modal
    maximizable
    :style="{ width: '80vw' }"
    @update:visible="$emit('update:visible', $event)"
  >
    <DataTable :value="historyRows" scrollable scrollHeight="400px" size="small">
      <Column field="importedAt" header="Importado em" style="min-width: 160px">
        <template #body="{ data }">{{ formatDate(data.importedAt) }}</template>
      </Column>
      <Column field="filename" header="Arquivo" style="min-width: 140px" />
      <Column field="precoTeto" header="Preço Teto" style="min-width: 110px">
        <template #body="{ data }">{{ formatBRL(data.precoTeto) }}</template>
      </Column>
      <Column field="dividendYieldBruto" header="DY (%)" style="min-width: 90px">
        <template #body="{ data }">{{ data.dividendYieldBruto }}%</template>
      </Column>
      <Column field="lucroLiquidoEstimado" header="Lucro Líq." style="min-width: 140px">
        <template #body="{ data }">{{ formatBRL(data.lucroLiquidoEstimado) }}</template>
      </Column>
    </DataTable>
  </Dialog>
</template>
