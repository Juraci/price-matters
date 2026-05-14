// src/components/__tests__/ImportDiffDialog.spec.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia, getActivePinia } from 'pinia';
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import ImportDiffDialog from '../ImportDiffDialog.vue';
import { useTickerStore } from '@/stores/tickerStore';
import type { TickerSnapshot } from '@/types/stock';

// PrimeVue components use window.matchMedia, which jsdom doesn't implement.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn<(query: string) => MediaQueryList>().mockImplementation(
    (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn<() => void>(),
        removeListener: vi.fn<() => void>(),
        addEventListener: vi.fn<() => void>(),
        removeEventListener: vi.fn<() => void>(),
        dispatchEvent: vi.fn<() => boolean>(),
      }) as unknown as MediaQueryList,
  ),
});

const NBSP = ' ';

function makeSnapshot(overrides: Partial<TickerSnapshot> = {}): TickerSnapshot {
  return {
    importId: 'import-1',
    importedAt: '2026-01-01T00:00:00.000Z',
    filename: 'test.csv',
    atuacao: 'Financeiro',
    quantidadeTotalAcoes: 1000000000,
    lucroLiquidoEstimado: 5000000000,
    plMedio10Anos: 10,
    desvioPLMedia: 0,
    cagrLucros5Anos: 10,
    dividaLiquidaEbitda: 2,
    payoutEsperado: 50,
    precoTeto: 30,
    frequenciaAnuncios: 'Trimestral',
    mesesAnunciosDividendos: 'mar, jun, set, dez',
    ultimaAtualizacao: '01/01/2026',
    ...overrides,
  };
}

