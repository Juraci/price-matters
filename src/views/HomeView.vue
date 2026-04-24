<!-- src/views/HomeView.vue -->
<script setup lang="ts">
import CsvImport from '@/components/CsvImport.vue'
import StockDataTable from '@/components/StockDataTable.vue'
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
</style>
