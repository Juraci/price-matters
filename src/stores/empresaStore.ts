import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Empresa } from '@/types/stock'
import { slugify } from '@/utils/stockUtils'

export const useEmpresaStore = defineStore(
  'empresa',
  () => {
    const empresas = ref<Record<string, Empresa>>({})

    function ensureEmpresa(nome: string, codigo: string): void {
      const id = slugify(nome)
      if (!empresas.value[id]) {
        empresas.value[id] = {
          id,
          nome,
          codigos: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      }
      const empresa = empresas.value[id]!
      if (!empresa.codigos.includes(codigo)) {
        empresa.codigos.push(codigo)
        empresa.updatedAt = new Date().toISOString()
      }
    }

    function hasEmpresa(nome: string): boolean {
      return slugify(nome) in empresas.value
    }

    const allEmpresas = computed(() => Object.values(empresas.value))

    function reset(): void {
      empresas.value = {}
    }

    return { empresas, ensureEmpresa, hasEmpresa, allEmpresas, reset }
  },
  { persist: true },
)
