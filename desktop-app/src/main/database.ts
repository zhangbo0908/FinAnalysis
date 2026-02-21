import Database from 'better-sqlite3'

let db: ReturnType<typeof Database> | null = null

export interface ApiKeyRecord {
    provider: string
    apiKey: string
    baseUrl: string | null
    modelName: string | null
    updatedAt: string
}

export function initDatabase(dbPath: string): void {
    // 如果已存在连接先关闭
    if (db) {
        db.close()
    }
    try {
        db = new Database(dbPath)

        // 1. 设置表：用来存储 LLM 的模型提供商密钥和其他参数
        db.exec(`
        CREATE TABLE IF NOT EXISTS api_keys (
          provider TEXT PRIMARY KEY,
          api_key TEXT NOT NULL,
          base_url TEXT,
          model_name TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)

        // Migration for existing tables
        try {
            db.exec(`ALTER TABLE api_keys ADD COLUMN model_name TEXT`)
        } catch (err: any) {
            // Ignore error if column already exists
        }

        // 2. 补充配置表：用于记录当前系统全局激活的 Provider
        db.exec(`
        CREATE TABLE IF NOT EXISTS app_config (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
        `)
        // 初始化插入一条记录作为缺省项
        db.exec(`INSERT OR IGNORE INTO app_config (key, value) VALUES ('active_provider', 'gemini')`)

    } catch (err) {
        console.error('Failed to initialize local sqlite database:', err)
        throw err
    }
}

export function setActiveProvider(provider: string): void {
    if (!db) throw new Error('Database not initialized')
    const stmt = db.prepare(`
    INSERT INTO app_config (key, value) VALUES ('active_provider', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `)
    stmt.run(provider)
}

export function getActiveProvider(): string {
    if (!db) throw new Error('Database not initialized')
    const stmt = db.prepare(`SELECT value FROM app_config WHERE key = 'active_provider'`)
    const row = stmt.get() as { value: string } | undefined
    return row ? row.value : 'gemini'
}

export function saveActiveRole(role: string): void {
    if (!db) throw new Error('Database not initialized')
    const stmt = db.prepare(`
    INSERT INTO app_config (key, value) VALUES ('active_role', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `)
    stmt.run(role)
}

export function getActiveRole(): string {
    if (!db) throw new Error('Database not initialized')
    const stmt = db.prepare(`SELECT value FROM app_config WHERE key = 'active_role'`)
    const row = stmt.get() as { value: string } | undefined
    return row ? row.value : 'audit'
}

export function saveAnalyPrompt(prompt: string, role: string = 'audit'): void {
    if (!db) throw new Error('Database not initialized')
    const key = `analy_prompt_${role}`
    const stmt = db.prepare(`
    INSERT INTO app_config (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `)
    stmt.run(key, prompt)
}

export function getAnalyPrompt(role: string = 'audit'): string | null {
    if (!db) throw new Error('Database not initialized')
    const key = `analy_prompt_${role}`
    const stmt = db.prepare(`SELECT value FROM app_config WHERE key = ?`)
    const row = stmt.get(key) as { value: string } | undefined
    return row ? row.value : null
}

export function saveApiKey(provider: string, apiKey: string, baseUrl?: string, modelName?: string): void {
    if (!db) throw new Error('Database not initialized')

    const stmt = db.prepare(`
    INSERT INTO api_keys (provider, api_key, base_url, model_name, updated_at) 
    VALUES (@provider, @apiKey, @baseUrl, @modelName, CURRENT_TIMESTAMP)
    ON CONFLICT(provider) DO UPDATE SET 
      api_key = excluded.api_key,
      base_url = excluded.base_url,
      model_name = excluded.model_name,
      updated_at = excluded.updated_at
  `)

    stmt.run({
        provider,
        apiKey,
        baseUrl: baseUrl || null,
        modelName: modelName || null
    })

    // Auto set this provider as the active one upon saving credentials
    setActiveProvider(provider)
}

export function getApiKey(provider: string): ApiKeyRecord | null {
    if (!db) throw new Error('Database not initialized')

    const stmt = db.prepare('SELECT provider, api_key as apiKey, base_url as baseUrl, model_name as modelName, updated_at as updatedAt FROM api_keys WHERE provider = ?')
    const row = stmt.get(provider) as ApiKeyRecord | undefined

    return row || null
}

export function closeDatabase(): void {
    if (db) {
        db.close()
        db = null
    }
}
