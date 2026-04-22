import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEmpresaStore } from '../empresaStore'

describe('useEmpresaStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('creates a new empresa on first call', () => {
    const store = useEmpresaStore()
    store.ensureEmpresa('Klabin', 'KLBN11')
    expect(store.allEmpresas).toHaveLength(1)
    expect(store.allEmpresas[0]!.nome).toBe('Klabin')
  })

  it('does not duplicate empresa for a second code of the same company', () => {
    const store = useEmpresaStore()
    store.ensureEmpresa('Klabin', 'KLBN11')
    store.ensureEmpresa('Klabin', 'KLBN4')
    expect(store.allEmpresas).toHaveLength(1)
    expect(store.allEmpresas[0]!.codigos).toEqual(['KLBN11', 'KLBN4'])
  })

  it('creates separate empresas for different names', () => {
    const store = useEmpresaStore()
    store.ensureEmpresa('Klabin', 'KLBN11')
    store.ensureEmpresa('Suzano', 'SUZB3')
    expect(store.allEmpresas).toHaveLength(2)
  })

  it('does not duplicate a codigo already registered', () => {
    const store = useEmpresaStore()
    store.ensureEmpresa('Klabin', 'KLBN11')
    store.ensureEmpresa('Klabin', 'KLBN11')
    expect(store.allEmpresas[0]!.codigos).toHaveLength(1)
  })

  it('hasEmpresa returns true for an existing empresa', () => {
    const store = useEmpresaStore()
    store.ensureEmpresa('Klabin', 'KLBN11')
    expect(store.hasEmpresa('Klabin')).toBe(true)
  })

  it('hasEmpresa returns false for an unknown empresa', () => {
    const store = useEmpresaStore()
    expect(store.hasEmpresa('Unknown')).toBe(false)
  })

  it('reset clears all empresas', () => {
    const store = useEmpresaStore()
    store.ensureEmpresa('Klabin', 'KLBN11')
    store.reset()
    expect(store.allEmpresas).toHaveLength(0)
  })
})
