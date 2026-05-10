import { describe, it, expect, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia, getActivePinia } from 'pinia';
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import SettingsPopover from '../SettingsPopover.vue';
import { useConfigStore } from '@/stores/configStore';
import { useTickerStore } from '@/stores/tickerStore';
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
    precoTeto: 12,
    frequenciaAnuncios: 'Anual',
    mesesAnunciosDividendos: 'dezembro',
    ultimaAtualizacao: '01/01/2026',
    ...overrides,
  };
}

function mountComponent() {
  return mount(SettingsPopover, {
    attachTo: document.body,
    global: { plugins: [getActivePinia()!, [PrimeVue, { theme: { preset: Aura } }]] },
  });
}

describe('SettingsPopover', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    document.body.innerHTML = '';
  });

  it('renders the settings trigger button', () => {
    const wrapper = mountComponent();
    expect(wrapper.find('[data-testid="settings-trigger"]').exists()).toBe(true);
  });

  it('saves the typed key to configStore and clears it on Limpar', async () => {
    const wrapper = mountComponent();
    const store = useConfigStore();

    await wrapper.find('[data-testid="settings-trigger"]').trigger('click');
    await flushPromises();

    const input = document.querySelector<HTMLInputElement>('#brapi-key-input');
    expect(input).not.toBeNull();
    input!.value = 'secret-token';
    input!.dispatchEvent(new Event('input'));
    await flushPromises();

    const saveBtn = document.querySelector<HTMLButtonElement>('[data-testid="settings-save"]');
    saveBtn!.click();
    await flushPromises();

    expect(store.brapiApiKey).toBe('secret-token');
    expect(store.isBrapiConfigured).toBe(true);

    // Reopen and click Limpar
    await wrapper.find('[data-testid="settings-trigger"]').trigger('click');
    await flushPromises();
    const clearBtn = document.querySelector<HTMLButtonElement>('[data-testid="settings-clear"]');
    clearBtn!.click();
    await flushPromises();

    expect(store.brapiApiKey).toBe('');
    expect(store.isBrapiConfigured).toBe(false);

    wrapper.unmount();
  });

  it('seeds the input with the current stored key when opened', async () => {
    const store = useConfigStore();
    store.setBrapiApiKey('existing-key');

    const wrapper = mountComponent();
    await wrapper.find('[data-testid="settings-trigger"]').trigger('click');
    await flushPromises();

    const input = document.querySelector<HTMLInputElement>('#brapi-key-input');
    expect(input!.value).toBe('existing-key');

    wrapper.unmount();
  });

  describe('ticker filter', () => {
    it('persists a valid filter (uppercased + trimmed) and shows no error', async () => {
      const tickerStore = useTickerStore();
      tickerStore.upsertTicker('KLBN4', 'Klabin', makeSnapshot(), 4);
      tickerStore.upsertTicker('ITUB3', 'Itau', makeSnapshot(), 30);
      const config = useConfigStore();

      const wrapper = mountComponent();
      await wrapper.find('[data-testid="settings-trigger"]').trigger('click');
      await flushPromises();

      const filterInput = document.querySelector<HTMLInputElement>(
        '[data-testid="settings-ticker-filter"]',
      );
      expect(filterInput).not.toBeNull();
      filterInput!.value = ' klbn4 , ITUB3 ';
      filterInput!.dispatchEvent(new Event('input'));
      await flushPromises();

      document.querySelector<HTMLButtonElement>('[data-testid="settings-save"]')!.click();
      await flushPromises();

      expect(config.tickerFilter).toEqual(['KLBN4', 'ITUB3']);
      expect(config.isTickerFilterActive).toBe(true);
      expect(document.querySelector('[data-testid="settings-ticker-filter-error"]')).toBeNull();

      wrapper.unmount();
    });

    it('shows red error listing missing codigos and still persists best-effort filter', async () => {
      const tickerStore = useTickerStore();
      tickerStore.upsertTicker('ITUB3', 'Itau', makeSnapshot(), 30);
      const config = useConfigStore();

      const wrapper = mountComponent();
      await wrapper.find('[data-testid="settings-trigger"]').trigger('click');
      await flushPromises();

      const filterInput = document.querySelector<HTMLInputElement>(
        '[data-testid="settings-ticker-filter"]',
      );
      filterInput!.value = 'XXX3, ITUB3, YYY4';
      filterInput!.dispatchEvent(new Event('input'));
      await flushPromises();

      document.querySelector<HTMLButtonElement>('[data-testid="settings-save"]')!.click();
      await flushPromises();

      const errorEl = document.querySelector<HTMLElement>(
        '[data-testid="settings-ticker-filter-error"]',
      );
      expect(errorEl).not.toBeNull();
      expect(errorEl!.textContent).toContain('Tickers não encontrados');
      expect(errorEl!.textContent).toContain('XXX3');
      expect(errorEl!.textContent).toContain('YYY4');
      expect(errorEl!.textContent).not.toContain('ITUB3');
      expect(config.tickerFilter).toEqual(['XXX3', 'ITUB3', 'YYY4']);

      wrapper.unmount();
    });

    it('clears the error after a subsequent save where every codigo resolves', async () => {
      const tickerStore = useTickerStore();
      tickerStore.upsertTicker('ITUB3', 'Itau', makeSnapshot(), 30);

      const wrapper = mountComponent();
      await wrapper.find('[data-testid="settings-trigger"]').trigger('click');
      await flushPromises();

      const filterInput = document.querySelector<HTMLInputElement>(
        '[data-testid="settings-ticker-filter"]',
      );
      filterInput!.value = 'XXX3, ITUB3';
      filterInput!.dispatchEvent(new Event('input'));
      await flushPromises();
      document.querySelector<HTMLButtonElement>('[data-testid="settings-save"]')!.click();
      await flushPromises();
      expect(document.querySelector('[data-testid="settings-ticker-filter-error"]')).not.toBeNull();

      filterInput!.value = 'ITUB3';
      filterInput!.dispatchEvent(new Event('input'));
      await flushPromises();
      document.querySelector<HTMLButtonElement>('[data-testid="settings-save"]')!.click();
      await flushPromises();

      expect(document.querySelector('[data-testid="settings-ticker-filter-error"]')).toBeNull();

      wrapper.unmount();
    });

    it('Limpar resets the filter and hides the error', async () => {
      const tickerStore = useTickerStore();
      tickerStore.upsertTicker('ITUB3', 'Itau', makeSnapshot(), 30);
      const config = useConfigStore();
      config.setTickerFilter(['ITUB3']);

      const wrapper = mountComponent();
      await wrapper.find('[data-testid="settings-trigger"]').trigger('click');
      await flushPromises();

      const filterInput = document.querySelector<HTMLInputElement>(
        '[data-testid="settings-ticker-filter"]',
      );
      filterInput!.value = 'XXX3';
      filterInput!.dispatchEvent(new Event('input'));
      await flushPromises();
      document.querySelector<HTMLButtonElement>('[data-testid="settings-save"]')!.click();
      await flushPromises();

      document.querySelector<HTMLButtonElement>('[data-testid="settings-clear"]')!.click();
      await flushPromises();

      expect(config.tickerFilter).toEqual([]);
      expect(config.isTickerFilterActive).toBe(false);
      expect(filterInput!.value).toBe('');
      expect(document.querySelector('[data-testid="settings-ticker-filter-error"]')).toBeNull();

      wrapper.unmount();
    });

    it('seeds the filter input with the current persisted filter on open', async () => {
      const config = useConfigStore();
      config.setTickerFilter(['KLBN4', 'ITUB3']);

      const wrapper = mountComponent();
      await wrapper.find('[data-testid="settings-trigger"]').trigger('click');
      await flushPromises();

      const filterInput = document.querySelector<HTMLInputElement>(
        '[data-testid="settings-ticker-filter"]',
      );
      expect(filterInput!.value).toBe('KLBN4, ITUB3');

      wrapper.unmount();
    });
  });
});
