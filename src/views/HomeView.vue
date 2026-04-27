<!-- src/views/HomeView.vue -->
<script setup lang="ts">
import CsvImport from '@/components/CsvImport.vue';
import StockDataTable from '@/components/StockDataTable.vue';
</script>

<template>
  <main class="home-view">
    <h1 class="home-title">Price Matters</h1>
    <CsvImport />
    <StockDataTable />
  </main>
</template>

<style scoped>
.home-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
}

.home-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

@media (max-width: 768px) {
  .home-view {
    padding: 0.5rem;
    gap: 0.75rem;
    max-width: 100%;
    min-width: 0;
  }
  .home-view > * {
    min-width: 0;
    max-width: 100%;
  }
  .home-title {
    font-size: 1.25rem;
  }
}
</style>
