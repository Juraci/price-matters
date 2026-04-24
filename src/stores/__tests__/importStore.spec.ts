import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useImportStore } from '../importStore'
import { useEmpresaStore } from '../empresaStore'
import { useTickerStore } from '../tickerStore'

const BASE_CSV = `Link >,PLANILHA,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,
Empresa,Código,Atuação,Quantidade total de ações ,Valor de mercado,Lucro líquido estimado,P/L projetado,P/L médio (últ. 10 anos),Desvio do P/L da sua média,CAGR lucros (últ. 5 anos),Dívida líquida/EBITDA,Lucro por ação estimado,Payout esperado,Dividendo por ação bruto projetado,Dividend Yield bruto estimado,Cotação atual,Preço Teto,Margem de segurança,Frequência nos anúncios,Meses que costumam anunciar dividendos,Última atualização
TestCo,TEST3,Tecnologia,"100.000,00","R$ 1.000.000,00","R$ 100.000,00","10,0","8,0","25,0%","5,0%","0,50","R$ 1,00","50,00%","R$ 0,50","5,0%","R$ 10,00","R$ 12,00",17%,Anual,dezembro,01/01/2026
Klabin,KLBN11,Papel e Celulose,"200.000,00","R$ 2.000.000,00","R$ 200.000,00","8,0","9,0","-11,1%","10,0%","3,70","R$ 2,00","15,00%","R$ 0,30","5,0%","R$ 19,00","R$ 22,00",13%,Trimestral,"fev, mai, ago, nov",01/01/2026
Klabin,KLBN4,Papel e Celulose,"1.000.000,00","R$ 2.100.000,00","R$ 200.000,00","8,0","9,0","-11,1%","10,0%","3,70","R$ 0,40","15,00%","R$ 0,06","5,0%","R$ 3,80","R$ 4,40",14%,Trimestral,"fev, mai, ago, nov",01/01/2026`

describe('useImportStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('creates an import batch record after importing', async () => {
    const importStore = useImportStore()
    const file = new File([BASE_CSV], 'test.csv', { type: 'text/csv' })
    await importStore.importCsv(file)
    expect(importStore.batches).toHaveLength(1)
    expect(importStore.batches[0]!.filename).toBe('test.csv')
    expect(importStore.batches[0]!.rowCount).toBe(3)
  })

  it('creates empresas and links codigos correctly', async () => {
    const importStore = useImportStore()
    const empresaStore = useEmpresaStore()
    const file = new File([BASE_CSV], 'test.csv', { type: 'text/csv' })
    await importStore.importCsv(file)
    expect(empresaStore.allEmpresas).toHaveLength(2)
    const klabin = empresaStore.allEmpresas.find((e) => e.nome === 'Klabin')
    expect(klabin?.codigos).toEqual(['KLBN11', 'KLBN4'])
  })

  it('records accurate stats on first import', async () => {
    const importStore = useImportStore()
    const file = new File([BASE_CSV], 'test.csv', { type: 'text/csv' })
    await importStore.importCsv(file)
    const stats = importStore.batches[0]!.stats
    expect(stats.newEmpresas).toBe(2)
    expect(stats.newTickers).toBe(3)
    expect(stats.updatedTickers).toBe(0)
    expect(stats.removedTickers).toBe(0)
    expect(stats.unchangedTickers).toBe(0)
  })

  it('detects removed tickers in a subsequent import', async () => {
    const importStore = useImportStore()
    const tickerStore = useTickerStore()
    const file1 = new File([BASE_CSV], 'test1.csv', { type: 'text/csv' })
    await importStore.importCsv(file1)

    const csv2 = BASE_CSV.split('\n')
      .filter((l) => !l.includes('TEST3'))
      .join('\n')
    const file2 = new File([csv2], 'test2.csv', { type: 'text/csv' })
    await importStore.importCsv(file2)

    expect(importStore.batches[1]!.stats.removedTickers).toBe(1)
    expect(tickerStore.tickers['TEST3']!.status).toBe('removed')
  })

  it('detects updated tickers and adds a snapshot when precoTeto changes', async () => {
    const importStore = useImportStore()
    const tickerStore = useTickerStore()
    const file1 = new File([BASE_CSV], 'test1.csv', { type: 'text/csv' })
    await importStore.importCsv(file1)

    // Change precoTeto for TEST3 (R$ 12,00 → R$ 14,00)
    const csv2 = BASE_CSV.replace('"R$ 12,00"', '"R$ 14,00"')
    const file2 = new File([csv2], 'test2.csv', { type: 'text/csv' })
    await importStore.importCsv(file2)

    expect(importStore.batches[1]!.stats.updatedTickers).toBe(1)
    expect(tickerStore.tickers['TEST3']!.history).toHaveLength(2)
  })

  it('CSV cotacaoAtual seeds ticker.cotacaoAtual on first import but does not change snapshots', async () => {
    const importStore = useImportStore()
    const tickerStore = useTickerStore()
    const file = new File([BASE_CSV], 'test.csv', { type: 'text/csv' })
    await importStore.importCsv(file)
    expect(tickerStore.tickers['TEST3']!.cotacaoAtual).toBe(10)
    expect(tickerStore.tickers['TEST3']!.history).toHaveLength(1)
  })

  it('re-importing with a different CSV cotacaoAtual does not add a snapshot and does not clobber live price', async () => {
    const importStore = useImportStore()
    const tickerStore = useTickerStore()
    const file1 = new File([BASE_CSV], 'test1.csv', { type: 'text/csv' })
    await importStore.importCsv(file1)

    tickerStore.setLiveQuote('TEST3', 42.5, '2026-04-24T10:00:00.000Z')

    // Change cotacaoAtual for TEST3 in the CSV (R$ 10,00 → R$ 11,00)
    const csv2 = BASE_CSV.replace('"R$ 10,00"', '"R$ 11,00"')
    const file2 = new File([csv2], 'test2.csv', { type: 'text/csv' })
    await importStore.importCsv(file2)

    expect(importStore.batches[1]!.stats.updatedTickers).toBe(0)
    expect(tickerStore.tickers['TEST3']!.history).toHaveLength(1)
    expect(importStore.batches[1]!.stats.unchangedTickers).toBe(3)
    expect(tickerStore.tickers['TEST3']!.cotacaoAtual).toBe(42.5)
  })

  it('reset clears all batches', async () => {
    const importStore = useImportStore()
    const file = new File([BASE_CSV], 'test.csv', { type: 'text/csv' })
    await importStore.importCsv(file)
    importStore.reset()
    expect(importStore.batches).toHaveLength(0)
  })
})
