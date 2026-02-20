import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { initDatabase, saveApiKey, getApiKey, closeDatabase } from './database'
import fs from 'fs'
import path from 'path'

const testDbPath = path.join(__dirname, 'test.sqlite')

describe('Database Key Management', () => {
    beforeEach(() => {
        // 确保每次测试前重新连接并建表
        initDatabase(testDbPath)
    })

    afterEach(() => {
        // 清理数据库连接及文件
        closeDatabase()
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath)
        }
    })

    it('could init database tables', () => {
        expect(() => initDatabase(testDbPath)).not.toThrow()
    })

    it('could save and retrieve an API key', () => {
        const provider = 'openai'
        const key = 'sk-1234567890'
        const baseUrl = 'https://api.openai.com/v1'

        saveApiKey(provider, key, baseUrl)

        const retrieved = getApiKey(provider)
        expect(retrieved).not.toBeNull()
        expect(retrieved?.provider).toBe(provider)
        expect(retrieved?.apiKey).toBe(key)
        expect(retrieved?.baseUrl).toBe(baseUrl)
    })

    it('could update existing API key', () => {
        const provider = 'deepseek'
        saveApiKey(provider, 'sk-old', 'url1')
        saveApiKey(provider, 'sk-new', 'url2')

        const retrieved = getApiKey(provider)
        expect(retrieved?.apiKey).toBe('sk-new')
        expect(retrieved?.baseUrl).toBe('url2')
    })
})
