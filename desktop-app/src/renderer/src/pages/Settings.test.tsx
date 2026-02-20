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

beforeEach(() => {
    vi.clearAllMocks()
    window.api = {
        saveApiKey: mockSaveApiKey,
        getApiKey: mockGetApiKey as any,
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

describe('Settings Component', () => {
    it('renders correctly', () => {
        mockGetApiKey.mockResolvedValueOnce(null)
        render(<Settings />)
        expect(screen.getByText('模型设置与密钥')).toBeInTheDocument()
    })

    it('loads existing API key correctly', async () => {
        mockGetApiKey.mockResolvedValueOnce({ apiKey: 'sk-test12345', provider: 'openai', baseUrl: '' })
        render(<Settings />)

        // API load is async
        await waitFor(() => {
            const input = screen.getByPlaceholderText(/请输入您的 API Key/i) as HTMLInputElement
            expect(input.value).toBe('sk-test12345')
        })
    })

    it('allows user to type and save API key', async () => {
        mockGetApiKey.mockResolvedValueOnce(null)
        mockSaveApiKey.mockResolvedValueOnce({ success: true })

        render(<Settings />)

        const input = screen.getByPlaceholderText(/请输入您的 API Key/i)
        fireEvent.change(input, { target: { value: 'sk-newkey' } })

        const saveButton = screen.getByRole('button', { name: /保存/i })
        fireEvent.click(saveButton)

        await waitFor(() => {
            expect(mockSaveApiKey).toHaveBeenCalledWith({
                provider: 'openai', // default provider
                key: 'sk-newkey',
                baseURL: ''
            })
        })
    })

    it('allows changing provider to Gemini and saving', async () => {
        mockGetApiKey.mockResolvedValueOnce(null)
        mockSaveApiKey.mockResolvedValueOnce({ success: true })

        render(<Settings />)

        // Find the select trigger (shadcn select)
        const selectTrigger = screen.getByRole('combobox')
        fireEvent.click(selectTrigger)

        // Find and click the Gemini option
        const geminiOption = screen.getByText('Google Gemini')
        fireEvent.click(geminiOption)

        const input = screen.getByPlaceholderText(/请输入您的 API Key/i)
        fireEvent.change(input, { target: { value: 'AIzaSyA-GeminiKey' } })

        const saveButton = screen.getByRole('button', { name: /保存/i })
        fireEvent.click(saveButton)

        await waitFor(() => {
            expect(mockSaveApiKey).toHaveBeenCalledWith({
                provider: 'gemini',
                key: 'AIzaSyA-GeminiKey',
                baseURL: ''
            })
        })
    })
})
