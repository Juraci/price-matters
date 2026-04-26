import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia, getActivePinia } from 'pinia';
import PrimeVue from 'primevue/config';
import DataTable from 'primevue/datatable';
import Aura from '@primeuix/themes/aura';
import { FilterMatchMode, FilterOperator } from '@primevue/core/api';
import StockDataTable from '../StockDataTable.vue';
import { useTickerStore } from '@/stores/tickerStore';
import { useConfigStore } from '@/stores/configStore';
import type { TickerSnapshot } from '@/types/stock';

function makeSnapshot(overrides: Partial<TickerSnapshot> = {}): TickerSnapshot {
  return {
    importId: 'import-1',
    importedAt: '2026-01-01T00:00:00.000Z',
    filename: 'test.csv',
    atuacao: 'Tecnologia',
    quantidadeTotalAcoes: 100000,
    lucroLiquidoEstimado: 100000,
    plMedio10Anos: 8,
    desvioPLMedia: 25,
    cagrLucros5Anos: 5,
    dividaLiquidaEbitda: 0.5,
    payoutEsperado: 50,
    dividendYieldBruto: 5,
    precoTeto: 12,
    frequenciaAnuncios: 'Anual',
    mesesAnunciosDividendos: 'dezembro',
    ultimaAtualizacao: '01/01/2026',
    ...overrides,
  };
}

function mountComponent() {
  return mount(StockDataTable, {
    global: { plugins: [getActivePinia()!, [PrimeVue, { theme: { preset: Aura } }]] },
  });
}

describe('StockDataTable', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders the data table container', () => {
    const wrapper = mountComponent();
    expect(wrapper.find('[data-testid="stock-table"]').exists()).toBe(true);
  });

  it('shows empty-state message when no tickers are loaded', () => {
    const wrapper = mountComponent();
    expect(wrapper.text()).toContain('Nenhum dado importado');
  });

  it('shows the table when tickers are present', async () => {
    const tickerStore = useTickerStore();
    tickerStore.upsertTicker('TEST3', 'TestCo', makeSnapshot(), 10);
    const wrapper = mountComponent();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).not.toContain('Nenhum dado importado');
  });

  it('displays ticker codes and empresa names as columns', async () => {
    const tickerStore = useTickerStore();
    tickerStore.upsertTicker('KLBN11', 'Klabin', makeSnapshot(), 10);
    tickerStore.upsertTicker('KLBN4', 'Klabin', makeSnapshot(), 10);
    const wrapper = mountComponent();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('KLBN11');
    expect(wrapper.text()).toContain('KLBN4');
    expect(wrapper.text()).toContain('Klabin');
  });

  it('passes the configStore sort field/order to the DataTable', async () => {
    const tickerStore = useTickerStore();
    tickerStore.upsertTicker('TEST3', 'TestCo', makeSnapshot(), 10);
    const configStore = useConfigStore();
    configStore.setStockTableSort('cotacaoAtual', -1);

    const wrapper = mountComponent();
    await wrapper.vm.$nextTick();

    const dataTable = wrapper.findComponent(DataTable);
    expect(dataTable.props('sortField')).toBe('cotacaoAtual');
    expect(dataTable.props('sortOrder')).toBe(-1);
  });

  it('round-trips sort state from DataTable update events back to the store', async () => {
    const tickerStore = useTickerStore();
    tickerStore.upsertTicker('TEST3', 'TestCo', makeSnapshot(), 10);
    const configStore = useConfigStore();

    const wrapper = mountComponent();
    await wrapper.vm.$nextTick();

    const dataTable = wrapper.findComponent(DataTable);
    dataTable.vm.$emit('update:sortField', 'precoTeto');
    dataTable.vm.$emit('update:sortOrder', -1);
    await wrapper.vm.$nextTick();

    expect(configStore.stockTableSortField).toBe('precoTeto');
    expect(configStore.stockTableSortOrder).toBe(-1);
  });

  it('passes the configStore filters to the DataTable', async () => {
    const tickerStore = useTickerStore();
    tickerStore.upsertTicker('TEST3', 'TestCo', makeSnapshot(), 10);
    const configStore = useConfigStore();
    configStore.setStockTableFilters({
      codigo: {
        operator: FilterOperator.AND,
        constraints: [{ value: 'TEST', matchMode: FilterMatchMode.STARTS_WITH }],
      },
    });

    const wrapper = mountComponent();
    await wrapper.vm.$nextTick();

    const dataTable = wrapper.findComponent(DataTable);
    expect(dataTable.props('filters')).toEqual({
      codigo: {
        operator: FilterOperator.AND,
        constraints: [{ value: 'TEST', matchMode: FilterMatchMode.STARTS_WITH }],
      },
    });
  });
});