describe('ImportDiffDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  function mountDialog(props: { visible: boolean; updatedCodigos: string[] }) {
    return mount(ImportDiffDialog, {
      props,
      global: { plugins: [getActivePinia()!, [PrimeVue, { theme: { preset: Aura } }]] },
      attachTo: document.body,
    });
  }

  it('renders the dialog header', async () => {
    mountDialog({ visible: true, updatedCodigos: [] });
    await new Promise((r) => setTimeout(r, 0));
    expect(document.body.innerHTML).toContain('Atualizações da Importação');
  });

  it('shows "Sem atualizações" when updatedCodigos is empty', async () => {
    mountDialog({ visible: true, updatedCodigos: [] });
    await new Promise((r) => setTimeout(r, 0));
    expect(document.body.innerHTML).toContain('Sem atualizações');
  });

  it('shows "Sem atualizações" on first import where all tickers are new', async () => {
    const store = useTickerStore();
    store.upsertTicker('ITUB3', 'Itaú', makeSnapshot({ precoTeto: 30 }), 25);
    // updatedCodigos is empty because ITUB3 has only one snapshot (new ticker)
    mountDialog({ visible: true, updatedCodigos: [] });
    await new Promise((r) => setTimeout(r, 0));
    expect(document.body.innerHTML).toContain('Sem atualizações');
  });

  it('shows one section per updated ticker', async () => {
    const store = useTickerStore();
    store.upsertTicker('ITUB3', 'Itaú', makeSnapshot({ importId: 'i1', precoTeto: 30 }), 25);
    store.upsertTicker('ITUB3', 'Itaú', makeSnapshot({ importId: 'i2', precoTeto: 31 }), 25);
    store.upsertTicker(
      'KLBN4',
      'Klabin',
      makeSnapshot({ importId: 'i1', cagrLucros5Anos: 10 }),
      15,
    );
    store.upsertTicker(
      'KLBN4',
      'Klabin',
      makeSnapshot({ importId: 'i2', cagrLucros5Anos: 12 }),
      15,
    );

    mountDialog({ visible: true, updatedCodigos: ['ITUB3', 'KLBN4'] });
    await new Promise((r) => setTimeout(r, 0));

    expect(document.body.innerHTML).toContain('ITUB3');
    expect(document.body.innerHTML).toContain('KLBN4');
    expect(document.querySelector('[data-testid="ticker-diff-ITUB3"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="ticker-diff-KLBN4"]')).not.toBeNull();
  });

  it('shows the changed field with correct label, old and new values', async () => {
    const store = useTickerStore();
    store.upsertTicker('ITUB3', 'Itaú', makeSnapshot({ importId: 'i1', precoTeto: 30 }), 25);
    store.upsertTicker('ITUB3', 'Itaú', makeSnapshot({ importId: 'i2', precoTeto: 31 }), 25);

    mountDialog({ visible: true, updatedCodigos: ['ITUB3'] });
    await new Promise((r) => setTimeout(r, 0));

    const diffTable = document.querySelector('[data-test-import-diff]');
    expect(diffTable).not.toBeNull();
    const text = (diffTable!.textContent ?? '').replace(new RegExp(NBSP, 'g'), ' ');
    expect(text).toContain('Preço Teto');
    expect(text).toContain('R$ 30,00');
    expect(text).toContain('R$ 31,00');
  });

  it('applies good tone and ↑ arrow for a favorable increase (precoTeto up)', async () => {
    const store = useTickerStore();
    store.upsertTicker('ITUB3', 'Itaú', makeSnapshot({ importId: 'i1', precoTeto: 30 }), 25);
    store.upsertTicker('ITUB3', 'Itaú', makeSnapshot({ importId: 'i2', precoTeto: 31 }), 25);

    mountDialog({ visible: true, updatedCodigos: ['ITUB3'] });
    await new Promise((r) => setTimeout(r, 0));

    const diffTable = document.querySelector('[data-test-import-diff]');
    const tones = Array.from(diffTable!.querySelectorAll('[data-test-diff-tone]'));
    const precoTetoCell = tones.find((el) =>
      (el.textContent ?? '').replace(new RegExp(NBSP, 'g'), ' ').includes('R$ 31,00'),
    );
    expect(precoTetoCell?.getAttribute('data-test-diff-tone')).toBe('good');
    expect(precoTetoCell?.textContent).toContain('↑');
  });

  it('applies bad tone and ↑ arrow for an unfavorable increase (dividaLiquidaEbitda up)', async () => {
    const store = useTickerStore();
    store.upsertTicker(
      'ITUB3',
      'Itaú',
      makeSnapshot({ importId: 'i1', dividaLiquidaEbitda: 2 }),
      25,
    );
    store.upsertTicker(
      'ITUB3',
      'Itaú',
      makeSnapshot({ importId: 'i2', dividaLiquidaEbitda: 3 }),
      25,
    );

    mountDialog({ visible: true, updatedCodigos: ['ITUB3'] });
    await new Promise((r) => setTimeout(r, 0));

    const diffTable = document.querySelector('[data-test-import-diff]');
    const tones = Array.from(diffTable!.querySelectorAll('[data-test-diff-tone]'));
    const cell = tones.find((el) =>
      (el.textContent ?? '').replace(new RegExp(NBSP, 'g'), ' ').trim().startsWith('3'),
    );
    expect(cell?.getAttribute('data-test-diff-tone')).toBe('bad');
    expect(cell?.textContent).toContain('↑');
  });

  it('applies good tone and ↓ arrow for a favorable decrease (dividaLiquidaEbitda down)', async () => {
    const store = useTickerStore();
    store.upsertTicker(
      'ITUB3',
      'Itaú',
      makeSnapshot({ importId: 'i1', dividaLiquidaEbitda: 3 }),
      25,
    );
    store.upsertTicker(
      'ITUB3',
      'Itaú',
      makeSnapshot({ importId: 'i2', dividaLiquidaEbitda: 2 }),
      25,
    );

    mountDialog({ visible: true, updatedCodigos: ['ITUB3'] });
    await new Promise((r) => setTimeout(r, 0));

    const diffTable = document.querySelector('[data-test-import-diff]');
    const tones = Array.from(diffTable!.querySelectorAll('[data-test-diff-tone]'));
    const cell = tones.find((el) =>
      (el.textContent ?? '').replace(new RegExp(NBSP, 'g'), ' ').trim().startsWith('2'),
    );
    expect(cell?.getAttribute('data-test-diff-tone')).toBe('good');
    expect(cell?.textContent).toContain('↓');
  });

  it('applies bad tone and ↓ arrow for an unfavorable decrease (cagrLucros5Anos down)', async () => {
    const store = useTickerStore();
    store.upsertTicker(
      'KLBN4',
      'Klabin',
      makeSnapshot({ importId: 'i1', cagrLucros5Anos: 12 }),
      15,
    );
    store.upsertTicker(
      'KLBN4',
      'Klabin',
      makeSnapshot({ importId: 'i2', cagrLucros5Anos: 10 }),
      15,
    );

    mountDialog({ visible: true, updatedCodigos: ['KLBN4'] });
    await new Promise((r) => setTimeout(r, 0));

    const diffTable = document.querySelector('[data-test-import-diff]');
    const tones = Array.from(diffTable!.querySelectorAll('[data-test-diff-tone]'));
    const cell = tones.find((el) =>
      (el.textContent ?? '').replace(new RegExp(NBSP, 'g'), ' ').includes('10%'),
    );
    expect(cell?.getAttribute('data-test-diff-tone')).toBe('bad');
    expect(cell?.textContent).toContain('↓');
  });

  it('shows a ticker with exactly two snapshots (minimum valid diff state)', async () => {
    const store = useTickerStore();
    store.upsertTicker('ITUB3', 'Itaú', makeSnapshot({ importId: 'i1', precoTeto: 30 }), 25);
    store.upsertTicker('ITUB3', 'Itaú', makeSnapshot({ importId: 'i2', precoTeto: 35 }), 25);

    mountDialog({ visible: true, updatedCodigos: ['ITUB3'] });
    await new Promise((r) => setTimeout(r, 0));

    expect(document.querySelector('[data-test-import-diff]')).not.toBeNull();
    expect(document.querySelector('[data-testid="no-changes-message"]')).toBeNull();
  });
});
