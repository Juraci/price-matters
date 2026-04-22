import type { ParsedCsvRow, TickerSnapshot } from '@/types/stock'

function parseBRNumber(str: string): number {
  const cleaned = str.trim().replace(/\./g, '').replace(',', '.')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

function parseBRCurrency(str: string): number {
  return parseBRNumber(str.replace('R$', '').trim())
}

function parseBRPercent(str: string): number {
  return parseBRNumber(str.replace('%', '').trim())
}

function parseCsvLine(line: string): string[] {
  // Note: does not handle RFC 4180 doubled-quote escaping ("" for a literal ")
  // The production CSV never contains embedded quotes, so this is acceptable.
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)

  return result
}

export function parseCsv(
  content: string,
  importId: string,
  filename: string,
  importedAt: string,
): ParsedCsvRow[] {
  const lines = content.split('\n')
  const headerIndex = lines.findIndex((line) => line.trimStart().startsWith('Empresa'))
  if (headerIndex === -1) throw new Error('CSV header row not found')

  return lines
    .slice(headerIndex + 1)
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const cols = parseCsvLine(line)

      const snapshot: TickerSnapshot = {
        importId,
        importedAt,
        filename,
        atuacao: cols[2]?.trim() ?? '',
        quantidadeTotalAcoes: parseBRNumber(cols[3] ?? '0'),
        valorDeMercado: parseBRCurrency(cols[4] ?? '0'),
        lucroLiquidoEstimado: parseBRCurrency(cols[5] ?? '0'),
        plProjetado: parseBRNumber(cols[6] ?? '0'),
        plMedio10Anos: parseBRNumber(cols[7] ?? '0'),
        desvioPLMedia: parseBRPercent(cols[8] ?? '0'),
        cagrLucros5Anos: parseBRPercent(cols[9] ?? '0'),
        dividaLiquidaEbitda: parseBRNumber(cols[10] ?? '0'),
        lucroPorAcaoEstimado: parseBRCurrency(cols[11] ?? '0'),
        payoutEsperado: parseBRPercent(cols[12] ?? '0'),
        dividendoPorAcaoBruto: parseBRCurrency(cols[13] ?? '0'),
        dividendYieldBruto: parseBRPercent(cols[14] ?? '0'),
        cotacaoAtual: parseBRCurrency(cols[15] ?? '0'),
        precoTeto: parseBRCurrency(cols[16] ?? '0'),
        margemSeguranca: parseBRPercent(cols[17] ?? '0'),
        frequenciaAnuncios: cols[18]?.trim() ?? '',
        mesesAnunciosDividendos: cols[19]?.trim() ?? '',
        ultimaAtualizacao: cols[20]?.trim() ?? '',
      }

      return {
        empresa: cols[0]?.trim() ?? '',
        codigo: cols[1]?.trim() ?? '',
        snapshot,
      }
    })
    .filter((row) => row.empresa !== '' && row.codigo !== '')
}
