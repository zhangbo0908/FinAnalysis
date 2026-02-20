/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import { DataVerification } from './DataVerification'
import { describe, it, expect, vi, beforeEach } from 'vitest'



// Mock react-router
let mockLocationState: any = { imagesBase64: ['data:image/jpeg;base64,testholder'] }
vi.mock('react-router-dom', () => ({
    useLocation: vi.fn(() => ({ state: mockLocationState })),
    useNavigate: vi.fn()
}))

const mockExtractTables = vi.fn()
const mockGetApiKey = vi.fn()
const mockGetActiveProvider = vi.fn()


beforeEach(() => {
    vi.clearAllMocks()
    window.api = {
        saveApiKey: vi.fn(),
        getApiKey: vi.fn(),
        getActiveProvider: vi.fn(),
        testConnection: vi.fn(),
        extractTables: vi.fn(),
        exportExcel: vi.fn(),
        exportMarkdown: vi.fn(),
        analyzeFinancials: vi.fn(),
        onAnalysisChunk: vi.fn(() => vi.fn()),
        onAnalysisDone: vi.fn(() => vi.fn()),
        onAnalysisError: vi.fn(() => vi.fn())
    }
})

describe('DataVerification Component', () => {

    it('renders empty placeholder if no images present', () => {
        // override location mock for this test
        const previousState = mockLocationState
        mockLocationState = {}

        render(<DataVerification />)
        expect(screen.getByText('没有收到底层发送的 PDF 图片集')).toBeInTheDocument()

        // restore
        mockLocationState = previousState
    })

    it('displays loading state and fetches data automatically', async () => {
        mockGetActiveProvider.mockResolvedValueOnce('openai')
        mockGetApiKey.mockResolvedValueOnce({ provider: 'openai', apiKey: 'test' })

        // Return a delayed promise to inspect loading state
        let resolveExtraction: any
        mockExtractTables.mockReturnValueOnce(new Promise(res => resolveExtraction = res))

        render(<DataVerification />)

        expect(screen.getByText(/正在连通云端多模态大模型/i)).toBeInTheDocument()

        resolveExtraction({
            balanceSheet: [{ Item: 'Cash', Value: '100' }],
            incomeStatement: [],
            cashFlowStatement: []
        })

        await waitFor(() => {
            expect(screen.queryByText(/正在连通云端多模态大模型/i)).not.toBeInTheDocument()
            expect(screen.getByText('Item')).toBeInTheDocument()
            expect(screen.getByText('Value')).toBeInTheDocument()
        })
    })

    it('shows error if API extraction fails', async () => {
        mockGetActiveProvider.mockResolvedValueOnce('openai')
        mockGetApiKey.mockResolvedValueOnce({ provider: 'openai', apiKey: 'test' })
        mockExtractTables.mockRejectedValueOnce(new Error('Network error LLM'))

        render(<DataVerification />)

        await waitFor(() => {
            expect(screen.getByText('Network error LLM')).toBeInTheDocument()
        })
    })
})
