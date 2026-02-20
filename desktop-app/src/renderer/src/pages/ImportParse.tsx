import { useState } from 'react'
import { Dropzone } from '../components/ui/dropzone'
import { convertPdfToImages, type PdfProcessResult } from '../lib/pdfService'
import { Card, CardContent } from '../components/ui/card'
import { Loader2, CheckSquare, Square } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'

export function ImportParse() {
    const [isProcessing, setIsProcessing] = useState(false)
    const [progress, setProgress] = useState(0)
    const [result, setResult] = useState<PdfProcessResult | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Set to store the indices of selected images
    const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set())

    const navigate = useNavigate()

    const handleFileAccepted = async (file: File) => {
        setIsProcessing(true)
        setProgress(0)
        setError(null)
        setResult(null)

        try {
            const res = await convertPdfToImages(file, (current, total) => {
                setProgress(Math.round((current / total) * 100))
            })
            setResult(res)
            // 默认不选择任何页面，由用户手动勾选
            setSelectedPages(new Set())
        } catch (err: any) {
            console.error(err)
            setError(err.message || '解析 PDF 失败')
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold">导入与预处理台</h1>
            <p className="text-muted-foreground">将您的财务报表 PDF 拖入下方虚线框进行纯本地图片层析提取。切分后的高清图片流将发往 VLM 模型抽取结构化财报大表。</p>

            {!result && (
                <Dropzone onFileAccepted={handleFileAccepted} isProcessing={isProcessing} />
            )}

            {isProcessing && (
                <div className="flex flex-col items-center justify-center p-8 space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm font-medium">正在进行本地图片切片... {progress}%</p>
                    <div className="w-full max-w-md bg-secondary h-2 rounded-full overflow-hidden">
                        <div
                            className="bg-primary h-full transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}

            {error && (
                <div className="p-4 bg-destructive/10 text-destructive rounded-md border border-destructive">
                    <p className="font-semibold">处理错误</p>
                    <p className="text-sm">{error}</p>
                    <button
                        onClick={() => setError(null)}
                        className="mt-2 text-sm underline hover:no-underline"
                    >
                        重新上传试试
                    </button>
                </div>
            )}

            {result && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center mb-2">
                        <div className="space-y-1">
                            <h2 className="text-xl font-semibold">
                                切片成功 (共 {result.totalPages} 页)
                            </h2>
                            <p className="text-sm text-muted-foreground hidden sm:block">请勾选目标财报三大表所在页，剔除无关注脚和封面可极大加速大模型处理速度。</p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedPages(new Set(result.imagesBase64.map((_, i) => i)))}
                            >
                                全选
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedPages(new Set())}
                            >
                                取消全选
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-muted-foreground hover:text-destructive"
                                onClick={() => setResult(null)}
                            >
                                清空重选
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {result.imagesBase64.map((base64, index) => {
                            const isSelected = selectedPages.has(index)
                            return (
                                <Card
                                    key={index}
                                    className={`relative overflow-hidden border-2 transition-all cursor-pointer group ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-muted hover:border-primary/50'}`}
                                    onClick={() => {
                                        const newSet = new Set(selectedPages)
                                        if (isSelected) {
                                            newSet.delete(index)
                                        } else {
                                            newSet.add(index)
                                        }
                                        setSelectedPages(newSet)
                                    }}
                                >
                                    <div className="absolute top-2 right-2 z-10 bg-background/80 rounded-sm">
                                        {isSelected ? (
                                            <CheckSquare className="w-6 h-6 text-primary" />
                                        ) : (
                                            <Square className="w-6 h-6 text-muted-foreground" />
                                        )}
                                    </div>
                                    <CardContent className="p-0 relative aspect-[1/1.4] bg-muted">
                                        <img
                                            src={base64}
                                            alt={`Page ${index + 1}`}
                                            className={`w-full h-full object-cover transition-transform duration-300 ${isSelected ? 'scale-105 opacity-100' : 'opacity-70 group-hover:scale-105 group-hover:opacity-90'}`}
                                        />
                                        <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-mono shadow-sm">
                                            P.{index + 1}
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>

                    <div className="flex justify-between items-center pt-4 sticky bottom-4 bg-background/90 backdrop-blur-sm p-4 rounded-lg shadow-lg border">
                        <span className="font-semibold text-primary">已选中 {selectedPages.size} 页</span>
                        <Button
                            size="lg"
                            className="font-medium shadow-sm transition-colors gap-2"
                            disabled={selectedPages.size === 0}
                            onClick={() => {
                                const selectedImagesBase64 = result.imagesBase64.filter((_, i) => selectedPages.has(i))
                                navigate('/verification', { state: { imagesBase64: selectedImagesBase64 } })
                            }}
                        >
                            调用 VLM 进行财务大表抽取 ✨
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
