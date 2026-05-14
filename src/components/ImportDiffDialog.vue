<script setup lang="ts">
import { computed } from 'vue';
import Dialog from 'primevue/dialog';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import { getDiff } from '@/utils/stockUtils';
import { useTickerStore } from '@/stores/tickerStore';
import { useIsMobile } from '@/composables/useIsMobile';

const props = defineProps<{
  visible: boolean;
  updatedCodigos: string[];
}>();

defineEmits<{ 'update:visible': [value: boolean] }>();

const tickerStore = useTickerStore();
const { isMobile } = useIsMobile();

interface DiffRow {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
  tone: 'good' | 'bad' | 'neutral';
  arrow: '↑' | '↓' | '';
}

interface TickerDiff {
  codigo: string;
  rows: DiffRow[];
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const FIELD_LABELS: Record<string, string> = {
  precoTeto: 'Preço Teto',
  lucroLiquidoEstimado: 'Lucro Líq.',
  dividaLiquidaEbitda: 'Dívida/EBITDA',
  payoutEsperado: 'Payout',
  cagrLucros5Anos: 'CAGR 5a',
  quantidadeTotalAcoes: 'Qtd. Ações',
};

const FIELD_FORMATTERS: Record<string, (v: number) => string> = {
  precoTeto: formatBRL,
  lucroLiquidoEstimado: formatBRL,
  payoutEsperado: (v) => `${v}%`,
  cagrLucros5Anos: (v) => `${v}%`,
  dividaLiquidaEbitda: (v) => v.toString(),
  quantidadeTotalAcoes: (v) => v.toLocaleString('pt-BR'),
};

// 'up' = an increase is favorable for the investor; 'down' = an increase is unfavorable.
const FIELD_GOOD_DIRECTION: Record<string, 'up' | 'down'> = {
  precoTeto: 'up',
  lucroLiquidoEstimado: 'up',
  payoutEsperado: 'up',
  cagrLucros5Anos: 'up',
  dividaLiquidaEbitda: 'down',
  quantidadeTotalAcoes: 'down',
};

const tickerDiffs = computed<TickerDiff[]>(() =>
  props.updatedCodigos.flatMap((codigo) => {
    const ticker = tickerStore.tickers[codigo];
    if (!ticker || ticker.history.length < 2) return [];
    const prev = ticker.history[ticker.history.length - 2]!;
    const last = ticker.history[ticker.history.length - 1]!;
    const rows = getDiff(prev, last)
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
        const arrow: DiffRow['arrow'] =
          direction === 'up' ? '↑' : direction === 'down' ? '↓' : '';
        return {
          field,
          label: FIELD_LABELS[field] ?? field,
          oldValue: format(oldNum),
          newValue: format(newNum),
          tone,
          arrow,
        };
      });
    return rows.length > 0 ? [{ codigo, rows }] : [];
  }),
);
</script>

<template>
  <Dialog
    :visible="visible"
    header="Atualizações da Importação"
    data-testid="import-diff-dialog"
    modal
    :style="{ width: isMobile ? '100vw' : '60vw' }"
    @update:visible="$emit('update:visible', $event)"
  >
    <p v-if="tickerDiffs.length === 0" class="no-changes" data-testid="no-changes-message">
      Sem atualizações
    </p>
    <template v-else>
      <div
        v-for="diff in tickerDiffs"
        :key="diff.codigo"
        class="ticker-section"
        :data-testid="`ticker-diff-${diff.codigo}`"
      >
        <h3 class="ticker-code">{{ diff.codigo }}</h3>
        <DataTable :value="diff.rows" data-test-import-diff size="small" class="diff-table">
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
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.no-changes {
  color: var(--p-text-muted-color, #6b7280);
  text-align: center;
  padding: 1rem 0;
}

.ticker-section {
  margin-bottom: 1.5rem;
}

.ticker-code {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
}

.diff-table {
  margin-bottom: 0;
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
</style>
