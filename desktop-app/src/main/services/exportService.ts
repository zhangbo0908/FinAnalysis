import * as xlsx from 'xlsx-js-style'
import * as path from 'path'
import { app } from 'electron'
import type { FinancialTablesJSON } from './llmService'

// 通用边框样式
const thinBorder = {
    top: { style: 'thin', color: { rgb: '000000' } },
    bottom: { style: 'thin', color: { rgb: '000000' } },
    left: { style: 'thin', color: { rgb: '000000' } },
    right: { style: 'thin', color: { rgb: '000000' } },
}

// 表头样式
const headerStyle = {
    font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '4472C4' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: thinBorder,
}

// 普通单元格样式
const cellStyle = {
    font: { sz: 10 },
    alignment: { vertical: 'center', wrapText: true },
    border: thinBorder,
}

// 数字单元格样式（右对齐）
const numberCellStyle = {
    ...cellStyle,
    alignment: { ...cellStyle.alignment, horizontal: 'right' },
}

/**
 * 判断一个值是否为数字（包括千分位格式的数字字符串）
 */
function isNumericValue(val: any): boolean {
    if (typeof val === 'number') return true
    if (typeof val === 'string') {
        const cleaned = val.replace(/,/g, '').trim()
        return cleaned !== '' && !isNaN(Number(cleaned))
    }
    return false
}

/**
 * 为 worksheet 添加样式和自适应列宽
 */
function styleWorksheet(ws: xlsx.WorkSheet, data: Array<Record<string, any>>): void {
    if (!data || data.length === 0) return

    const keys = Object.keys(data[0])
    const ref = ws['!ref']
    if (!ref) return

    const range = xlsx.utils.decode_range(ref)

    // 计算每列的最大内容宽度用于自适应列宽
    const colWidths: number[] = keys.map(k => Math.min(k.length * 2, 20))

    for (let R = range.s.r; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
            const cellRef = xlsx.utils.encode_cell({ r: R, c: C })
            const cell = ws[cellRef]
            if (!cell) continue

            if (R === 0) {
                // 表头行
                cell.s = headerStyle
            } else {
                // 数据行
                cell.s = isNumericValue(cell.v) ? numberCellStyle : cellStyle
            }

            // 计算列宽
            const contentLen = cell.v != null ? String(cell.v).length : 0
            // 中文字符占双宽
            const chineseChars = (String(cell.v || '').match(/[\u4e00-\u9fff]/g) || []).length
            const effectiveLen = contentLen + chineseChars
            if (effectiveLen > colWidths[C]) {
                colWidths[C] = Math.min(effectiveLen, 40)
            }
        }
    }

    // 设置列宽
    ws['!cols'] = colWidths.map(w => ({ wch: w + 2 }))
}

export async function exportToExcel(data: FinancialTablesJSON, defaultFileName: string = 'FinancialReport.xlsx'): Promise<string> {
    const wb = xlsx.utils.book_new()

    // 资产负债表
    const wsBalance = xlsx.utils.json_to_sheet(data.balanceSheet || [])
    styleWorksheet(wsBalance, data.balanceSheet || [])
    xlsx.utils.book_append_sheet(wb, wsBalance, '资产负债表')

    // 利润表
    const wsIncome = xlsx.utils.json_to_sheet(data.incomeStatement || [])
    styleWorksheet(wsIncome, data.incomeStatement || [])
    xlsx.utils.book_append_sheet(wb, wsIncome, '利润表')

    // 现金流量表
    const wsCashFlow = xlsx.utils.json_to_sheet(data.cashFlowStatement || [])
    styleWorksheet(wsCashFlow, data.cashFlowStatement || [])
    xlsx.utils.book_append_sheet(wb, wsCashFlow, '现金流量表')

    const downloadPath = app.getPath('downloads')
    const finalPath = path.join(downloadPath, defaultFileName)

    xlsx.writeFile(wb, finalPath)

    return finalPath
}
