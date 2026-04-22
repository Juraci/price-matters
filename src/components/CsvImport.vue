<!-- src/components/CsvImport.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import { useImportStore } from '@/stores/importStore'
import { useEmpresaStore } from '@/stores/empresaStore'
import { useTickerStore } from '@/stores/tickerStore'
import type { ImportBatch } from '@/types/stock'

const importStore = useImportStore()
const empresaStore = useEmpresaStore()
const tickerStore = useTickerStore()

const fileInputRef = ref<HTMLInputElement | null>(null)
const importing = ref(false)
const errorMessage = ref('')
const lastBatch = ref<ImportBatch | null>(null)

const hasData = computed(() => importStore.batches.length > 0)

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  importing.value = true
  errorMessage.value = ''
  lastBatch.value = null
  try {
    lastBatch.value = await importStore.importCsv(file)
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Erro ao importar arquivo'
  } finally {
    importing.value = false
    input.value = ''
  }
}

function handleReset() {
  importStore.reset()
  empresaStore.reset()
  tickerStore.reset()
  lastBatch.value = null
}
</script>

<template>
  <div class="csv-import flex flex-col gap-3">
    <div class="flex gap-2 align-items-center">
      <input
        ref="fileInputRef"
        type="file"
        accept=".csv"
        style="display: none"
        @change="handleFileChange"
      />
      <Button
        data-testid="import-button"
        label="Importar CSV"
        icon="pi pi-upload"
        :loading="importing"
        @click="fileInputRef?.click()"
      />
      <Button
        v-if="hasData"
        data-testid="reset-button"
        label="Limpar dados"
        icon="pi pi-trash"
        severity="danger"
        outlined
        @click="handleReset"
      />
    </div>

    <div
      v-if="lastBatch"
      data-testid="import-success"
      class="flex gap-2 align-items-center flex-wrap"
    >
      <Tag severity="success" value="Importado com sucesso" />
      <span class="text-sm text-color-secondary">{{ lastBatch.filename }}</span>
      <Tag :value="`${lastBatch.stats.newTickers} novos`" severity="info" />
      <Tag
        v-if="lastBatch.stats.updatedTickers > 0"
        :value="`${lastBatch.stats.updatedTickers} atualizados`"
        severity="warn"
      />
      <Tag
        v-if="lastBatch.stats.removedTickers > 0"
        :value="`${lastBatch.stats.removedTickers} removidos`"
        severity="danger"
      />
      <Tag
        v-if="lastBatch.stats.unchangedTickers > 0"
        :value="`${lastBatch.stats.unchangedTickers} sem alteração`"
        severity="secondary"
      />
    </div>

    <Message v-if="errorMessage" severity="error">{{ errorMessage }}</Message>
  </div>
</template>
