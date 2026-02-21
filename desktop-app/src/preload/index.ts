import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  saveApiKey: (payload: { provider: string, key: string, baseURL?: string, modelName?: string }) => ipcRenderer.invoke('invoke:settings:saveKey', payload),
  getApiKey: (provider: string) => ipcRenderer.invoke('invoke:settings:getKey', provider),
  getActiveProvider: () => ipcRenderer.invoke('invoke:settings:getActiveProvider'),
  getActiveRole: () => ipcRenderer.invoke('invoke:settings:getActiveRole'),
  saveActiveRole: (role: string) => ipcRenderer.invoke('invoke:settings:saveActiveRole', role),
  getRolePrompts: () => ipcRenderer.invoke('invoke:settings:getRolePrompts'),
  getAnalyPrompt: (role: string) => ipcRenderer.invoke('invoke:settings:getAnalyPrompt', role),
  saveAnalyPrompt: (payload: { prompt: string, role: string }) => ipcRenderer.invoke('invoke:settings:saveAnalyPrompt', payload),

  // pdf extraction
  splitPdfToImages: (filePath: string) => ipcRenderer.invoke('invoke:pdf:splitToImages', filePath),

  // llm operations
  extractTables: (payload: { provider: string, imagesBase64: string[] }) => ipcRenderer.invoke('invoke:llm:extractTables', payload),
  onExtractWarning: (callback: (msg: string) => void) => {
    const handler = (_event: any, msg: string) => callback(msg)
    ipcRenderer.on('stream:extract:warning', handler)
    return () => ipcRenderer.removeListener('stream:extract:warning', handler)
  },
  parseLocalExcel: (fileData: ArrayBuffer) => ipcRenderer.invoke('invoke:excel:parseLocal', fileData),
  testConnection: (payload: { provider: string, apiKey: string, baseUrl?: string, modelName?: string }) => ipcRenderer.invoke('invoke:llm:testConnection', payload),
  analyzeFinancials: (payload: { provider: string, data: any, prompt?: string }) => ipcRenderer.invoke('invoke:llm:analyzeFinancials', payload),
  exportExcel: (payload: any) => ipcRenderer.invoke('invoke:export:excel', payload),
  exportMarkdown: (payload: { content: string }) => ipcRenderer.invoke('invoke:export:markdown', payload),
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
