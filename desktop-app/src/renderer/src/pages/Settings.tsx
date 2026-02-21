import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Button } from '../components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/select'

const DEFAULT_BASE_URLS: Record<string, string> = {
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com/v1',
    gemini: 'https://generativelanguage.googleapis.com/',
    deepseek: 'https://api.deepseek.com',
    custom: ''
}

export function Settings() {
    const [provider, setProvider] = useState<string>('gemini')
    const [apiKey, setApiKey] = useState<string>('')
    const [baseUrl, setBaseUrl] = useState<string>('')
    const [modelName, setModelName] = useState<string>('')
    const [isSaving, setIsSaving] = useState(false)
    const [isTesting, setIsTesting] = useState(false)
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null)

    useEffect(() => {
        // Load existing settings when provider changes
        const loadSettings = async () => {
            if (window.api && window.api.getApiKey) {
                const data = await window.api.getApiKey(provider)
                if (data) {
                    setApiKey(data.apiKey || '')
                    setBaseUrl(data.baseUrl || DEFAULT_BASE_URLS[provider] || '')
                    setModelName(data.modelName || '')
                } else {
                    setApiKey('')
                    setBaseUrl(DEFAULT_BASE_URLS[provider] || '')
                    setModelName('')
                }
            }
        }
        loadSettings()
    }, [provider])

    const handleSave = async () => {
        if (!window.api || !window.api.saveApiKey) return
        setIsSaving(true)
        setMessage(null)
        try {
            const res = await window.api.saveApiKey({
                provider,
                key: apiKey,
                baseURL: baseUrl,
                modelName: modelName
            })
            if (res.success) {
                setMessage({ text: '保存成功！', type: 'success' })
            } else {
                setMessage({ text: '保存失败：' + res.error, type: 'error' })
            }
        } catch (err: any) {
            setMessage({ text: '遇到未知错误：' + err.message, type: 'error' })
        } finally {
            setIsSaving(false)
            setTimeout(() => setMessage(null), 3000)
        }
    }

    const handleTest = async () => {
        if (!window.api || !window.api.testConnection) return
        if (!apiKey) {
            setMessage({ text: '请先输入 API Key', type: 'error' })
            return
        }
        setIsTesting(true)
        setMessage({ text: '正在探测网络连通性...', type: 'success' }) // use success color as neutral loading here
        try {
            const res = await window.api.testConnection({
                provider,
                apiKey,
                baseUrl,
                modelName
            })
            if (res.success) {
                setMessage({ text: '✅ 测试通过！可以正常连接大模型。', type: 'success' })
            } else {
                setMessage({ text: '❌ ' + res.error, type: 'error' })
            }
        } catch (err: any) {
            setMessage({ text: '遇到未知错误：' + err.message, type: 'error' })
        } finally {
            setIsTesting(false)
        }
    }

    return (
        <div className="p-8 max-w-2xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold">模型设置与密钥</h1>
            <p className="text-muted-foreground">将您的 AI 模型提供商与 API Key 安全地保存在本地以进行财报分析。所有密钥将利用原生 AES-256 加盐加密，绝不传至任何第三方服务器。</p>

            <Card>
                <CardHeader>
                    <CardTitle>模型提供商偏好</CardTitle>
                    <CardDescription>选择您倾向的 VLM (视觉大语言模型) 服务商。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="provider">云端服务商</Label>
                        <Select value={provider} onValueChange={setProvider}>
                            <SelectTrigger id="provider">
                                <SelectValue placeholder="选择服务商" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="openai">OpenAI</SelectItem>
                                <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                                <SelectItem value="gemini">Google Gemini</SelectItem>
                                <SelectItem value="deepseek">DeepSeek</SelectItem>
                                <SelectItem value="custom">兼容 OpenAI 格式的其他代理</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="apiKey">API Key (令牌密钥)</Label>
                        <Input
                            id="apiKey"
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="请输入您的 API Key，如 sk-..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="baseUrl">Base URL (可选代理地址)</Label>
                        <Input
                            id="baseUrl"
                            type="text"
                            value={baseUrl}
                            onChange={(e) => setBaseUrl(e.target.value)}
                            placeholder="例如 https://api.openai.com/v1"
                        />
                        <p className="text-xs text-muted-foreground">如果您使用代理服务器或者需要覆盖默认的调用端点，请在此配置。</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="modelName">Model ID (模型标识)</Label>
                        <Input
                            id="modelName"
                            type="text"
                            value={modelName}
                            onChange={(e) => setModelName(e.target.value)}
                            placeholder={
                                provider === 'openai' ? 'gpt-4o' :
                                    provider === 'anthropic' ? 'claude-3-5-sonnet-20240620' :
                                        provider === 'gemini' ? 'gemini-1.5-pro' : '自定义模型名'
                            }
                        />
                        <p className="text-xs text-muted-foreground">根据服务商填写对应的可用模型版本名（例如：gpt-4o），留空将使用默认版本。</p>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                    <div className="text-sm">
                        {message && <span className={message.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{message.text}</span>}
                    </div>
                    <div className="flex space-x-2">
                        <Button variant="outline" onClick={handleTest} disabled={isTesting || isSaving || !apiKey}>
                            {isTesting ? '检测中...' : '测试连接'}
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving || isTesting || !apiKey}>
                            {isSaving ? '保存中...' : '保存配置'}
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </div>
    )
}
