import { describe, it, expect } from 'vitest'
import { parseCsv } from '../csvParser'

const SAMPLE_CSV = `Link >,PLANILHA,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,
Empresa,Código,Atuação,Quantidade total de ações ,Valor de mercado,Lucro líquido estimado,P/L projetado,P/L médio (últ. 10 anos),Desvio do P/L da sua média,CAGR lucros (últ. 5 anos),Dívida líquida/EBITDA,Lucro por ação estimado,Payout esperado,Dividendo por ação bruto projetado,Dividend Yield bruto estimado,Cotação atual,Preço Teto,Margem de segurança,Frequência nos anúncios,Meses que costumam anunciar dividendos,Última atualização
TestCo,TEST3,Tecnologia,"100.000,00","R$ 1.000.000,00","R$ 100.000,00","10,0","8,0","25,0%","5,0%","0,50","R$ 1,00","50,00%","R$ 0,50","5,0%","R$ 10,00","R$ 12,00",17%,Anual,dezembro,01/01/2026
AnotherCo,ANOT4,Bancos,"200.000,00","R$ 2.000.000,00","R$ 200.000,00","8,0","7,0","-10,0%","10,0%","1,00","R$ 2,00","60,00%","R$ 1,20","6,0%","R$ 20,00","R$ 22,00",9%,Semestral,junho e dez,01/01/2026
ThirdCo,THRD5,Papel,"300.000,00","R$ 3.000.000,00","R$ 300.000,00","12,0","10,0","30,0%","8,0%","2,00","R$ 3,00","70,00%","R$ 2,10","7,0%","R$ 30,00","R$ 35,00",14%,Trimestral,"fev, mai, ago, nov",01/01/2026`

describe('parseCsv', () => {
  it('skips metadata and blank lines, parses data rows', () => {
    const rows = parseCsv(SAMPLE_CSV, 'import-1', 'test.csv', '2026-01-01T00:00:00.000Z')
    expect(rows).toHaveLength(3)
  })

  it('parses empresa and codigo correctly', () => {
    const rows = parseCsv(SAMPLE_CSV, 'import-1', 'test.csv', '2026-01-01T00:00:00.000Z')
    expect(rows[0]!.empresa).toBe('TestCo')
    expect(rows[0]!.codigo).toBe('TEST3')
  })

  it('parses BR number format (quantidade de ações)', () => {
    const rows = parseCsv(SAMPLE_CSV, 'import-1', 'test.csv', '2026-01-01T00:00:00.000Z')
    expect(rows[0]!.snapshot.quantidadeTotalAcoes).toBe(100000)
  })

  it('parses BR currency format (lucro líquido estimado)', () => {
    const rows = parseCsv(SAMPLE_CSV, 'import-1', 'test.csv', '2026-01-01T00:00:00.000Z')
    expect(rows[0]!.snapshot.lucroLiquidoEstimado).toBe(100000)
  })

  it('parses positive percentage (desvio P/L)', () => {
    const rows = parseCsv(SAMPLE_CSV, 'import-1', 'test.csv', '2026-01-01T00:00:00.000Z')
    expect(rows[0]!.snapshot.desvioPLMedia).toBe(25)
  })

  it('parses negative percentage (desvio P/L)', () => {
    const rows = parseCsv(SAMPLE_CSV, 'import-1', 'test.csv', '2026-01-01T00:00:00.000Z')
    expect(rows[1]!.snapshot.desvioPLMedia).toBe(-10)
  })

  it('attaches importId, filename, importedAt to each snapshot', () => {
    const rows = parseCsv(SAMPLE_CSV, 'import-1', 'test.csv', '2026-01-01T00:00:00.000Z')
    expect(rows[0]!.snapshot.importId).toBe('import-1')
    expect(rows[0]!.snapshot.filename).toBe('test.csv')
    expect(rows[0]!.snapshot.importedAt).toBe('2026-01-01T00:00:00.000Z')
  })

  it('unquoted fields after quoted fields parse correctly', () => {
    const rows = parseCsv(SAMPLE_CSV, 'import-1', 'test.csv', '2026-01-01T00:00:00.000Z')
    expect(rows[0]!.snapshot.frequenciaAnuncios).toBe('Anual')
  })

  it('preserves quoted multi-comma field (mesesAnunciosDividendos)', () => {
    const rows = parseCsv(SAMPLE_CSV, 'import-1', 'test.csv', '2026-01-01T00:00:00.000Z')
    expect(rows[2]!.snapshot.mesesAnunciosDividendos).toBe('fev, mai, ago, nov')
  })

  it('throws when header row is not found', () => {
    expect(() => parseCsv('invalid\ncontent', 'i', 'f', 't')).toThrow('header row not found')
  })
})
