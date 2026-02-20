/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ImportParse } from './ImportParse'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../lib/pdfService', () => ({
    convertPdfToImages: vi.fn(),
}))

import * as pdfService from '../lib/pdfService'

describe('ImportParse Component', () => {
    it('renders the dropzone correctly', () => {
        render(<MemoryRouter><ImportParse /></MemoryRouter>)
        expect(screen.getByText('导入与预处理台')).toBeInTheDocument()
        expect(screen.getByText(/点击或拖拽上传财报/i)).toBeInTheDocument()
    })

    it('shows mock progress and result when a file is processed', async () => {
        const mockConvert = vi.mocked(pdfService.convertPdfToImages)
        // 模拟一个假的结果返回
        mockConvert.mockImplementation(async (_file, onProgress) => {
            if (onProgress) {
                onProgress(50, 100) // Call progress to hit the progress line
            }
            return {
                imagesBase64: ['data:image/jpeg;base64,mock'],
                totalPages: 1
            }
        })

        render(<MemoryRouter><ImportParse /></MemoryRouter>)

        // Find the hidden input
        const input = document.getElementById('file-upload') as HTMLInputElement

        // mock a PDF file
        const file = new File(['dummy content'], 'report.pdf', { type: 'application/pdf' })
        fireEvent.change(input, { target: { files: [file] } })

        // It should eventually show the result
        await waitFor(() => {
            expect(screen.getByText('切片成功 (共 1 页)')).toBeInTheDocument()
            expect(screen.getByText('调用 VLM 进行财务大表抽取 ✨')).toBeInTheDocument()
        })
    })

    it('shows error message if PDF process fails', async () => {
        const mockConvert = vi.mocked(pdfService.convertPdfToImages)
        mockConvert.mockRejectedValueOnce(new Error('PDF 损坏了'))

        render(<MemoryRouter><ImportParse /></MemoryRouter>)

        const input = document.getElementById('file-upload') as HTMLInputElement
        const file = new File(['dummy'], 'bad.pdf', { type: 'application/pdf' })
        fireEvent.change(input, { target: { files: [file] } })

        await waitFor(() => {
            expect(screen.getByText('PDF 损坏了')).toBeInTheDocument()
            expect(screen.getByText('重新上传试试')).toBeInTheDocument()
        })
    })
})
