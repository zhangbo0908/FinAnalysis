import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

import { initDatabase, closeDatabase, saveApiKey, getApiKey, getActiveProvider } from './database'
import { extractFinancialTables, testLLMConnection } from './services/llmService'
import { exportToExcel } from './services/exportService'
import { generateFinancialAnalysis } from './services/analysisService'
import * as fs from 'fs'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Set up Database
  initDatabase(join(app.getPath('userData'), 'app-finanalysis.sqlite'))

  // Settings IPC Handlers
  ipcMain.handle('invoke:settings:saveKey', async (_, payload: { provider: string, key: string, baseURL?: string, modelName?: string }) => {
    try {
      saveApiKey(payload.provider, payload.key, payload.baseURL, payload.modelName)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('invoke:settings:getKey', async (_, provider: string) => {
    try {
      const data = getApiKey(provider)
      return data
    } catch (err: any) {
      return null
    }
  })

  ipcMain.handle('invoke:settings:getActiveProvider', async () => {
    try {
      return getActiveProvider()
    } catch (err: any) {
      console.error('Error fetching active provider:', err)
      return 'openai'
    }
  })

  // PDF to VLM extract tables
  ipcMain.handle('invoke:llm:extractTables', async (_, payload: { provider: string, imagesBase64: string[] }) => {
    return await extractFinancialTables(payload)
  })

  // Test LLM connection
  ipcMain.handle('invoke:llm:testConnection', async (_, payload: { provider: string, apiKey: string, baseUrl?: string, modelName?: string }) => {
    try {
      await testLLMConnection(payload)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Export to Excel
  ipcMain.handle('invoke:export:excel', async (_, payload: any) => {
    try {
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const filePath = await exportToExcel(payload, `财务三大表_${ts}.xlsx`)
      return { success: true, filePath }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // 导出 Markdown 分析报告
  ipcMain.handle('invoke:export:markdown', async (_, payload: { content: string }) => {
    try {
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const downloadPath = app.getPath('downloads')
      const filePath = join(downloadPath, `三表分析报告_${ts}.md`)
      fs.writeFileSync(filePath, payload.content, 'utf-8')
      return { success: true, filePath }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // 流式财务分析
  ipcMain.handle('invoke:llm:analyzeFinancials', async (event, payload: { provider: string, data: any }) => {
    const sender = event.sender
    try {
      await generateFinancialAnalysis(
        payload.provider,
        payload.data,
        (chunk: string) => sender.send('stream:analysis:chunk', chunk),
        () => sender.send('stream:analysis:done'),
        (error: string) => sender.send('stream:analysis:error', error)
      )
      return { success: true }
    } catch (error: any) {
      sender.send('stream:analysis:error', error.message)
      return { success: false, error: error.message }
    }
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  closeDatabase()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
