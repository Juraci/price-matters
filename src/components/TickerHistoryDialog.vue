<script setup lang="ts">
import { computed } from 'vue';
import Dialog from 'primevue/dialog';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import { getDiff } from '@/utils/stockUtils';
import type { Ticker, TickerSnapshot } from '@/types/stock';

const props = defineProps<{
  visible: boolean;
  ticker: Ticker | null;
}>();

defineEmits<{ 'update:visible': [value: boolean] }>();

interface HistoryRow {
  importedAt: string;
  filename: string;
  precoTeto: number;
  dividendYieldBruto: number;
  lucroLiquidoEstimado: number;
  snapshot: TickerSnapshot;
}

interface DiffRow {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const FIELD_LABELS: Record<string, string> = {
  precoTeto: 'Preço Teto',
  dividendYieldBruto: 'DY (%)',
  lucroLiquidoEstimado: 'Lucro Líq.',
  dividaLiquidaEbitda: 'Dívida/EBITDA',
  payoutEsperado: 'Payout',
  cagrLucros5Anos: 'CAGR 5a',
  quantidadeTotalAcoes: 'Qtd. Ações',
};

const FIELD_FORMATTERS: Record<string, (v: number) => string> = {
  precoTeto: formatBRL,
  lucroLiquidoEstimado: formatBRL,
  dividendYieldBruto: (v) => `${v}%`,
  payoutEsperado: (v) => `${v}%`,
  cagrLucros5Anos: (v) => `${v}%`,
  dividaLiquidaEbitda: (v) => v.toString(),
  quantidadeTotalAcoes: (v) => v.toLocaleString('pt-BR'),
};

const historyRows = computed<HistoryRow[]>(() =>
  (props.ticker?.history ?? []).map((snap) => ({
    importedAt: snap.importedAt,
    filename: snap.filename,
    precoTeto: snap.precoTeto,
    dividendYieldBruto: snap.dividendYieldBruto,
    lucroLiquidoEstimado: snap.lucroLiquidoEstimado,
    snapshot: snap,
  })),
);

const diffRows = computed<DiffRow[]>(() => {
  const history = props.ticker?.history ?? [];
  if (history.length < 2) return [];
  const prev = history[history.length - 2]!;
  const last = history[history.length - 1]!;
  return getDiff(prev, last)
    .filter((d): d is Extract<ReturnType<typeof getDiff>[number], { type: 'CHANGE' }> =>
      d.type === 'CHANGE',
    )
    .map((d) => {
      const field = d.path[0] as string;
      const format = FIELD_FORMATTERS[field] ?? ((v: unknown) => String(v));
      return {
        field,
        label: FIELD_LABELS[field] ?? field,
        oldValue: format(d.oldValue as number),
        newValue: format(d.value as number),
      };
    });
});

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
</script>

<template>
  <Dialog :visible="visible" :header="`Histórico: ${ticker?.codigo ?? ''}`" data-test-snapshot-history modal maximizable
    :style="{ width: '80vw' }" @update:visible="$emit('update:visible', $event)">
    <DataTable v-if="diffRows.length > 0" :value="diffRows" data-test-snapshot-diff size="small" class="diff-table">
      <Column field="label" header="Campo" />
      <Column field="oldValue" header="Anterior" />
      <Column field="newValue" header="Atual" />
    </DataTable>
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
    </DataTable>
  </Dialog>
</template>

<style scoped>
.diff-table {
  margin-bottom: 1rem;
}
</style>
