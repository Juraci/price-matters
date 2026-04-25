<script setup lang="ts">
import { ref } from 'vue'
import Button from 'primevue/button'
import Popover from 'primevue/popover'
import Password from 'primevue/password'
import { useConfigStore } from '@/stores/configStore'

const configStore = useConfigStore()

const popover = ref<InstanceType<typeof Popover> | null>(null)
const apiKeyInput = ref<string>('')

function toggle(event: Event): void {
  apiKeyInput.value = configStore.brapiApiKey
  popover.value?.toggle(event)
}

function save(): void {
  configStore.setBrapiApiKey(apiKeyInput.value)
  popover.value?.hide()
}

function clear(): void {
  apiKeyInput.value = ''
  configStore.setBrapiApiKey('')
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

    <Popover ref="popover" data-testid="settings-popover">
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

        <div class="actions">
          <Button
            label="Limpar"
            severity="secondary"
            text
            size="small"
            data-testid="settings-clear"
            @click="clear"
          />
          <Button
            label="Salvar"
            size="small"
            data-testid="settings-save"
            @click="save"
          />
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

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
