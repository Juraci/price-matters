<script setup lang="ts">
import { computed } from 'vue';
import Button from 'primevue/button';
import Tag from 'primevue/tag';

const props = defineProps<{
  lastFetchedAt: string | null;
  isFetching: boolean;
  lastError: string | null;
}>();

defineEmits<{ refresh: [] }>();

const lastFetchedLabel = computed(() => {
  if (!props.lastFetchedAt) return 'Nunca atualizado';
  const d = new Date(props.lastFetchedAt);
  return `Atualizado às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
});
</script>

<template>
  <div class="live-quotes-controls" data-testid="live-quotes-controls">
    <Button
      icon="pi pi-refresh"
      label="Atualizar cotações"
      size="small"
      :loading="isFetching"
      data-testid="live-quotes-refresh"
      @click="$emit('refresh')"
    />

    <span class="last-fetched" data-testid="live-quotes-status">
      {{ lastFetchedLabel }}
    </span>

    <Tag
      v-if="lastError"
      severity="danger"
      value="Erro"
      data-testid="live-quotes-error"
      :title="lastError"
    />
  </div>
</template>

<style scoped>
.live-quotes-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.last-fetched {
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
}
</style>
