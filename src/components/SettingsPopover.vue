<script setup lang="ts">
import { ref } from 'vue';
import Button from 'primevue/button';
import Popover from 'primevue/popover';
import Drawer from 'primevue/drawer';
import Password from 'primevue/password';
import InputText from 'primevue/inputtext';
import {
  isValidTickerFilterFormat,
  parseTickerFilterInput,
  useConfigStore,
} from '@/stores/configStore';
import { useTickerStore } from '@/stores/tickerStore';
import { useIsMobile } from '@/composables/useIsMobile';

const configStore = useConfigStore();
const tickerStore = useTickerStore();
const { isMobile } = useIsMobile();

const popover = ref<InstanceType<typeof Popover> | null>(null);
const drawerVisible = ref(false);
const apiKeyInput = ref<string>('');
const tickerFilterInput = ref<string>('');
const missingCodigos = ref<string[]>([]);
const formatError = ref<boolean>(false);

function toggle(event: Event): void {
  apiKeyInput.value = configStore.brapiApiKey;
  tickerFilterInput.value = configStore.tickerFilter.join(', ');
  missingCodigos.value = [];
  formatError.value = false;
  if (isMobile.value) {
    drawerVisible.value = true;
  } else {
    popover.value?.toggle(event);
  }
}

function validateFormat(): void {
  formatError.value = !isValidTickerFilterFormat(tickerFilterInput.value);
}

function onFilterInput(): void {
  formatError.value = false;
}

function save(): void {
  configStore.setBrapiApiKey(apiKeyInput.value);
  if (!isValidTickerFilterFormat(tickerFilterInput.value)) {
    formatError.value = true;
    return;
  }
  formatError.value = false;
  const parsed = parseTickerFilterInput(tickerFilterInput.value);
  missingCodigos.value = parsed.filter((codigo) => !tickerStore.tickers[codigo]);
  configStore.setTickerFilter(parsed);
  if (missingCodigos.value.length > 0) return;
  drawerVisible.value = false;
  popover.value?.hide();
}

function clear(): void {
  apiKeyInput.value = '';
  configStore.setBrapiApiKey('');
  tickerFilterInput.value = '';
  configStore.setTickerFilter([]);
  missingCodigos.value = [];
  formatError.value = false;
}
</script>

<template>
  <div class="settings-popover-wrapper">
    <Button
      icon="pi pi-cog"
      severity="secondary"
      text
      size="small"
      aria-label="Configurações"
      data-testid="settings-trigger"
      @click="toggle"
    />

    <Drawer
      v-if="isMobile"
      v-model:visible="drawerVisible"
      position="bottom"
      header="Configurações"
      data-testid="settings-drawer"
      :style="{ height: 'auto', maxHeight: '90vh' }"
    >
      <div class="settings-content settings-content-mobile">
        <div class="field">
          <label for="brapi-key-mobile">Brapi API Key</label>
          <Password
            id="brapi-key-mobile"
            v-model="apiKeyInput"
            :feedback="false"
            toggleMask
            fluid
            inputId="brapi-key-input"
          />
          <small class="help">
            Obtenha uma chave gratuita em
            <a href="https://brapi.dev" target="_blank" rel="noopener">brapi.dev</a>.
          </small>
        </div>

        <div class="field">
          <label for="ticker-filter-mobile">Filtro de tickers</label>
          <InputText
            id="ticker-filter-mobile"
            v-model="tickerFilterInput"
            placeholder="KLBN4, ITUB3"
            fluid
            data-testid="settings-ticker-filter"
            @blur="validateFormat"
            @input="onFilterInput"
          />
          <small class="help">
            Liste códigos separados por vírgula. Deixe vazio para mostrar todos.
          </small>
          <small v-if="formatError" class="error" data-testid="settings-ticker-filter-format-error">
            Formato inválido
          </small>
          <small
            v-else-if="missingCodigos.length > 0"
            class="error"
            data-testid="settings-ticker-filter-error"
          >
            Tickers não encontrados: {{ missingCodigos.join(', ') }}
          </small>
        </div>

        <div class="actions">
          <Button
            label="Limpar"
            severity="secondary"
            text
            size="small"
            data-testid="settings-clear"
            @click="clear"
          />
          <Button label="Salvar" size="small" data-testid="settings-save" @click="save" />
        </div>
      </div>
    </Drawer>

    <Popover v-else ref="popover" data-testid="settings-popover">
      <div class="settings-content">
        <h3 class="settings-title">Configurações</h3>

        <div class="field">
          <label for="brapi-key">Brapi API Key</label>
          <Password
            id="brapi-key"
            v-model="apiKeyInput"
            :feedback="false"
            toggleMask
            fluid
            inputId="brapi-key-input"
          />
          <small class="help">
            Obtenha uma chave gratuita em
            <a href="https://brapi.dev" target="_blank" rel="noopener">brapi.dev</a>.
          </small>
        </div>

        <div class="field">
          <label for="ticker-filter">Filtro de tickers</label>
          <InputText
            id="ticker-filter"
            v-model="tickerFilterInput"
            placeholder="KLBN4, ITUB3"
            fluid
            data-testid="settings-ticker-filter"
            @blur="validateFormat"
            @input="onFilterInput"
          />
          <small class="help">
            Liste códigos separados por vírgula. Deixe vazio para mostrar todos.
          </small>
          <small v-if="formatError" class="error" data-testid="settings-ticker-filter-format-error">
            Formato inválido
          </small>
          <small
            v-else-if="missingCodigos.length > 0"
            class="error"
            data-testid="settings-ticker-filter-error"
          >
            Tickers não encontrados: {{ missingCodigos.join(', ') }}
          </small>
        </div>

        <div class="actions">
          <Button
            label="Limpar"
            severity="secondary"
            text
            size="small"
            data-testid="settings-clear"
            @click="clear"
          />
          <Button label="Salvar" size="small" data-testid="settings-save" @click="save" />
        </div>
      </div>
    </Popover>
  </div>
</template>

<style scoped>
.settings-popover-wrapper {
  display: inline-flex;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 18rem;
}

.settings-content-mobile {
  min-width: 0;
  width: 100%;
}

.settings-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.field label {
  font-size: 0.85rem;
  font-weight: 500;
}

.help {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.error {
  font-size: 0.75rem;
  color: var(--p-red-500, #ef4444);
  font-weight: 500;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
