import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { getApiKey } from '../database'
import { ChatOpenAI } from '@langchain/openai'
import { ChatAnthropic } from '@langchain/anthropic'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import type { FinancialTablesJSON } from './llmService'

// 财务分析 System Prompt（五维度专业分析）
const ANALYSIS_SYSTEM_PROMPT = `你是一位资深注册会计师和财务分析师。请根据以下三张财务报表（资产负债表、利润表、现金流量表）的数据，为该公司撰写一份当期财务分析报告。

报告须涵盖以下维度，每个维度需引用具体数据并计算相关指标：

## 一、偿债能力分析
- 流动比率（流动资产/流动负债）
- 速动比率（(流动资产-存货)/流动负债）
- 资产负债率（总负债/总资产）
- 解读：短期和长期偿债风险评估

## 二、盈利能力分析
- 营业利润率（营业利润/营业收入）
- 净利润率（净利润/营业收入）
- 毛利率（(营业收入-营业成本)/营业收入）
- 解读：盈利质量与可持续性评价

## 三、营运能力分析
- 应收账款周转天数
- 存货周转天数
- 总资产周转率
- 解读：资产运营效率

## 四、现金流分析
- 经营活动现金流净额与净利润的比较
- 自由现金流估算
- 解读：现金流健康度与造血能力

## 五、综合评价与风险提示
- 2-3 个核心优势
- 2-3 个潜在风险
- 整体财务健康评级（优秀/良好/一般/较差）

要求：
1. 所有计算必须展示公式和具体数字
2. 使用 Markdown 格式输出
3. 语言专业但易于理解
4. 如果某些数据缺失无法计算，明确标注
5. 报告末尾的日期必须使用用户提供的当前日期`

/**
 * 将三表 JSON 数据序列化为大模型可读的文本
 */
function serializeTablesForLLM(data: FinancialTablesJSON): string {
    let text = ''

    if (data.balanceSheet && data.balanceSheet.length > 0) {
        text += '=== 资产负债表 ===\n'
        const headers = Object.keys(data.balanceSheet[0])
        text += headers.join(' | ') + '\n'
        data.balanceSheet.forEach(row => {
            text += headers.map(h => row[h] ?? '').join(' | ') + '\n'
        })
        text += '\n'
    }

    if (data.incomeStatement && data.incomeStatement.length > 0) {
        text += '=== 利润表 ===\n'
        const headers = Object.keys(data.incomeStatement[0])
        text += headers.join(' | ') + '\n'
        data.incomeStatement.forEach(row => {
            text += headers.map(h => row[h] ?? '').join(' | ') + '\n'
        })
        text += '\n'
    }

    if (data.cashFlowStatement && data.cashFlowStatement.length > 0) {
        text += '=== 现金流量表 ===\n'
        const headers = Object.keys(data.cashFlowStatement[0])
        text += headers.join(' | ') + '\n'
        data.cashFlowStatement.forEach(row => {
            text += headers.map(h => row[h] ?? '').join(' | ') + '\n'
        })
        text += '\n'
    }

    return text
}

/**
 * 获取模型实例（复用 llmService 中的相同逻辑）
 */
function getModelInstance(provider: string, apiKey: string, baseUrl?: string, modelName?: string): BaseChatModel {
    switch (provider.toLowerCase()) {
        case 'openai':
            return new ChatOpenAI({
                openAIApiKey: apiKey,
                configuration: baseUrl ? { baseURL: baseUrl } : undefined,
                modelName: modelName || 'gpt-4o',
                temperature: 0.3,
            })
        case 'anthropic':
            return new ChatAnthropic({
                anthropicApiKey: apiKey,
                anthropicApiUrl: baseUrl,
                modelName: modelName || 'claude-3-5-sonnet-20240620',
                temperature: 0.3,
            })
        case 'gemini':
            return new ChatGoogleGenerativeAI({
                apiKey: apiKey,
                baseUrl: baseUrl,
                model: modelName || 'gemini-1.5-pro',
                temperature: 0.3,
            })
        case 'custom':
            return new ChatOpenAI({
                openAIApiKey: apiKey,
                configuration: { baseURL: baseUrl },
                modelName: modelName || 'proxy-model',
                temperature: 0.3,
            })
        default:
            throw new Error(`Unsupported AI provider: ${provider}`)
    }
}

/**
 * 流式生成财务分析报告
 * @param provider - 模型提供商
 * @param data - 三表 JSON 数据
 * @param onChunk - 每收到一个 token chunk 时的回调
 * @param onDone - 流式输出完成的回调
 * @param onError - 出错时的回调
 */
export async function generateFinancialAnalysis(
    provider: string,
    data: FinancialTablesJSON,
    onChunk: (chunk: string) => void,
    onDone: () => void,
    onError: (error: string) => void
): Promise<void> {
    const credentials = getApiKey(provider)
    if (!credentials) {
        onError(`API Key for provider '${provider}' is not configured.`)
        return
    }

    const model = getModelInstance(
        provider,
        credentials.apiKey,
        credentials.baseUrl || undefined,
        credentials.modelName || undefined
    )

    const serializedData = serializeTablesForLLM(data)
    console.log(`[Analysis Service] Serialized ${serializedData.length} chars of financial data`)

    const today = new Date()
    const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`

    const messages = [
        new SystemMessage(ANALYSIS_SYSTEM_PROMPT),
        new HumanMessage(`今天的日期是：${dateStr}

请分析以下财务报表数据：

${serializedData}`)
    ]

    try {
        console.log(`[Analysis Service] Starting analysis with provider: ${provider}`)
        // 使用 invoke 而非 stream，避免 Gemini 的流式解析 Bug
        const response = await model.invoke(messages)
        const fullContent = typeof response.content === 'string' ? response.content : ''

        console.log(`[Analysis Service] Got response of ${fullContent.length} chars, simulating stream...`)

        // 模拟打字机效果：按段落逐步推送
        const paragraphs = fullContent.split('\n')
        for (const paragraph of paragraphs) {
            // 每一行作为一个 chunk 推送，附带换行
            onChunk(paragraph + '\n')
            // 短暂延迟模拟打字效果
            await new Promise(resolve => setTimeout(resolve, 30))
        }

        console.log(`[Analysis Service] Analysis completed`)
        onDone()
    } catch (error: any) {
        console.error(`[Analysis Service ERROR]`, error.message)
        onError(`财务分析失败: ${error.message}`)
    }
}
