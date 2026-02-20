import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  saveApiKey: (payload: { provider: string, key: string, baseURL?: string, modelName?: string }) => ipcRenderer.invoke('invoke:settings:saveKey', payload),
  getApiKey: (provider: string) => ipcRenderer.invoke('invoke:settings:getKey', provider),
  getActiveProvider: () => ipcRenderer.invoke('invoke:settings:getActiveProvider'),
  testConnection: (payload: { provider: string, apiKey: string, baseUrl?: string, modelName?: string }) => ipcRenderer.invoke('invoke:llm:testConnection', payload),
  extractTables: (payload: { provider: string, imagesBase64: string[] }) => ipcRenderer.invoke('invoke:llm:extractTables', payload),
  exportExcel: (payload: any) => ipcRenderer.invoke('invoke:export:excel', payload),
  exportMarkdown: (payload: { content: string }) => ipcRenderer.invoke('invoke:export:markdown', payload),
  // 流式财务分析 API
  analyzeFinancials: (payload: { provider: string, data: any }) => ipcRenderer.invoke('invoke:llm:analyzeFinancials', payload),
  onAnalysisChunk: (callback: (chunk: string) => void) => {
    const handler = (_event: any, chunk: string) => callback(chunk)
    ipcRenderer.on('stream:analysis:chunk', handler)
    return () => ipcRenderer.removeListener('stream:analysis:chunk', handler)
  },
  onAnalysisDone: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('stream:analysis:done', handler)
    return () => ipcRenderer.removeListener('stream:analysis:done', handler)
  },
  onAnalysisError: (callback: (error: string) => void) => {
    const handler = (_event: any, error: string) => callback(error)
    ipcRenderer.on('stream:analysis:error', handler)
    return () => ipcRenderer.removeListener('stream:analysis:error', handler)
  },
}
// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
