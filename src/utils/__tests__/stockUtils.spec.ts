import { describe, it, expect } from 'vitest';
import { computeDerived, slugify, snapshotsDiffer, getDiff } from '../stockUtils';
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

describe('slugify', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(slugify('Banco Mercantil')).toBe('banco-mercantil');
  });

  it('strips accents (NFD normalization)', () => {
    expect(slugify('Oléo e Gás')).toBe('oleo-e-gas');
  });

  it('strips non-alphanumeric characters', () => {
    expect(slugify('Banco S.A.')).toBe('banco-sa');
  });

  it('same slug for same name across calls', () => {
    expect(slugify('Klabin')).toBe(slugify('Klabin'));
  });
});

describe('snapshotsDiffer', () => {
  it('returns false for two identical snapshots', () => {
    const s = makeSnapshot();
    expect(snapshotsDiffer(s, { ...s })).toBe(false);
  });

  it('returns true when precoTeto differs', () => {
    const a = makeSnapshot({ precoTeto: 12 });
    const b = makeSnapshot({ precoTeto: 14 });
    expect(snapshotsDiffer(a, b)).toBe(true);
  });

  it('returns true when dividendYieldBruto differs', () => {
    const a = makeSnapshot({ dividendYieldBruto: 5 });
    const b = makeSnapshot({ dividendYieldBruto: 6 });
    expect(snapshotsDiffer(a, b)).toBe(true);
  });

  it('returns true when quantidadeTotalAcoes differs', () => {
    const a = makeSnapshot({ quantidadeTotalAcoes: 100000 });
    const b = makeSnapshot({ quantidadeTotalAcoes: 110000 });
    expect(snapshotsDiffer(a, b)).toBe(true);
  });

  it('returns false when only importId and importedAt differ (metadata)', () => {
    const a = makeSnapshot({ importId: 'import-1', importedAt: '2026-01-01T00:00:00.000Z' });
    const b = makeSnapshot({ importId: 'import-2', importedAt: '2026-02-01T00:00:00.000Z' });
    expect(snapshotsDiffer(a, b)).toBe(false);
  });
});

describe('getDiff', () => {
  it('returns the differences between two snapshots', () => {
    const a = makeSnapshot({ quantidadeTotalAcoes: 100000 });
    const b = makeSnapshot({ quantidadeTotalAcoes: 110000 });
    expect(getDiff(a, b)).toEqual([
      { type: 'CHANGE', path: ['quantidadeTotalAcoes'], value: 110000, oldValue: 100000 },
    ]);
  });
});

describe('computeDerived', () => {
  it('margemSeguranca = (1 - cotacao/precoTeto) * 100', () => {
    const d = computeDerived(makeSnapshot({ precoTeto: 81 }), 62.21);
    expect(d.margemSeguranca).toBeCloseTo(23.1975, 3);
  });

  it('lucroPorAcaoEstimado = lucro / quantidade', () => {
    const d = computeDerived(
      makeSnapshot({ lucroLiquidoEstimado: 200000, quantidadeTotalAcoes: 100000 }),
      10,
    );
    expect(d.lucroPorAcaoEstimado).toBe(2);
  });

  it('plProjetado = cotacao / lpa', () => {
    const d = computeDerived(
      makeSnapshot({ lucroLiquidoEstimado: 200000, quantidadeTotalAcoes: 100000 }),
      20,
    );
    expect(d.plProjetado).toBe(10);
  });

  it('dividendoPorAcaoBruto = (payout/100) * lpa', () => {
    const d = computeDerived(
      makeSnapshot({
        payoutEsperado: 50,
        lucroLiquidoEstimado: 200000,
        quantidadeTotalAcoes: 100000,
      }),
      10,
    );
    expect(d.dividendoPorAcaoBruto).toBe(1);
  });

  it('valorDeMercado = quantidade * cotacao', () => {
    const d = computeDerived(makeSnapshot({ quantidadeTotalAcoes: 1000 }), 25);
    expect(d.valorDeMercado).toBe(25000);
  });

  it('returns 0 for margemSeguranca when precoTeto is 0', () => {
    const d = computeDerived(makeSnapshot({ precoTeto: 0 }), 10);
    expect(d.margemSeguranca).toBe(0);
  });

  it('returns 0 for lucroPorAcaoEstimado and plProjetado when quantidadeTotalAcoes is 0', () => {
    const d = computeDerived(
      makeSnapshot({ quantidadeTotalAcoes: 0, lucroLiquidoEstimado: 100 }),
      10,
    );
    expect(d.lucroPorAcaoEstimado).toBe(0);
    expect(d.plProjetado).toBe(0);
  });
});
