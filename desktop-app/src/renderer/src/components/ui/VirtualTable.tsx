import { useState, useEffect } from 'react'
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    ColumnDef,
} from '@tanstack/react-table'

interface VirtualTableProps {
    data: Record<string, any>[]
    columns: ColumnDef<any>[]
    onDataChange?: (newData: Record<string, any>[]) => void
}

export function VirtualTable({ data: initialData, columns, onDataChange }: VirtualTableProps) {
    const [data, setData] = useState(initialData)

    // Sync state if prop changes
    useEffect(() => {
        setData(initialData)
    }, [initialData])

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        meta: {
            updateData: (rowIndex: number, columnId: string, value: string) => {
                setData(old => {
                    const newData = old.map((row, index) => {
                        if (index === rowIndex) {
                            return {
                                ...old[rowIndex]!,
                                [columnId]: value,
                            }
                        }
                        return row
                    })

                    if (onDataChange) {
                        onDataChange(newData)
                    }

                    return newData
                })
            },
        },
    })

    return (
        <div className="rounded-md border bg-card text-card-foreground shadow-sm h-full flex flex-col overflow-hidden">
            <div className="overflow-auto flex-1 h-[400px]">
                <table className="w-full caption-bottom text-sm relative">
                    <thead className="[&_tr]:border-b sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                {headerGroup.headers.map(header => (
                                    <th key={header.id} className="h-10 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0 font-mono">
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map(row => (
                                <tr
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted group"
                                >
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id} className="p-0 align-middle">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                                    暂无提取数据
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// Editable Cell component
export const EditableCell = ({ getValue, row: { index }, column: { id }, table }: any) => {
    const initialValue = getValue()
    const [value, setValue] = useState(initialValue)

    const onBlur = () => {
        table.options.meta?.updateData(index, id, value)
    }

    useEffect(() => {
        setValue(initialValue)
    }, [initialValue])

    return (
        <input
            value={value as string}
            onChange={e => setValue(e.target.value)}
            onBlur={onBlur}
            className="w-full h-full bg-transparent px-4 py-2 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-background outline-none focus:ring-1 focus:ring-ring transition-colors truncate"
        />
    )
}
