import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { STOCK_TOGGLEABLE_COLUMNS, useConfigStore } from '../configStore'

describe('useConfigStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('defaults to every toggleable column visible', () => {
    const store = useConfigStore()
    expect(store.stockTableVisibleColumns).toEqual(
      STOCK_TOGGLEABLE_COLUMNS.map((c) => c.field),
    )
    for (const col of STOCK_TOGGLEABLE_COLUMNS) {
      expect(store.isStockColumnVisible(col.field)).toBe(true)
    }
  })

  it('setStockTableVisibleColumns updates visibility', () => {
    const store = useConfigStore()
    store.setStockTableVisibleColumns(['status', 'atuacao'])
    expect(store.stockTableVisibleColumns).toEqual(['status', 'atuacao'])
    expect(store.isStockColumnVisible('status')).toBe(true)
    expect(store.isStockColumnVisible('atuacao')).toBe(true)
    expect(store.isStockColumnVisible('plProjetado')).toBe(false)
  })

  it('setStockTableVisibleColumns accepts an empty list', () => {
    const store = useConfigStore()
    store.setStockTableVisibleColumns([])
    expect(store.stockTableVisibleColumns).toEqual([])
    for (const col of STOCK_TOGGLEABLE_COLUMNS) {
      expect(store.isStockColumnVisible(col.field)).toBe(false)
    }
  })

  it('brapiApiKey defaults to empty and isBrapiConfigured is false', () => {
    const store = useConfigStore()
    expect(store.brapiApiKey).toBe('')
    expect(store.isBrapiConfigured).toBe(false)
  })

  it('setBrapiApiKey trims whitespace and toggles isBrapiConfigured', () => {
    const store = useConfigStore()
    store.setBrapiApiKey('  abc123  ')
    expect(store.brapiApiKey).toBe('abc123')
    expect(store.isBrapiConfigured).toBe(true)
  })

  it('setBrapiApiKey with empty or whitespace-only string clears configuration', () => {
    const store = useConfigStore()
    store.setBrapiApiKey('abc')
    expect(store.isBrapiConfigured).toBe(true)
    store.setBrapiApiKey('   ')
    expect(store.brapiApiKey).toBe('')
    expect(store.isBrapiConfigured).toBe(false)
  })
})
