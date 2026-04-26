import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { FilterMatchMode, FilterOperator } from '@primevue/core/api';
import {
  STOCK_FILTERABLE_COLUMNS,
  STOCK_TOGGLEABLE_COLUMNS,
  buildDefaultStockTableFilters,
  useConfigStore,
} from '../configStore';

describe('useConfigStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('defaults to every toggleable column visible', () => {
    const store = useConfigStore();
    expect(store.stockTableVisibleColumns).toEqual(STOCK_TOGGLEABLE_COLUMNS.map((c) => c.field));
    for (const col of STOCK_TOGGLEABLE_COLUMNS) {
      expect(store.isStockColumnVisible(col.field)).toBe(true);
    }
  });

  it('setStockTableVisibleColumns updates visibility', () => {
    const store = useConfigStore();
    store.setStockTableVisibleColumns(['status', 'atuacao']);
    expect(store.stockTableVisibleColumns).toEqual(['status', 'atuacao']);
    expect(store.isStockColumnVisible('status')).toBe(true);
    expect(store.isStockColumnVisible('atuacao')).toBe(true);
    expect(store.isStockColumnVisible('plProjetado')).toBe(false);
  });

  it('setStockTableVisibleColumns accepts an empty list', () => {
    const store = useConfigStore();
    store.setStockTableVisibleColumns([]);
    expect(store.stockTableVisibleColumns).toEqual([]);
    for (const col of STOCK_TOGGLEABLE_COLUMNS) {
      expect(store.isStockColumnVisible(col.field)).toBe(false);
    }
  });

  it('brapiApiKey defaults to empty and isBrapiConfigured is false', () => {
    const store = useConfigStore();
    expect(store.brapiApiKey).toBe('');
    expect(store.isBrapiConfigured).toBe(false);
  });

  it('setBrapiApiKey trims whitespace and toggles isBrapiConfigured', () => {
    const store = useConfigStore();
    store.setBrapiApiKey('  abc123  ');
    expect(store.brapiApiKey).toBe('abc123');
    expect(store.isBrapiConfigured).toBe(true);
  });

  it('setBrapiApiKey with empty or whitespace-only string clears configuration', () => {
    const store = useConfigStore();
    store.setBrapiApiKey('abc');
    expect(store.isBrapiConfigured).toBe(true);
    store.setBrapiApiKey('   ');
    expect(store.brapiApiKey).toBe('');
    expect(store.isBrapiConfigured).toBe(false);
  });

  it('defaults stockTableSortField/Order to empresaNome ascending', () => {
    const store = useConfigStore();
    expect(store.stockTableSortField).toBe('empresaNome');
    expect(store.stockTableSortOrder).toBe(1);
  });

  it('setStockTableSort updates both field and order', () => {
    const store = useConfigStore();
    store.setStockTableSort('cotacaoAtual', -1);
    expect(store.stockTableSortField).toBe('cotacaoAtual');
    expect(store.stockTableSortOrder).toBe(-1);
    store.setStockTableSort('precoTeto', undefined);
    expect(store.stockTableSortField).toBe('precoTeto');
    expect(store.stockTableSortOrder).toBeUndefined();
  });

  it('builds default filters with one constraint per filterable column', () => {
    const filters = buildDefaultStockTableFilters();
    for (const col of STOCK_FILTERABLE_COLUMNS) {
      const meta = filters[col.field];
      expect(meta).toBeDefined();
      const operatorMeta = meta as {
        operator: string;
        constraints: Array<{ value: unknown; matchMode: string }>;
      };
      expect(operatorMeta.operator).toBe(FilterOperator.AND);
      expect(operatorMeta.constraints).toHaveLength(1);
      expect(operatorMeta.constraints[0]?.value).toBeNull();
      const expectedMode =
        col.kind === 'numeric'
          ? FilterMatchMode.GREATER_THAN
          : col.kind === 'enum'
            ? FilterMatchMode.EQUALS
            : FilterMatchMode.STARTS_WITH;
      expect(operatorMeta.constraints[0]?.matchMode).toBe(expectedMode);
    }
  });

  it('store defaults stockTableFilters to the built defaults', () => {
    const store = useConfigStore();
    expect(Object.keys(store.stockTableFilters).sort()).toEqual(
      STOCK_FILTERABLE_COLUMNS.map((c) => c.field).sort(),
    );
  });

  it('setStockTableFilters replaces filters; resetStockTableFilters restores defaults', () => {
    const store = useConfigStore();
    store.setStockTableFilters({
      codigo: {
        operator: FilterOperator.AND,
        constraints: [{ value: 'PETR', matchMode: FilterMatchMode.STARTS_WITH }],
      },
    });
    expect(Object.keys(store.stockTableFilters)).toEqual(['codigo']);

    store.resetStockTableFilters();
    expect(Object.keys(store.stockTableFilters).sort()).toEqual(
      STOCK_FILTERABLE_COLUMNS.map((c) => c.field).sort(),
    );
  });
});
