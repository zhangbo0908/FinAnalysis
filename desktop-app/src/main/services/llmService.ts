import { ChatOpenAI } from '@langchain/openai'
import { ChatAnthropic } from '@langchain/anthropic'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { getApiKey } from '../database'

export interface ExtractionParams {
    provider: string
    imagesBase64: string[] // Data URL string starting with 'data:image/jpeg;base64,...'
}

// 合并后的最终接口（资产负债表已拼接为宽表）
export interface FinancialTablesJSON {
    balanceSheet: Array<Record<string, any>>
    incomeStatement: Array<Record<string, any>>
    cashFlowStatement: Array<Record<string, any>>
}

const SYSTEM_PROMPT = `
You are an expert financial data extraction AI. Extract data from the provided financial report images into Markdown tables.

Please strictly follow these rules:
1. Extract the Balance Sheet (资产负债表), Income Statement (利润表), and Cash Flow Statement (现金流量表) exactly as they appear in the image.
2. Output your findings as standard Markdown tables. 
3. PREPEND each table with exactly one of these headers before the markdown table starts (do not use any other header text):
   [TableType: BalanceSheet]
   [TableType: IncomeStatement]
   [TableType: CashFlowStatement]
4. For the Balance Sheet: if it has both left (Assets) and right (Liabilities) sections, just extract the entire wide table exactly as it is (e.g., column headers like: 项目 | 期末余额 | 年初余额 | 项目 | 期末余额 | 年初余额). DO NOT try to split it yourself.
5. Transcribe exactly what you see. Do not omit or summarize. If a table spans multiple pages, continue appending rows.
6. Do NOT output JSON. Just the header tags and the Markdown tables.
`

function getModelInstance(provider: string, apiKey: string, baseUrl?: string, modelName?: string): BaseChatModel {
    switch (provider.toLowerCase()) {
        case 'openai':
            return new ChatOpenAI({
                openAIApiKey: apiKey,
                configuration: baseUrl ? { baseURL: baseUrl } : undefined,
                modelName: modelName || 'gpt-4o',
                temperature: 0,
            })
        case 'anthropic':
            return new ChatAnthropic({
                anthropicApiKey: apiKey,
                anthropicApiUrl: baseUrl,
                modelName: modelName || 'claude-3-5-sonnet-20240620',
                temperature: 0,
            })
        case 'gemini':
            return new ChatGoogleGenerativeAI({
                apiKey: apiKey,
                baseUrl: baseUrl,
                model: modelName || 'gemini-1.5-pro',
                temperature: 0,
            })
        case 'custom':
            // Fallback to OpenAI library but with custom model/url
            return new ChatOpenAI({
                openAIApiKey: apiKey,
                configuration: { baseURL: baseUrl },
                modelName: modelName || 'proxy-model',
                temperature: 0,
            })
        default:
            throw new Error(`Unsupported AI provider: ${provider}`)
    }
}

export async function testLLMConnection(params: { provider: string, apiKey: string, baseUrl?: string, modelName?: string }): Promise<boolean> {
    const { provider, apiKey, baseUrl, modelName } = params
    try {
        const model = getModelInstance(provider, apiKey, baseUrl || undefined, modelName || undefined)
        await model.invoke([new HumanMessage("Hello, please reply 'OK' to test connection.")])
        console.log(`[LLM Service] Test connection successful for ${provider}`)
        return true
    } catch (error: any) {
        console.error(`[LLM Service ERROR] Test connection failed:`, error.message)
        throw new Error(`连通性测试失败: ${error.message}`)
    }
}

/**
 * 将 Markdown 表格内容解析为 JSON 数组
 */
function parseMarkdownTableToJSON(tableContent: string): Record<string, string>[] {
    const lines = tableContent.split('\n').filter(line => line.trim().startsWith('|'))
    if (lines.length < 2) return []

    // 提取表头
    const headers = lines[0]
        .split('|')
        .slice(1, -1) // 移除首尾的空串
        .map(h => h.trim())

    // lines[1] 是 markdown 的分隔线 '|---|---|'，跳过
    const records: Record<string, string>[] = []

    for (let i = 2; i < lines.length; i++) {
        const rowData = lines[i]
            .split('|')
            .slice(1, -1)
            .map(cell => cell.trim())

        const record: Record<string, string> = {}
        let hasData = false
        headers.forEach((header, idx) => {
            const val = rowData[idx] || ''
            if (val && val !== '-' && val !== '') hasData = true
            // 防止重复表头字段覆盖，比如有两个“项目”
            let finalHeader = header || `Column_${idx}`
            while (record[finalHeader] !== undefined) {
                finalHeader += '_R'  // 针对右侧复用的表头加后缀
            }
            record[finalHeader] = val
        })

        if (hasData) {
            records.push(record)
        }
    }

    return records
}

/**
 * 根据大模型输出的文本段落，提取各类 Markdown 表格数据
 */
