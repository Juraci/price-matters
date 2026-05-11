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
      // Imaginary missing codes must satisfy the strict format rule
      // (^[a-zA-Z]{4}[0-9]{1,2}$) so we exercise the missing-codigos branch
      // rather than the format-error gate.
      filterInput!.value = 'ZZZZ3, ITUB3, YYYY4';
      filterInput!.dispatchEvent(new Event('input'));
      await flushPromises();

      document.querySelector<HTMLButtonElement>('[data-testid="settings-save"]')!.click();
      await flushPromises();

      const errorEl = document.querySelector<HTMLElement>(
        '[data-testid="settings-ticker-filter-error"]',
      );
      expect(errorEl).not.toBeNull();
      expect(errorEl!.textContent).toContain('Tickers não encontrados');
      expect(errorEl!.textContent).toContain('ZZZZ3');
      expect(errorEl!.textContent).toContain('YYYY4');
      expect(errorEl!.textContent).not.toContain('ITUB3');
      expect(config.tickerFilter).toEqual(['ZZZZ3', 'ITUB3', 'YYYY4']);

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
      filterInput!.value = 'ZZZZ3, ITUB3';
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
      filterInput!.value = 'ZZZZ3';
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

  describe('ticker filter format validation', () => {
    it('shows "Formato inválido" below the field after blur with invalid input', async () => {
      const wrapper = mountComponent();
      await wrapper.find('[data-testid="settings-trigger"]').trigger('click');
      await flushPromises();

      const filterInput = document.querySelector<HTMLInputElement>(
        '[data-testid="settings-ticker-filter"]',
      );
      filterInput!.value = 'KLBN4; ITUB3';
      filterInput!.dispatchEvent(new Event('input'));
      filterInput!.dispatchEvent(new Event('blur'));
      await flushPromises();

      const formatErr = document.querySelector<HTMLElement>(
        '[data-testid="settings-ticker-filter-format-error"]',
      );
      expect(formatErr).not.toBeNull();
      expect(formatErr!.textContent).toContain('Formato inválido');

      wrapper.unmount();
    });

    it('save with invalid format is a no-op (does not modify configStore.tickerFilter)', async () => {
      const tickerStore = useTickerStore();
      tickerStore.upsertTicker('KLBN4', 'Klabin', makeSnapshot(), 4);
      const config = useConfigStore();
      config.setTickerFilter(['KLBN4']);

      const wrapper = mountComponent();
      await wrapper.find('[data-testid="settings-trigger"]').trigger('click');
      await flushPromises();

      const filterInput = document.querySelector<HTMLInputElement>(
        '[data-testid="settings-ticker-filter"]',
      );
      filterInput!.value = 'KLBN4; ITUB3';
      filterInput!.dispatchEvent(new Event('input'));
      await flushPromises();
      document.querySelector<HTMLButtonElement>('[data-testid="settings-save"]')!.click();
      await flushPromises();

      // No-op: persisted filter unchanged
      expect(config.tickerFilter).toEqual(['KLBN4']);
      // Format error visible (save also surfaces it, regardless of blur)
      expect(
        document.querySelector('[data-testid="settings-ticker-filter-format-error"]'),
      ).not.toBeNull();
      // No "missing codigos" message since parsing was skipped
      expect(document.querySelector('[data-testid="settings-ticker-filter-error"]')).toBeNull();

      wrapper.unmount();
    });

    it('clears the format error on the next input event (live feedback)', async () => {
      const wrapper = mountComponent();
      await wrapper.find('[data-testid="settings-trigger"]').trigger('click');
      await flushPromises();

      const filterInput = document.querySelector<HTMLInputElement>(
        '[data-testid="settings-ticker-filter"]',
      );
      filterInput!.value = 'KLBN4; ITUB3';
      filterInput!.dispatchEvent(new Event('input'));
      filterInput!.dispatchEvent(new Event('blur'));
      await flushPromises();
      expect(
        document.querySelector('[data-testid="settings-ticker-filter-format-error"]'),
      ).not.toBeNull();

      filterInput!.value = 'KLBN4, ITUB3';
      filterInput!.dispatchEvent(new Event('input'));
      await flushPromises();

      expect(
        document.querySelector('[data-testid="settings-ticker-filter-format-error"]'),
      ).toBeNull();

      wrapper.unmount();
    });

    it('fixing the input and saving applies the filter normally', async () => {
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
      filterInput!.value = 'KLBN4; ITUB3';
      filterInput!.dispatchEvent(new Event('input'));
      filterInput!.dispatchEvent(new Event('blur'));
      await flushPromises();
      document.querySelector<HTMLButtonElement>('[data-testid="settings-save"]')!.click();
      await flushPromises();
      expect(config.tickerFilter).toEqual([]);

      filterInput!.value = 'KLBN4, ITUB3';
      filterInput!.dispatchEvent(new Event('input'));
      await flushPromises();
      document.querySelector<HTMLButtonElement>('[data-testid="settings-save"]')!.click();
      await flushPromises();

      expect(config.tickerFilter).toEqual(['KLBN4', 'ITUB3']);
      expect(
        document.querySelector('[data-testid="settings-ticker-filter-format-error"]'),
      ).toBeNull();

      wrapper.unmount();
    });
  });
});
