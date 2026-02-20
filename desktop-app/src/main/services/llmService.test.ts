import { describe, it, expect, vi, beforeEach } from 'vitest'
import { extractFinancialTables } from './llmService'
import * as db from '../database'

// 绕开真实网络请求和真实 LangChain 模型内部依赖
vi.mock('@langchain/openai', () => {
    return {
        ChatOpenAI: vi.fn().mockImplementation(() => {
            return {
                invoke: vi.fn().mockResolvedValue({
                    content: '```json\n{"balanceSheet": [{"Item": "Cash", "2023": "100"}], "incomeStatement": [], "cashFlowStatement": []}\n```'
                })
            }
        })
    }
})

describe('llmService', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    it('should extract JSON correctly throwing away markdown blocks', async () => {
        vi.spyOn(db, 'getApiKey').mockReturnValue({
            provider: 'openai',
            apiKey: 'sk-mock',
            baseUrl: 'http://mock',
            modelName: null,
            updatedAt: ''
        })

        const result = await extractFinancialTables({
            provider: 'openai',
            imagesBase64: ['data:image/jpeg;base64,mock']
        })

        expect(result.balanceSheet).toBeDefined()
        expect(result.balanceSheet[0].Item).toBe('Cash')
    })

    it('should throw error if api key is not found', async () => {
        vi.spyOn(db, 'getApiKey').mockReturnValue(null)

        await expect(
            extractFinancialTables({ provider: 'openai', imagesBase64: [] })
        ).rejects.toThrow(/not configured/)
    })
})
