import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ImportBatch } from '@/types/stock'
import { parseCsv } from '@/utils/csvParser'
import { useEmpresaStore } from '@/stores/empresaStore'
import { useTickerStore } from '@/stores/tickerStore'

export const useImportStore = defineStore(
  'import',
  () => {
    const batches = ref<ImportBatch[]>([])

    // Throws if the CSV content has no valid header row (propagated from parseCsv).
    async function importCsv(file: File): Promise<ImportBatch> {
      const content = await file.text()
      const importId = crypto.randomUUID()
      const importedAt = new Date().toISOString()

      const rows = parseCsv(content, importId, file.name, importedAt)

      const empresaStore = useEmpresaStore()
      const tickerStore = useTickerStore()

      const stats = {
        newEmpresas: 0,
        newTickers: 0,
        updatedTickers: 0,
        removedTickers: 0,
        unchangedTickers: 0,
      }
      const importedCodigos = new Set<string>()

      for (const row of rows) {
        if (!empresaStore.hasEmpresa(row.empresa)) stats.newEmpresas++
        empresaStore.ensureEmpresa(row.empresa, row.codigo)

        importedCodigos.add(row.codigo)
        const result = tickerStore.upsertTicker(
          row.codigo,
          row.empresa,
          row.snapshot,
          row.cotacaoAtual,
        )

        if (result === 'new') stats.newTickers++
        else if (result === 'updated') stats.updatedTickers++
        else stats.unchangedTickers++
      }

      stats.removedTickers = tickerStore.markRemovedIfNotIn(importedCodigos)

      const batch: ImportBatch = {
        id: importId,
        filename: file.name,
        importedAt,
        rowCount: rows.length,
        stats,
      }
      batches.value.push(batch)
      return batch
    }

    // Only clears import batches. Callers must also call empresaStore.reset() and tickerStore.reset().
    function reset(): void {
      batches.value = []
    }

    return { batches, importCsv, reset }
  },
  { persist: true },
)
