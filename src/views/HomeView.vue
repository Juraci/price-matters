<!-- src/views/HomeView.vue -->
<script setup lang="ts">
import CsvImport from '@/components/CsvImport.vue'
import StockDataTable from '@/components/StockDataTable.vue'
</script>

<template>
  <main class="p-4 flex flex-col gap-4">
    <h1 class="text-2xl font-bold m-0">Price Matters</h1>
    <CsvImport />
    <StockDataTable />
  </main>
</template>
