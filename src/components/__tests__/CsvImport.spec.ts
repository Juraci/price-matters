// src/components/__tests__/CsvImport.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import CsvImport from '../CsvImport.vue'
import { useImportStore } from '@/stores/importStore'

function mountComponent() {
  return mount(CsvImport, {
    global: {
      plugins: [createPinia(), [PrimeVue, { theme: { preset: Aura } }]],
    },
  })
}

describe('CsvImport', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders the import button', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('[data-testid="import-button"]').exists()).toBe(true)
  })

  it('has a hidden file input that accepts .csv', () => {
    const wrapper = mountComponent()
    const input = wrapper.find('input[type="file"]')
    expect(input.exists()).toBe(true)
    expect(input.attributes('accept')).toBe('.csv')
    expect(input.attributes('style')).toContain('display: none')
  })

  it('does not show reset button when no data has been imported', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('[data-testid="reset-button"]').exists()).toBe(false)
  })

  it('does not show success message initially', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('[data-testid="import-success"]').exists()).toBe(false)
  })

  it('shows reset button when import store has batches', async () => {
    const wrapper = mountComponent()
    const importStore = useImportStore()
    importStore.batches.push({
      id: 'b1',
      filename: 'test.csv',
      importedAt: '2026-01-01T00:00:00.000Z',
      rowCount: 3,
      stats: { newEmpresas: 1, newTickers: 3, updatedTickers: 0, removedTickers: 0, unchangedTickers: 0 },
    })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="reset-button"]').exists()).toBe(true)
  })

  it('shows error message when errorMessage is set', async () => {
    const wrapper = mountComponent()
    const importStore = useImportStore()
    vi.spyOn(importStore, 'importCsv').mockRejectedValue(new Error('CSV header row not found'))

    const fileInput = wrapper.find('input[type="file"]')
    const file = new File(['invalid'], 'bad.csv', { type: 'text/csv' })
    Object.defineProperty(fileInput.element, 'files', {
      value: { 0: file, length: 1 },
      configurable: true,
    })
    await fileInput.trigger('change')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('CSV header row not found')
  })
})
