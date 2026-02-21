/// <reference types="vite/client" />

interface Window {
    // expose in the `electron/preload/index.ts`
    ipcRenderer: import('electron').IpcRenderer
    api: {
        saveApiKey: (payload: { provider: string, key: string, baseURL?: string, modelName?: string }) => Promise<{ success: boolean, error?: string }>
        getApiKey: (provider: string) => Promise<{ provider: string, apiKey: string, baseUrl?: string, modelName?: string } | null>
        getActiveProvider: () => Promise<string>
        getActiveRole: () => Promise<string>
        saveActiveRole: (role: string) => Promise<{ success: boolean, error?: string }>
        getRolePrompts: () => Promise<Record<string, string>>
        getAnalyPrompt: (role: string) => Promise<string | null>
        saveAnalyPrompt: (payload: { prompt: string, role: string }) => Promise<{ success: boolean, error?: string }>

        splitPdfToImages: (filePath: string) => Promise<{ imagesBase64: string[], totalPages: number }>
        extractTables: (payload: { provider: string, imagesBase64: string[] }) => Promise<{
            balanceSheet: Record<string, any>[]
            incomeStatement: Record<string, any>[]
            cashFlowStatement: Record<string, any>[]
        }>
        onExtractWarning: (callback: (msg: string) => void) => () => void
        parseLocalExcel: (fileData: ArrayBuffer) => Promise<{
            balanceSheet: Record<string, any>[]
            incomeStatement: Record<string, any>[]
            cashFlowStatement: Record<string, any>[]
        }>
        testConnection: (payload: { provider: string, apiKey: string, baseUrl?: string, modelName?: string }) => Promise<{ success: boolean, error?: string }>
        analyzeFinancials: (payload: { provider: string, data: any, prompt?: string }) => Promise<{ success: boolean, error?: string }>

        onAnalysisChunk: (callback: (chunk: string) => void) => () => void
        onAnalysisDone: (callback: () => void) => () => void
        onAnalysisError: (callback: (error: string) => void) => () => void

        exportExcel: (payload: any) => Promise<{ success: boolean, filePath?: string, error?: string }>
        exportMarkdown: (payload: { content: string }) => Promise<{ success: boolean, filePath?: string, error?: string }>
    }
}