function extractTablesFromMarkdown(markdownText: string): FinancialTablesJSON {
    const jsonFormat: FinancialTablesJSON = {
        balanceSheet: [],
        incomeStatement: [],
        cashFlowStatement: []
    }

    // 根据预先定义的标识符划分表格区块
    const blocks = markdownText.split(/\[TableType:/i)

    for (const block of blocks) {
        if (!block.trim()) continue

        const typeMatch = block.match(/^\s*([A-Za-z]+)\]/)
        if (!typeMatch) continue

        const tableType = typeMatch[1].toLowerCase()
        const tableContent = block.substring(typeMatch[0].length)
        const parsedData = parseMarkdownTableToJSON(tableContent)

        if (tableType.includes('balance')) {
            jsonFormat.balanceSheet.push(...parsedData)
        } else if (tableType.includes('income')) {
            jsonFormat.incomeStatement.push(...parsedData)
        } else if (tableType.includes('cash')) {
            jsonFormat.cashFlowStatement.push(...parsedData)
        }
    }

    return jsonFormat
}

export async function extractFinancialTables(
    params: ExtractionParams,
    onWarning?: (msg: string) => void
): Promise<FinancialTablesJSON> {
    const { provider, imagesBase64 } = params

    const credentials = getApiKey(provider)
    if (!credentials) {
        throw new Error(`API Key for provider '${provider}' is not configured. Please go to settings.`)
    }

    const model = getModelInstance(provider, credentials.apiKey, credentials.baseUrl || undefined, credentials.modelName || undefined)

    console.log(`[LLM Service] Initiating parallel extraction request to provider: ${provider}`)
    console.log(`[LLM Service] Utilizing model node: ${model.getName() || credentials.modelName || 'default'}`)
    console.log(`[LLM Service] Processing ${imagesBase64.length} image pages concurrently...`)
    const startTime = Date.now()

    // Retry and parallel extraction logic for a single image
    const extractSingleImage = async (base64: string, index: number): Promise<FinancialTablesJSON> => {
        let retries = 0
        const maxRetries = 3

        const messages = [
            new SystemMessage(SYSTEM_PROMPT),
            new HumanMessage({
                content: [
                    {
                        type: 'text',
                        text: 'Please carefully review this financial report page and extract any Balance Sheet, Income statement, or Cash Flow Statement tables present:'
                    },
                    {
                        type: 'image_url',
                        image_url: { url: base64 }
                    }
                ]
            })
        ]

        while (true) {
            try {
                console.log(`[LLM] 图${index + 1} 开始第 ${retries + 1} 次请求...`)
                const t0 = Date.now()
                const response = await model.invoke(messages)
                const apiMs = Date.now() - t0
                const content = response.content as string

                const t1 = Date.now()
                const result = extractTablesFromMarkdown(content)
                const parseMs = Date.now() - t1

                console.log(
                    `[LLM] 图${index + 1} 完成: ` +
                    `API响应 ${apiMs}ms | ` +
                    `Markdown解析 ${parseMs}ms | ` +
                    `输出 Token 约 ${Math.round(content.length / 4)} | ` +
                    `资产负债表 ${result.balanceSheet.length} 行, ` +
                    `利润表 ${result.incomeStatement.length} 行, ` +
                    `现金流 ${result.cashFlowStatement.length} 行`
                )

                return result
            } catch (err: any) {
                const isRateLimit = err.message?.includes('429') || err.message?.toLowerCase().includes('rate limit')
                if (isRateLimit && retries < maxRetries) {
                    retries++
                    const waitTime = retries * 2000
                    const warningMsg = `API 触发并发限制，第 ${index + 1} 张图片将在 ${waitTime / 1000} 秒后重试...`
                    console.warn(`[LLM Service WARNING] ${warningMsg}`)
                    if (onWarning) onWarning(warningMsg)

                    await new Promise(resolve => setTimeout(resolve, waitTime))
                } else {
                    throw new Error(`第 ${index + 1} 张图片解析失败: ${err.message}`)
                }
            }
        }
    }

    try {
        console.log(`[LLM] 并行发起 ${imagesBase64.length} 张图片的 API 请求...`)
        const promises = imagesBase64.map((base64, idx) => extractSingleImage(base64, idx))
        const rawResults = await Promise.all(promises)

        const apiDuration = ((Date.now() - startTime) / 1000).toFixed(1)
        console.log(`[LLM] 所有图片 API 请求完成，总耗时 ${apiDuration}s`)

        const mergeStart = Date.now()
        const finalJson: FinancialTablesJSON = {
            balanceSheet: [],
            incomeStatement: [],
            cashFlowStatement: []
        }

        for (const res of rawResults) {
            finalJson.balanceSheet.push(...res.balanceSheet)
            finalJson.incomeStatement.push(...res.incomeStatement)
            finalJson.cashFlowStatement.push(...res.cashFlowStatement)
        }
        const mergeMs = Date.now() - mergeStart

        console.log(
            `[LLM] 数据合并完成 (${mergeMs}ms): ` +
            `资产负债表 ${finalJson.balanceSheet.length} 行 | ` +
            `利润表 ${finalJson.incomeStatement.length} 行 | ` +
            `现金流表 ${finalJson.cashFlowStatement.length} 行`
        )
        console.log(`[LLM] 全流程总耗时: ${((Date.now() - startTime) / 1000).toFixed(1)}s`)

        return finalJson
    } catch (error: any) {
        console.error(`[LLM Service ERROR] Extraction failed:`, error.message)
        throw new Error(`LLM Extraction parsing failed: ${error.message}`)
    }
}

