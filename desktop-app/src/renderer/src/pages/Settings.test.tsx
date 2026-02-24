/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Settings } from './Settings'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Electron IPC API
const mockSaveApiKey = vi.fn()
const mockGetApiKey = vi.fn()
const mockGetActiveProvider = vi.fn()

beforeEach(() => {
    vi.clearAllMocks()
    mockGetActiveProvider.mockResolvedValue('gemini') // Default to gemini to avoid breaking old tests
    window.api = {
        saveApiKey: mockSaveApiKey,
        getApiKey: mockGetApiKey as any,
        getActiveProvider: mockGetActiveProvider,
        testConnection: vi.fn(),
        extractTables: vi.fn(),
        exportExcel: vi.fn(),
        exportMarkdown: vi.fn(),
        analyzeFinancials: vi.fn(),
        onAnalysisChunk: vi.fn(() => vi.fn()),
        onAnalysisDone: vi.fn(() => vi.fn()),
        onAnalysisError: vi.fn(() => vi.fn())
    } as any
})

describe('Settings Component', () => {
    it('renders correctly', () => {
        mockGetApiKey.mockResolvedValueOnce(null)
        render(<Settings />)
        expect(screen.getByText('模型设置与密钥')).toBeInTheDocument()
    })

    it('loads existing API key correctly', async () => {
        mockGetActiveProvider.mockResolvedValue('openai')
        mockGetApiKey.mockResolvedValue({ apiKey: 'sk-test12345', provider: 'openai', baseUrl: '' })

        render(<Settings />)

        // API load is async
        await waitFor(() => {
            const input = screen.getByPlaceholderText(/请输入您的 API Key/i) as HTMLInputElement
            expect(input.value).toBe('sk-test12345')
        })
    })

    it('allows user to type and save API key', async () => {
        mockGetActiveProvider.mockResolvedValue('openai')
        mockGetApiKey.mockResolvedValue(null)
        mockSaveApiKey.mockResolvedValue({ success: true })

        render(<Settings />)

        // Wait for initial load
        await waitFor(() => expect(mockGetActiveProvider).toHaveBeenCalled())

        const input = screen.getByPlaceholderText(/请输入您的 API Key/i)
        fireEvent.change(input, { target: { value: 'sk-newkey' } })

        const saveButton = screen.getByRole('button', { name: /保存/i })
        fireEvent.click(saveButton)

        await waitFor(() => {
            expect(mockSaveApiKey).toHaveBeenCalledWith({
                provider: 'openai',
                key: 'sk-newkey',
                baseURL: 'https://api.openai.com/v1',
                modelName: ''
            })
        })
    })

})

