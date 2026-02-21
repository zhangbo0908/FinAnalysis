import * as xlsx from 'xlsx'
import type { FinancialTablesJSON } from './llmService'

/**
 * 将多 Sheet 的 Excel 文件解析为大模型识别的 JSON 结构格式
 * @param fileData Excel 文件二进制数据
 * @returns FinancialTablesJSON
 */
export async function parseExcelBuffer(fileData: ArrayBuffer | Uint8Array): Promise<FinancialTablesJSON> {
    const workbook = xlsx.read(fileData, { type: 'buffer' })

    const result: FinancialTablesJSON = {
        balanceSheet: [],
        incomeStatement: [],
        cashFlowStatement: []
    }

    let foundAnyTable = false

    // 尝试寻找特定的 sheet 名称以获取对应报表数据
    workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = xlsx.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: "" })

        if (sheetName.includes('资产负债')) {
            result.balanceSheet = jsonData
            foundAnyTable = true
        } else if (sheetName.includes('利润') || sheetName.includes('损益')) {
            result.incomeStatement = jsonData
            foundAnyTable = true
        } else if (sheetName.includes('现金流量')) {
            result.cashFlowStatement = jsonData
            foundAnyTable = true
        }
    })

    if (!foundAnyTable) {
        throw new Error('抱歉，未能在此 Excel 中找到标准的三大财务报表（资产负债表、利润表或现金流量表），请检查文件内容。')
    }

    return result
}
