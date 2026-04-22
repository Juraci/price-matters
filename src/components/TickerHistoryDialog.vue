<script setup lang="ts">
import Dialog from 'primevue/dialog'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import type { Ticker } from '@/types/stock'

defineProps<{
  visible: boolean
  ticker: Ticker | null
}>()

defineEmits<{ 'update:visible': [value: boolean] }>()

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
    <DataTable :value="ticker?.history ?? []" scrollable scrollHeight="400px" size="small">
      <Column field="importedAt" header="Importado em" style="min-width: 160px">
        <template #body="{ data }">{{ formatDate(data.importedAt) }}</template>
      </Column>
      <Column field="filename" header="Arquivo" style="min-width: 140px" />
      <Column field="cotacaoAtual" header="Cotação" style="min-width: 110px">
        <template #body="{ data }">{{ formatBRL(data.cotacaoAtual) }}</template>
      </Column>
      <Column field="precoTeto" header="Preço Teto" style="min-width: 110px">
        <template #body="{ data }">{{ formatBRL(data.precoTeto) }}</template>
      </Column>
      <Column field="margemSeguranca" header="Margem (%)" style="min-width: 110px">
        <template #body="{ data }">{{ data.margemSeguranca }}%</template>
      </Column>
      <Column field="dividendYieldBruto" header="DY (%)" style="min-width: 90px">
        <template #body="{ data }">{{ data.dividendYieldBruto }}%</template>
      </Column>
      <Column field="plProjetado" header="P/L" style="min-width: 80px" />
      <Column field="lucroLiquidoEstimado" header="Lucro Líq." style="min-width: 140px">
        <template #body="{ data }">{{ formatBRL(data.lucroLiquidoEstimado) }}</template>
      </Column>
    </DataTable>
  </Dialog>
</template>
