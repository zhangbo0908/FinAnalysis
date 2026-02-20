/// <reference types="vite/client" />

interface Window {
    electron: ElectronAPI
    api: {
        saveApiKey: (payload: { provider: string; key: string; baseURL?: string; modelName?: string }) => Promise<{ success: boolean; error?: string }>;
        getApiKey: (provider: string) => Promise<{ provider: string; apiKey: string; baseUrl?: string; modelName?: string } | null>;
        getActiveProvider: () => Promise<string>;
        testConnection: (payload: { provider: string; apiKey: string; baseUrl?: string; modelName?: string }) => Promise<{ success: boolean; error?: string }>;
        extractTables: (payload: { provider: string; imagesBase64: string[] }) => Promise<any>;
        exportExcel: (payload: any) => Promise<{ success: boolean; filePath?: string; error?: string }>;
        exportMarkdown: (payload: { content: string }) => Promise<{ success: boolean; filePath?: string; error?: string }>;
        // 流式财务分析
        analyzeFinancials: (payload: { provider: string; data: any }) => Promise<{ success: boolean; error?: string }>;
        onAnalysisChunk: (callback: (chunk: string) => void) => () => void;
        onAnalysisDone: (callback: () => void) => () => void;
        onAnalysisError: (callback: (error: string) => void) => () => void;
    }
}
