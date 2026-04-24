import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia, getActivePinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import StockDataTable from '../StockDataTable.vue'
import { useTickerStore } from '@/stores/tickerStore'
import type { TickerSnapshot } from '@/types/stock'

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
    cotacaoAtual: 10,
    precoTeto: 12,
    frequenciaAnuncios: 'Anual',
    mesesAnunciosDividendos: 'dezembro',
    ultimaAtualizacao: '01/01/2026',
    ...overrides,
  }
}

function mountComponent() {
  return mount(StockDataTable, {
    global: { plugins: [getActivePinia()!, [PrimeVue, { theme: { preset: Aura } }]] },
  })
}

describe('StockDataTable', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders the data table container', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('[data-testid="stock-table"]').exists()).toBe(true)
  })

  it('shows empty-state message when no tickers are loaded', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('Nenhum dado importado')
  })

  it('shows the table when tickers are present', async () => {
    const tickerStore = useTickerStore()
    tickerStore.upsertTicker('TEST3', 'TestCo', makeSnapshot())
    const wrapper = mountComponent()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('Nenhum dado importado')
  })

  it('displays ticker codes and empresa names as columns', async () => {
    const tickerStore = useTickerStore()
    tickerStore.upsertTicker('KLBN11', 'Klabin', makeSnapshot())
    tickerStore.upsertTicker('KLBN4', 'Klabin', makeSnapshot())
    const wrapper = mountComponent()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('KLBN11')
    expect(wrapper.text()).toContain('KLBN4')
    expect(wrapper.text()).toContain('Klabin')
  })
})
