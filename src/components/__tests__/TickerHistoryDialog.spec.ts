// src/components/__tests__/TickerHistoryDialog.spec.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import TickerHistoryDialog from '../TickerHistoryDialog.vue';
import type { Ticker } from '@/types/stock';

const mockTicker: Ticker = {
  codigo: 'KLBN11',
  empresaNome: 'Klabin',
  status: 'active',
  cotacaoAtual: 18.76,
  history: [
    {
      importId: 'import-1',
      importedAt: '2026-01-01T00:00:00.000Z',
      filename: 'jan.csv',
      atuacao: 'Papel e Celulose',
      quantidadeTotalAcoes: 1244049145,
      lucroLiquidoEstimado: 8000000000,
      plMedio10Anos: 9.6,
      desvioPLMedia: -69.6,
      cagrLucros5Anos: 10.5,
      dividaLiquidaEbitda: 3.7,
      payoutEsperado: 15,
      dividendYieldBruto: 5.1,
      precoTeto: 22,
      frequenciaAnuncios: 'Trimestral',
      mesesAnunciosDividendos: 'fev, mai, ago, nov',
      ultimaAtualizacao: '18/04/2026',
    },
  ],
};

describe('TickerHistoryDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders dialog header with ticker code when visible', async () => {
    mount(TickerHistoryDialog, {
      props: { visible: true, ticker: mockTicker },
      global: { plugins: [createPinia(), [PrimeVue, { theme: { preset: Aura } }]] },
      attachTo: document.body,
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(document.body.innerHTML).toContain('KLBN11');
  });

  it('passes ticker prop through to template', async () => {
    const wrapper = mount(TickerHistoryDialog, {
      props: { visible: true, ticker: mockTicker },
      global: { plugins: [createPinia(), [PrimeVue, { theme: { preset: Aura } }]] },
      attachTo: document.body,
    });
    expect(wrapper.props('ticker')).toEqual(mockTicker);
  });

  it('renders the diff between the last two snapshots', async () => {
    const mockTickerWithDiff: Ticker = {
      codigo: 'KLBN11',
      empresaNome: 'Klabin',
      status: 'active',
      cotacaoAtual: 18.76,
      history: [
        {
          importId: 'import-1',
          importedAt: '2026-01-01T00:00:00.000Z',
          filename: 'jan.csv',
          atuacao: 'Papel e Celulose',
          quantidadeTotalAcoes: 1244049145,
          lucroLiquidoEstimado: 8000000000,
          plMedio10Anos: 9.6,
          desvioPLMedia: -69.6,
          cagrLucros5Anos: 10.5,
          dividaLiquidaEbitda: 3.7,
          payoutEsperado: 15,
          dividendYieldBruto: 5.1,
          precoTeto: 22,
          frequenciaAnuncios: 'Trimestral',
          mesesAnunciosDividendos: 'fev, mai, ago, nov',
          ultimaAtualizacao: '18/04/2026',
        },
        {
          importId: 'import-2',
          importedAt: '2026-02-01T00:00:00.000Z',
          filename: 'feb.csv',
          atuacao: 'Papel e Celulose',
          quantidadeTotalAcoes: 1244049146,
          lucroLiquidoEstimado: 8000000000,
          plMedio10Anos: 9.6,
          desvioPLMedia: -69.6,
          cagrLucros5Anos: 10.5,
          dividaLiquidaEbitda: 3.7,
          payoutEsperado: 15,
          dividendYieldBruto: 5.1,
          precoTeto: 28,
          frequenciaAnuncios: 'Trimestral',
          mesesAnunciosDividendos: 'fev, mai, ago, nov',
          ultimaAtualizacao: '18/04/2026',
        },
      ],
    };
    mount(TickerHistoryDialog, {
      props: { visible: true, ticker: mockTickerWithDiff },
      global: { plugins: [createPinia(), [PrimeVue, { theme: { preset: Aura } }]] },
      attachTo: document.body,
    });
    await new Promise((r) => setTimeout(r, 0));

    const diffTable = document.querySelector('[data-test-snapshot-diff]');
    expect(diffTable).not.toBeNull();
    const diffText = (diffTable!.textContent ?? '').replace(/ /g, ' ');
    expect(diffText).toContain('Preço Teto');
    expect(diffText).toContain('R$ 22,00');
    expect(diffText).toContain('R$ 28,00');
    expect(diffText).toContain('Qtd. Ações');
    expect(diffText).toContain('1.244.049.145');
    expect(diffText).toContain('1.244.049.146');
  });

  it('does not render the diff section when only one snapshot exists', async () => {
    mount(TickerHistoryDialog, {
      props: { visible: true, ticker: mockTicker },
      global: { plugins: [createPinia(), [PrimeVue, { theme: { preset: Aura } }]] },
      attachTo: document.body,
    });
    await new Promise((r) => setTimeout(r, 0));

    expect(document.querySelector('[data-test-snapshot-diff]')).toBeNull();
  });
});
