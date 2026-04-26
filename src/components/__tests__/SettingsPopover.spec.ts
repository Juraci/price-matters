import { describe, it, expect, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia, getActivePinia } from 'pinia';
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import SettingsPopover from '../SettingsPopover.vue';
import { useConfigStore } from '@/stores/configStore';

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
});
