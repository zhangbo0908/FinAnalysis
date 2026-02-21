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

// 大模型原始输出的接口（资产负债表分左右两侧）
export interface RawLLMOutput {
    balanceSheet_left: Array<Record<string, any>>   // 资产侧（左）
    balanceSheet_right: Array<Record<string, any>>  // 负债+权益侧（右）
    incomeStatement: Array<Record<string, any>>
    cashFlowStatement: Array<Record<string, any>>
}

// 合并后的最终接口（资产负债表已拼接为宽表）
export interface FinancialTablesJSON {
    balanceSheet: Array<Record<string, any>>
    incomeStatement: Array<Record<string, any>>
    cashFlowStatement: Array<Record<string, any>>
}

/**
 * 将资产负债表的左右两侧数组合并为一张宽表。
 * 较短的一侧在倒数第二行之前插入空行，使得两侧的最后一行（总计行）对齐。
 */
function mergeBalanceSheet(
    left: Array<Record<string, any>>,
    right: Array<Record<string, any>>
): Array<Record<string, any>> {
    if (!left || left.length === 0) return right || []
    if (!right || right.length === 0) return left || []

    const leftKeys = Object.keys(left[0])
    const rightKeys = Object.keys(right[0])
    const emptyLeft: Record<string, any> = {}
    const emptyRight: Record<string, any> = {}
    leftKeys.forEach(k => emptyLeft[k] = '')
    rightKeys.forEach(k => emptyRight[k] = '')

    // 将较短的一侧在最后一行（总计行）前补空行，使双侧等长
    const maxLen = Math.max(left.length, right.length)
    const paddedLeft = [...left]
    const paddedRight = [...right]

    while (paddedLeft.length < maxLen) {
        // 在倒数第二个位置（总计行之前）插入空行
        paddedLeft.splice(paddedLeft.length - 1, 0, { ...emptyLeft })
    }
    while (paddedRight.length < maxLen) {
        paddedRight.splice(paddedRight.length - 1, 0, { ...emptyRight })
    }

    // 逐行合并左右，右侧 key 加后缀 "_R" 避免同名覆盖
    const merged: Array<Record<string, any>> = []
    for (let i = 0; i < maxLen; i++) {
        const row: Record<string, any> = { ...paddedLeft[i] }
        const rightRow = paddedRight[i]
        for (const key of Object.keys(rightRow)) {
            // 如果右侧 key 已存在于左侧，加 _R 后缀
            const newKey = key in row ? `${key}_R` : key
            row[newKey] = rightRow[key]
        }
        merged.push(row)
    }
    return merged
}

const SYSTEM_PROMPT = `
You are an expert financial data extraction AI. Extract data from the provided financial report images into JSON.

The JSON must contain these four top-level arrays:
- "balanceSheet_left": The LEFT side of the Balance Sheet (Assets / 资产). Read top-to-bottom.
- "balanceSheet_right": The RIGHT side of the Balance Sheet (Liabilities & Equity / 负债和所有者权益). Read top-to-bottom.
- "incomeStatement": The Income Statement (利润表). Read top-to-bottom.
- "cashFlowStatement": The Cash Flow Statement (现金流量表). Read top-to-bottom.

Rules:
1. Each array item is one row. Keys = column headers, values = cell content (string or number).
2. For the Balance Sheet: extract left side and right side as TWO SEPARATE arrays. Do NOT try to align them horizontally. Just read each side independently from top to bottom.
3. For Income Statement and Cash Flow Statement: extract as a single simple table from top to bottom.
4. Transcribe exactly what you see. Do not omit or summarize.
5. If a table spans multiple pages, continue appending rows.
6. Do not wrap in markdown code blocks. Output raw JSON only, parseable by JSON.parse().
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
    const extractSingleImage = async (base64: string, index: number): Promise<RawLLMOutput> => {
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
                console.log(`[LLM Service] Extracting image ${index + 1}/${imagesBase64.length} (Attempt ${retries + 1})...`)
                const response = await model.invoke(messages)

                let content = response.content as string
                let jsonString = content.trim()

                const jsonMatch = jsonString.match(/\{[\s\S]*\}/)
                if (jsonMatch) {
                    jsonString = jsonMatch[0]
                } else {
                    if (jsonString.startsWith('```json')) jsonString = jsonString.slice(7)
                    if (jsonString.startsWith('```')) jsonString = jsonString.slice(3)
                    if (jsonString.endsWith('```')) jsonString = jsonString.slice(0, -3)
                }

                return JSON.parse(jsonString.trim()) as RawLLMOutput
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
        const promises = imagesBase64.map((base64, idx) => extractSingleImage(base64, idx))
        const rawResults = await Promise.all(promises)

        const duration = ((Date.now() - startTime) / 1000).toFixed(1)
        console.log(`[LLM Service] All ${imagesBase64.length} images processed in ${duration}s.`)

        const finalLeft: Record<string, any>[] = []
        const finalRight: Record<string, any>[] = []
        const finalIncome: Record<string, any>[] = []
        const finalCash: Record<string, any>[] = []

        for (const res of rawResults) {
            if (res.balanceSheet_left) finalLeft.push(...res.balanceSheet_left)
            if (res.balanceSheet_right) finalRight.push(...res.balanceSheet_right)
            if (res.incomeStatement) finalIncome.push(...res.incomeStatement)
            if (res.cashFlowStatement) finalCash.push(...res.cashFlowStatement)
        }

        const mergedBalance = mergeBalanceSheet(finalLeft, finalRight)

        const jsonFormat: FinancialTablesJSON = {
            balanceSheet: mergedBalance,
            incomeStatement: finalIncome,
            cashFlowStatement: finalCash
        }

        console.log(`[LLM Service] Final parsed records: MergedBalance(${mergedBalance.length}), Income(${jsonFormat.incomeStatement.length}), CashFlow(${jsonFormat.cashFlowStatement.length}).`)

        return jsonFormat
    } catch (error: any) {
        console.error(`[LLM Service ERROR] Extraction failed:`, error.message)
        throw new Error(`LLM Extraction parsing failed: ${error.message}`)
    }
}
