import { useState, useCallback } from 'react'
import { FileUp, File, AlertCircle } from 'lucide-react'
import { Card } from './card'
import { cn } from '@/lib/utils'

interface DropzoneProps {
    onFileAccepted: (file: File) => void
    isProcessing?: boolean
}

export function Dropzone({ onFileAccepted, isProcessing = false }: DropzoneProps) {
    const [isDragActive, setIsDragActive] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragActive(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragActive(false)
    }, [])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (!isDragActive) {
            setIsDragActive(true)
        }
    }, [isDragActive])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragActive(false)
        setErrorMsg(null)

        if (isProcessing) return

        const files = e.dataTransfer.files
        if (files && files.length > 0) {
            const file = files[0]
            if (file.type === 'application/pdf') {
                onFileAccepted(file)
            } else {
                setErrorMsg('只支持上传 PDF 格式的财报文件。')
            }
        }
    }, [onFileAccepted, isProcessing])

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setErrorMsg(null)
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0]
            if (file.type === 'application/pdf') {
                onFileAccepted(file)
            } else {
                setErrorMsg('只支持上传 PDF 格式的财报文件。')
            }
        }
    }, [onFileAccepted])

    return (
        <Card
            className={cn(
                "relative flex flex-col items-center justify-center p-12 text-center border-2 border-dashed transition-colors",
                isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                isProcessing ? "opacity-50 pointer-events-none" : "cursor-pointer hover:bg-accent/50"
            )}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => !isProcessing && document.getElementById('file-upload')?.click()}
        >
            <input
                id="file-upload"
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileInput}
                disabled={isProcessing}
            />

            <div className="flex justify-center mb-4">
                {isProcessing ? (
                    <File className="w-12 h-12 text-primary animate-pulse" />
                ) : (
                    <FileUp className={cn("w-12 h-12", isDragActive ? "text-primary" : "text-muted-foreground")} />
                )}
            </div>

            <div className="space-y-2">
                <h3 className="text-xl font-medium">
                    {isProcessing ? "处理中..." : "点击或拖拽上传财报"}
                </h3>
                <p className="text-sm text-muted-foreground">
                    仅支持标准的 .pdf 格式文档，建议扫描质量清晰
                </p>
            </div>

            {errorMsg && (
                <div className="absolute bottom-4 flex items-center text-sm text-destructive font-medium">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    {errorMsg}
                </div>
            )}
        </Card>
    )
}
