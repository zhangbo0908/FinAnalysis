import * as pdfjsLib from 'pdfjs-dist'

import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Set worker source to match the exact version we installed
// Note: In Vite/Electron, we use the ?url suffix to correctly resolve the worker asset
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export interface PdfProcessResult {
    imagesBase64: string[]
    totalPages: number
}

// 可选：允许通过回调返回切片进度
export type ProgressCallback = (current: number, total: number) => void

/**
 * Parses a given PDF file and converts each page to a Base64 encoded JPEG image.
 * Uses pure frontend execution via HTML5 Canvas.
 */
export async function convertPdfToImages(file: File, onProgress?: ProgressCallback): Promise<PdfProcessResult> {
    const arrayBuffer = await file.arrayBuffer()

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
    const pdfDocument = await loadingTask.promise
    const numPages = pdfDocument.numPages

    const imagesBase64: string[] = []

    // Create a temporary canvas outside the DOM
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
        throw new Error('Canvas 2D context not available')
    }

    // Define scale for higher quality output (2.0 = 200% scale)
    // 保持较高的分辨率供给 VLM 识别细小表格数字
    const scale = 2.0

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum)
        const viewport = page.getViewport({ scale })

        canvas.height = viewport.height
        canvas.width = viewport.width

        const renderContext = {
            canvasContext: ctx,
            viewport: viewport,
            canvas: canvas
        }

        // Wait for the render task to complete
        await page.render(renderContext).promise

        // Convert canvas to base64 JPEG
        const base64Data = canvas.toDataURL('image/jpeg', 0.95)
        imagesBase64.push(base64Data)

        // Notify progress
        if (onProgress) {
            onProgress(pageNum, numPages)
        }
    }

    return {
        imagesBase64,
        totalPages: numPages
    }
}
