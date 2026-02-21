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

export const ROLE_PROMPTS: Record<string, string> = {
    'audit': ANALYSIS_SYSTEM_PROMPT,
    'value_investing': `你是一位经验丰富的二级市场价值投资者（如巴菲特/芒格学派）。请根据以下三张财务报表数据，为该公司撰写一份深度投资价值分析报告。
请极度严苛地审视其护城河、ROE 趋势、自由现金流以及长期成长的估值潜力。

报告须涵盖以下维度：
## 一、核心护城河与盈利质量
- 重点切片分析毛利率与净利润率的含金量
- ROE（净资产收益率）估算与驱动因素分解
## 二、自由现金流与股东回报
- 估算自由现金流（经营活动现金流 - 资本性支出）
- 评估企业分红基础与真实造血能力
## 三、资产与资本配置效率
- 资产负债率与有息负债健康度
- 营运资金占用情况（应收/存货周转）
## 四、长期复利潜力与估值考量
- 收入与利润结构的持续性看点
- 潜在的投资风险与排雷
## 五、最终投资研判
- 企业商业模式定性评价
- 整体护城河评级（极强/较强/一般/脆弱）

要求：所有计算必须展示公式和具体数字，使用 Markdown 格式，如果数据缺失无法计算需明确标注，报告末尾加上当前日期。`,

    'management': `你是一位企业内部的高级经营分析师/CFO。请根据以下三张财务报表数据，为公司管理层撰写一份极具行动指导意义的内部经营分析报告。
请重点聚焦资产周转效率、成本/费用刚性结构以及降本增效的直接发力点。

报告须涵盖以下维度：
## 一、营收与利润结构剖析
- 详细拆解毛利率变动与核心利润率转化
- 各项成本占比分析，指出挤压利润空间的环节
## 二、资产运营效率与周转瓶颈
- 深入分析存货周转天数与应收账款周转天数
- 识别资金沉淀的重灾区
## 三、现金流与资金链安全
- 经营净现金流分析及日常运营营运资金缺口
- 投资与筹资活动的匹配度
## 四、降本增效发力点建议
- 针对当前报表暴露的效率低谷，提出 3 条具体管理动作改进建议
## 五、经营健康度总结
- 总结当前最危险的指标与最优异的指标

要求：所有计算必须展示公式和具体数字，使用 Markdown 格式，如果数据缺失无法计算需明确标注，报告末尾加上当前日期。`,

    'credit_risk': `你是一位极度厌恶风险的银行信贷审批官/风控专家。请根据以下财务报表数据，为该公司撰写一份冷酷无情的信贷风控违约排雷报告。
请重点关注破产先兆指标、流动性卡脖子点与违约概率。

报告须涵盖以下维度：
## 一、短期流动性与刚兑压力
- 速动比率与流动比率极限施压分析
- 货币资金对短期有息负债的覆盖程度
## 二、核心偿债指标与杠杆泡沫
- 真实资产负债率评估
- 剔除无形资产和长摊后的实际净资产底盘
## 三、经营造血与利息保障
- 经营活动产生的现金流量净额能否覆盖债务本息与基本维系支出
- 利润表中的非经常性损益注水排查
## 四、破产与违约预警信号
- 盘点存货异动、应收账款异动等粉饰报表的可能
- 综合预警判断评估
## 五、最终授信评级建议
- 明确列出最致命的拒贷/风险点
- 风险评级（低度/中度/高度/极高违约风险）

要求：所有计算必须展示公式和具体数字，使用 Markdown 格式，如果数据缺失无法计算需明确标注，报告末尾加上当前日期。`
}

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
    customPrompt: string | undefined,
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

    const finalSystemPrompt = customPrompt && customPrompt.trim().length > 0
        ? customPrompt
        : ANALYSIS_SYSTEM_PROMPT

    const messages = [
        new SystemMessage(finalSystemPrompt),
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
