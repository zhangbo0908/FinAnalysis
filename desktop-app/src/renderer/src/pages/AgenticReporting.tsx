import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Loader2, FileText, BarChart3, Banknote, PlayCircle, RefreshCw, AlertCircle, Download } from 'lucide-react'

type AnalysisState = 'empty' | 'ready' | 'streaming' | 'done' | 'error'

export function AgenticReporting() {
    const location = useLocation()

    // 从校对台传递过来的三表数据
    const passedData = location.state?.financialData || null

    const [balanceSheet, setBalanceSheet] = useState<Record<string, any>[]>(passedData?.balanceSheet || [])
    const [incomeStatement, setIncomeStatement] = useState<Record<string, any>[]>(passedData?.incomeStatement || [])
    const [cashFlowStatement, setCashFlowStatement] = useState<Record<string, any>[]>(passedData?.cashFlowStatement || [])

    const [analysisState, setAnalysisState] = useState<AnalysisState>(passedData ? 'ready' : 'empty')
    const [markdownContent, setMarkdownContent] = useState('')
    const [error, setError] = useState<string | null>(null)

    const markdownEndRef = useRef<HTMLDivElement>(null)
    const cleanupRefs = useRef<Array<() => void>>([])

    // 自动滚动到底部
    useEffect(() => {
        if (markdownEndRef.current && analysisState === 'streaming') {
            markdownEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [markdownContent, analysisState])

    // 清理 IPC 监听器
    useEffect(() => {
        return () => {
            cleanupRefs.current.forEach(fn => fn())
            cleanupRefs.current = []
        }
    }, [])

    // 判断数据是否就绪
    const hasData = balanceSheet.length > 0 || incomeStatement.length > 0 || cashFlowStatement.length > 0

    // 更新来自 location state 的数据
    useEffect(() => {
        if (passedData) {
            if (passedData.balanceSheet) setBalanceSheet(passedData.balanceSheet)
            if (passedData.incomeStatement) setIncomeStatement(passedData.incomeStatement)
            if (passedData.cashFlowStatement) setCashFlowStatement(passedData.cashFlowStatement)
            setAnalysisState('ready')
        }
    }, [passedData])

    const handleStartAnalysis = async () => {
        if (!window.api || !window.api.analyzeFinancials) return

        setAnalysisState('streaming')
        setMarkdownContent('')
        setError(null)

        // 注册流式事件监听器
        const api = window.api as any

        const cleanupChunk = api.onAnalysisChunk((chunk: string) => {
            setMarkdownContent(prev => prev + chunk)
        })
        const cleanupDone = api.onAnalysisDone(() => {
            setAnalysisState('done')
        })
        const cleanupError = api.onAnalysisError((errMsg: string) => {
            setError(errMsg)
            setAnalysisState('error')
        })

        cleanupRefs.current = [cleanupChunk, cleanupDone, cleanupError]

        try {
            const activeProvider = await api.getActiveProvider() || 'gemini'

            await api.analyzeFinancials({
                provider: activeProvider,
                data: {
                    balanceSheet,
                    incomeStatement,
                    cashFlowStatement,
                }
            })
        } catch (err: any) {
            setError(err.message)
            setAnalysisState('error')
        }
    }

    const handleExportMarkdown = async () => {
        if (!markdownContent) return
        try {
            const result = await (window.api as any).exportMarkdown({ content: markdownContent })
            if (result.success) {
                alert(`报告已导出至: ${result.filePath}`)
            } else {
                alert(`导出失败: ${result.error}`)
            }
        } catch (err: any) {
            alert(`导出失败: ${err.message}`)
        }
    }

    return (
        <div className="flex h-screen overflow-hidden">
            {/* 左侧：数据源概览 */}
            <div className="w-72 border-r bg-muted/20 p-4 flex flex-col">
                <h2 className="text-lg font-bold mb-4">数据源概览</h2>

                <div className="space-y-3 flex-1">
                    <Card className={`transition-all ${balanceSheet.length > 0 ? 'border-primary/50 bg-primary/5' : 'opacity-50'}`}>
                        <CardContent className="p-3 flex items-center gap-3">
                            <FileText className="w-5 h-5 text-primary" />
                            <div className="flex-1">
                                <p className="text-sm font-medium">资产负债表</p>
                                <p className="text-xs text-muted-foreground">
                                    {balanceSheet.length > 0 ? `${balanceSheet.length} 行 · ✅ 已加载` : '未加载'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className={`transition-all ${incomeStatement.length > 0 ? 'border-primary/50 bg-primary/5' : 'opacity-50'}`}>
                        <CardContent className="p-3 flex items-center gap-3">
                            <BarChart3 className="w-5 h-5 text-primary" />
                            <div className="flex-1">
                                <p className="text-sm font-medium">利润表</p>
                                <p className="text-xs text-muted-foreground">
                                    {incomeStatement.length > 0 ? `${incomeStatement.length} 行 · ✅ 已加载` : '未加载'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className={`transition-all ${cashFlowStatement.length > 0 ? 'border-primary/50 bg-primary/5' : 'opacity-50'}`}>
                        <CardContent className="p-3 flex items-center gap-3">
                            <Banknote className="w-5 h-5 text-primary" />
                            <div className="flex-1">
                                <p className="text-sm font-medium">现金流量表</p>
                                <p className="text-xs text-muted-foreground">
                                    {cashFlowStatement.length > 0 ? `${cashFlowStatement.length} 行 · ✅ 已加载` : '未加载'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* 操作按钮 */}
                <div className="pt-4 border-t space-y-2">
                    {analysisState === 'streaming' ? (
                        <Button disabled className="w-full gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> 分析中...
                        </Button>
                    ) : analysisState === 'done' ? (
                        <Button onClick={handleStartAnalysis} variant="outline" className="w-full gap-2">
                            <RefreshCw className="w-4 h-4" /> 重新分析
                        </Button>
                    ) : (
                        <Button
                            onClick={handleStartAnalysis}
                            disabled={!hasData}
                            className="w-full gap-2"
                        >
                            <PlayCircle className="w-4 h-4" /> 开始分析 ✨
                        </Button>
                    )}
                </div>
            </div>

            {/* 右侧：AI 分析报告区 */}
            <div className="flex-1 flex flex-col bg-background overflow-hidden">
                {/* 顶部标题栏 */}
                <div className="p-4 border-b flex justify-between items-center bg-card">
                    <div>
                        <h1 className="text-xl font-bold">📊 智能财务分析推演</h1>
                        <p className="text-sm text-muted-foreground">基于大模型的五维度财务健康度深度分析</p>
                    </div>
                    {analysisState === 'done' && (
                        <Button onClick={handleExportMarkdown} variant="outline" className="gap-2">
                            <Download className="w-4 h-4" /> 导出 Markdown
                        </Button>
                    )}
                </div>

                {/* 流式进度条 */}
                {analysisState === 'streaming' && (
                    <div className="h-1 bg-muted overflow-hidden">
                        <div className="h-full bg-purple-500 animate-pulse" style={{ width: '100%' }} />
                    </div>
                )}

                {/* 内容区 */}
                <div className="flex-1 overflow-y-auto p-6">
                    {analysisState === 'empty' && (
                        <div className="h-full flex items-center justify-center">
                            <div className="text-center space-y-4 max-w-md">
                                <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                                    <BarChart3 className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold">暂无财务数据</h3>
                                <p className="text-muted-foreground text-sm">
                                    请先在校对工作台完成三大表的数据提取和验证，然后点击"跳转分析"按钮携带数据到此页面，或者直接在校对台完成后通过侧边栏导航至此。
                                </p>
                            </div>
                        </div>
                    )}

                    {analysisState === 'error' && (
                        <div className="h-full flex items-center justify-center">
                            <div className="p-6 bg-destructive/10 text-destructive rounded-xl border border-destructive max-w-md text-center space-y-4">
                                <AlertCircle className="w-10 h-10 mx-auto" />
                                <p className="font-semibold text-lg">分析推演中断</p>
                                <p className="text-sm opacity-90">{error}</p>
                                <Button variant="outline" className="border-destructive text-destructive" onClick={handleStartAnalysis}>
                                    重试分析
                                </Button>
                            </div>
                        </div>
                    )}

                    {(analysisState === 'ready') && markdownContent === '' && (
                        <div className="h-full flex items-center justify-center">
                            <div className="text-center space-y-4 max-w-md">
                                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                                    <PlayCircle className="w-8 h-8 text-primary" />
                                </div>
                                <h3 className="text-lg font-semibold">数据已就绪</h3>
                                <p className="text-muted-foreground text-sm">
                                    三大表数据已加载完毕。点击左侧面板的"开始分析"按钮，大模型将为您生成五维度专业财务分析报告。
                                </p>
                            </div>
                        </div>
                    )}

                    {(analysisState === 'streaming' || analysisState === 'done') && (
                        <article className="prose prose-slate dark:prose-invert max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {markdownContent}
                            </ReactMarkdown>
                            {analysisState === 'streaming' && (
                                <span className="inline-block w-2 h-5 bg-primary animate-pulse ml-1" />
                            )}
                            <div ref={markdownEndRef} />
                        </article>
                    )}
                </div>
            </div>
        </div>
    )
}
