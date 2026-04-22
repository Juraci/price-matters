// src/components/__tests__/CsvImport.spec.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import CsvImport from '../CsvImport.vue'

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
})
