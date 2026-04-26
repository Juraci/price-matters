<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Select from 'primevue/select';
import Divider from 'primevue/divider';
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
  lucroLiquidoEstimado: number;
  snapshot: TickerSnapshot;
}

interface DiffRow {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
  tone: 'good' | 'bad' | 'neutral';
  arrow: '↑' | '↓' | '';
}

interface SnapshotOption {
  label: string;
  value: number;
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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

// 'up' = an increase is favorable for the investor; 'down' = an increase is unfavorable.
const FIELD_GOOD_DIRECTION: Record<string, 'up' | 'down'> = {
  precoTeto: 'up',
  dividendYieldBruto: 'up',
  lucroLiquidoEstimado: 'up',
  payoutEsperado: 'up',
  cagrLucros5Anos: 'up',
  dividaLiquidaEbitda: 'down',
  quantidadeTotalAcoes: 'down',
};

const fromIdx = ref<number | null>(null);
const toIdx = ref<number | null>(null);

watch(
  () => props.ticker?.codigo,
  () => {
    const len = props.ticker?.history.length ?? 0;
    fromIdx.value = len >= 2 ? len - 2 : null;
    toIdx.value = len >= 1 ? len - 1 : null;
  },
  { immediate: true },
);

const historyRows = computed<HistoryRow[]>(() =>
  (props.ticker?.history ?? []).map((snap) => ({
    importedAt: snap.importedAt,
    filename: snap.filename,
    lucroLiquidoEstimado: snap.lucroLiquidoEstimado,
    snapshot: snap,
  })),
);

const snapshotOptions = computed<SnapshotOption[]>(() =>
  (props.ticker?.history ?? []).map((snap, i) => ({
    label: `${snap.filename} (${formatDate(snap.importedAt)})`,
    value: i,
  })),
);

const showPicker = computed(() => (props.ticker?.history.length ?? 0) >= 3);

const diffRows = computed<DiffRow[]>(() => {
  const history = props.ticker?.history ?? [];
  if (history.length < 2 || fromIdx.value === null || toIdx.value === null) return [];
  const prev = history[fromIdx.value];
  const last = history[toIdx.value];
  if (!prev || !last) return [];
  return getDiff(prev, last)
    .filter(
      (d): d is Extract<ReturnType<typeof getDiff>[number], { type: 'CHANGE' }> =>
        d.type === 'CHANGE',
    )
    .map((d) => {
      const field = d.path[0] as string;
      const format = FIELD_FORMATTERS[field] ?? ((v: unknown) => String(v));
      const oldNum = d.oldValue as number;
      const newNum = d.value as number;
      const goodDir = FIELD_GOOD_DIRECTION[field];
      const direction = newNum > oldNum ? 'up' : newNum < oldNum ? 'down' : 'flat';
      let tone: DiffRow['tone'] = 'neutral';
      if (goodDir && direction !== 'flat') tone = direction === goodDir ? 'good' : 'bad';
      const arrow: DiffRow['arrow'] = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '';
      return {
        field,
        label: FIELD_LABELS[field] ?? field,
        oldValue: format(oldNum),
        newValue: format(newNum),
        tone,
        arrow,
      };
    });
});
</script>

<template>
  <Dialog
    :visible="visible"
    :header="`Histórico: ${ticker?.codigo ?? ''}`"
    data-test-snapshot-history
    modal
    maximizable
    :style="{ width: '80vw' }"
    @update:visible="$emit('update:visible', $event)"
  >
    <div v-if="showPicker" class="diff-controls" data-test-diff-picker>
      <label class="diff-control">
        <span>Anterior</span>
        <Select
          v-model="fromIdx"
          :options="snapshotOptions"
          optionLabel="label"
          optionValue="value"
          data-test-diff-from
        />
      </label>
      <label class="diff-control">
        <span>Atual</span>
        <Select
          v-model="toIdx"
          :options="snapshotOptions"
          optionLabel="label"
          optionValue="value"
          data-test-diff-to
        />
      </label>
    </div>
    <DataTable
      v-if="diffRows.length > 0"
      :value="diffRows"
      data-test-snapshot-diff
      size="small"
      class="diff-table"
    >
      <Column field="label" header="Campo" />
      <Column field="oldValue" header="Anterior" />
      <Column field="newValue" header="Atual">
        <template #body="{ data }">
          <span :class="['diff-new', `diff-${data.tone}`]" :data-test-diff-tone="data.tone">
            {{ data.newValue
            }}<span v-if="data.arrow" class="diff-arrow">&nbsp;{{ data.arrow }}</span>
          </span>
        </template>
      </Column>
    </DataTable>
    <Divider v-if="showPicker" class="diff-divider" align="left" type="solid">
      <b>Historico de Importações</b>
    </Divider>
    <DataTable :value="historyRows" scrollable scrollHeight="400px" size="small">
      <Column field="importedAt" header="Importado em" style="min-width: 160px">
        <template #body="{ data }">{{ formatDate(data.importedAt) }}</template>
      </Column>
      <Column field="filename" header="Arquivo" style="min-width: 140px" />
    </DataTable>
  </Dialog>
</template>

<style scoped>
.diff-controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.diff-control {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
}

.diff-table {
  margin-bottom: 1rem;
}

.diff-new.diff-good {
  color: var(--p-green-500, #22c55e);
  font-weight: 600;
}

.diff-new.diff-bad {
  color: var(--p-red-500, #ef4444);
  font-weight: 600;
}

.diff-arrow {
  font-weight: 600;
}

.diff-divider {
  margin-top: 2rem;
  margin-bottom: 1rem;
}
</style>
