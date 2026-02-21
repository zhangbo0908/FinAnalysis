import { useState, useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { VirtualTable, EditableCell } from '../components/ui/VirtualTable'
import { Button } from '../components/ui/button'
import { Loader2, Download, AlertCircle, BarChart3 } from 'lucide-react'
import { createColumnHelper } from '@tanstack/react-table'

// 动态创建两栏表结构以便映射 JSON 数据（键值对展示）
const columnHelper = createColumnHelper<any>()

function generateColumnsFromData(data: Record<string, any>[]) {
    if (!data || data.length === 0) return []
    const keys = Object.keys(data[0])
    return keys.map(key =>
        columnHelper.accessor(key, {
            header: key,
            cell: EditableCell,
            // Provide a sensible sizing logic or minSize
        })
    )
}

export function DataVerification() {
    const location = useLocation()
    // images passed from ImportParse
    const imagesBase64: string[] = location.state?.imagesBase64 || []
    const navigate = useNavigate()

    const [isExtracting, setIsExtracting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // We expect the LLM to return a structure containing these arrays
    const [balanceSheet, setBalanceSheet] = useState<Record<string, any>[]>([])
    const [incomeStatement, setIncomeStatement] = useState<Record<string, any>[]>([])
    const [cashFlowStatement, setCashFlowStatement] = useState<Record<string, any>[]>([])

    // Active tab for the spreadsheet view
    const [activeTab, setActiveTab] = useState<'balance' | 'income' | 'cashflow'>('balance')

    // Ref to prevent StrictMode double invoke
    const hasRequestedRef = useRef(false)

    // Current active provider friendly name
    const [providerName, setProviderName] = useState<string>('LLM')

    const providerMap: Record<string, string> = {
        openai: 'OpenAI',
        anthropic: 'Anthropic (Claude)',
        gemini: 'Google Gemini',
        deepseek: 'DeepSeek',
        custom: '自定义大模型'
    }

    useEffect(() => {
        if (imagesBase64.length > 0 && balanceSheet.length === 0 && !isExtracting && !error && !hasRequestedRef.current) {
            hasRequestedRef.current = true
            handleExtraction()
        }
    }, [imagesBase64])

    // 当前正在处理的图片索引（用于显示进度）
    const [currentImageIndex, setCurrentImageIndex] = useState(0)

    const handleExtraction = async () => {
        if (!window.api || !window.api.extractTables) return
        setIsExtracting(true)
        setError(null)

        try {
            const activeProvider = await window.api.getActiveProvider() || 'gemini'
            const currentSettings = await window.api.getApiKey(activeProvider)

            if (activeProvider && providerMap[activeProvider]) {
                setProviderName(providerMap[activeProvider])
            }

            if (!currentSettings) {
                throw new Error(`系统选定的服务商 '${activeProvider}' 尚未配置 API Key。请前往设置页填写并保存。`)
            }

            // 逐张图片发送，逐表回显
            for (let i = 0; i < imagesBase64.length; i++) {
                setCurrentImageIndex(i + 1)
                const payload = {
                    provider: activeProvider,
                    imagesBase64: [imagesBase64[i]]   // 每次只发一张
                }

                const response = await window.api.extractTables(payload)

                // 追加而非覆盖：只更新有数据返回的表
                if (response.balanceSheet && response.balanceSheet.length > 0) {
                    setBalanceSheet(prev => [...prev, ...response.balanceSheet])
                }
                if (response.incomeStatement && response.incomeStatement.length > 0) {
                    setIncomeStatement(prev => [...prev, ...response.incomeStatement])
                }
                if (response.cashFlowStatement && response.cashFlowStatement.length > 0) {
                    setCashFlowStatement(prev => [...prev, ...response.cashFlowStatement])
                }
            }

        } catch (err: any) {
            hasRequestedRef.current = false
            console.error('Extraction Error:', err)
            setError(err.message || '通过大模型提取财务报表失败。请检查配置页的网络代理与 API Key 是否正确有效。')
        } finally {
            setIsExtracting(false)
        }
    }

    const handleExport = async () => {
        if (!window.api || !window.api.exportExcel) return
        try {
            const dataToExport = {
                balanceSheet,
                incomeStatement,
                cashFlowStatement
            }
            const res = await window.api.exportExcel(dataToExport)
            if (res.success) {
                // 暂时用原生弹窗，可以用 shadcn toast 替换
                alert('Excel 导出成功！文件已保存在：\n' + res.filePath)
            } else {
                alert('导出失败: ' + res.error)
            }
        } catch (error: any) {
            alert('导出遇到异常: ' + error.message)
        }
    }

    const activeData = useMemo(() => {
        if (activeTab === 'balance') return balanceSheet
        if (activeTab === 'income') return incomeStatement
        return cashFlowStatement
    }, [activeTab, balanceSheet, incomeStatement, cashFlowStatement])

    const activeSetter = activeTab === 'balance' ? setBalanceSheet :
        activeTab === 'income' ? setIncomeStatement : setCashFlowStatement

    const columns = useMemo(() => generateColumnsFromData(activeData), [activeData])

    if (imagesBase64.length === 0) {
        return (
            <div className="p-8 h-full flex items-center justify-center">
                <div className="text-center space-y-4">
                    <p className="text-muted-foreground">没有收到底层发送的 PDF 图片集</p>
                    <Button variant="outline" onClick={() => window.history.back()}>返回导入页重选此表</Button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Left Hand Side: Picture Viewer (For Verification) */}
            <div className="w-1/2 border-r bg-muted/20 p-4 overflow-y-auto space-y-4">
                <div className="sticky top-0 bg-background/80 backdrop-blur-sm p-4 rounded-md shadow-sm z-10 font-semibold mb-4">
                    原表预览阅览区 ({imagesBase64.length} 页)
                </div>
                {imagesBase64.map((src, index) => (
                    <img
                        key={index}
                        src={src}
                        alt={`Page ${index + 1}`}
                        className="w-full border rounded-md shadow-sm mb-4"
                    />
                ))}
            </div>

            {/* Right Hand Side: VLM Extracted Table & Actions */}
            <div className="w-1/2 flex flex-col bg-background">
                {/* Header Actions */}
                <div className="p-4 border-b flex justify-between items-center bg-card">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold">结构化数据校对工作台</h1>
                            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                                引擎: {providerName}
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground">人工核对右侧大模型抽取的数值。您可直接点击单元格修改勘误。</p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                navigate('/reporting', {
                                    state: {
                                        financialData: {
                                            balanceSheet,
                                            incomeStatement,
                                            cashFlowStatement,
                                        }
                                    }
                                })
                            }}
                            disabled={isExtracting || (balanceSheet.length === 0 && incomeStatement.length === 0 && cashFlowStatement.length === 0)}
                            className="gap-2"
                        >
                            <BarChart3 className="w-4 h-4" /> 跳转分析 →
                        </Button>
                        <Button onClick={handleExport} disabled={isExtracting || balanceSheet.length === 0} className="gap-2">
                            <Download className="w-4 h-4" /> 导出至 Excel
                        </Button>
                    </div>
                </div>

                {/* State Views */}
                <div className="flex-1 overflow-hidden relative p-4 flex flex-col">
                    {isExtracting ? (
                        <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-sm flex flex-col items-center justify-center space-y-4">
                            <Loader2 className="w-10 h-10 text-primary animate-spin" />
                            <p className="font-semibold text-lg text-primary animate-pulse w-64 text-center">正在处理第 {currentImageIndex} / {imagesBase64.length} 张图片<br />请耐心等待 {providerName} 思考...</p>
                        </div>
                    ) : error ? (
                        <div className="absolute inset-0 z-10 flex items-center justify-center p-8">
                            <div className="p-6 bg-destructive/10 text-destructive rounded-xl border border-destructive max-w-md text-center space-y-4 shadow-sm">
                                <AlertCircle className="w-10 h-10 mx-auto" />
                                <p className="font-semibold text-lg">大模型推演中断</p>
                                <p className="text-sm opacity-90">{error}</p>
                                <Button variant="outline" className="mt-4 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={handleExtraction}>
                                    重试连接
                                </Button>
                            </div>
                        </div>
                    ) : null}

                    {/* Table View Tab Header */}
                    <div className="flex space-x-2 border-b mb-4">
                        <button
                            className={`px-4 py-2 font-medium ${activeTab === 'balance' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={() => setActiveTab('balance')}
                        >
                            资产负债表
                        </button>
                        <button
                            className={`px-4 py-2 font-medium ${activeTab === 'income' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={() => setActiveTab('income')}
                        >
                            利润表
                        </button>
                        <button
                            className={`px-4 py-2 font-medium ${activeTab === 'cashflow' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={() => setActiveTab('cashflow')}
                        >
                            现金流量表
                        </button>
                    </div>

                    {/* Table Render Container */}
                    <div className="flex-1 overflow-hidden">
                        <VirtualTable
                            data={activeData}
                            columns={columns}
                            onDataChange={(newData) => activeSetter(newData)}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
