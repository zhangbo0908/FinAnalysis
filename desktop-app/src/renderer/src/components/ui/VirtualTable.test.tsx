/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import { VirtualTable, EditableCell } from './VirtualTable'
import { describe, it, expect, vi } from 'vitest'

describe('VirtualTable Component', () => {
    const mockColumns = [
        {
            header: 'Item',
            accessorKey: 'Item',
            cell: EditableCell
        },
        {
            header: 'Value',
            accessorKey: 'Value',
            cell: EditableCell
        }
    ]

    const mockData = [
        { Item: 'Revenue', Value: '1000' },
        { Item: 'Cost', Value: '500' }
    ]

    it('renders table headers and rows correctly', () => {
        render(<VirtualTable data={mockData} columns={mockColumns} />)

        // headers
        expect(screen.getByText('Item')).toBeInTheDocument()
        expect(screen.getByText('Value')).toBeInTheDocument()

        // inputs should contain the values since we use EditableCell
        const inputs = screen.getAllByRole('textbox') as HTMLInputElement[]
        expect(inputs).toHaveLength(4) // 2 rows * 2 cols
        expect(inputs[0].value).toBe('Revenue')
        expect(inputs[1].value).toBe('1000')
    })

    it('triggers onDataChange when a cell is edited', () => {
        const handleDataChange = vi.fn()
        render(<VirtualTable data={mockData} columns={mockColumns} onDataChange={handleDataChange} />)

        const inputs = screen.getAllByRole('textbox') as HTMLInputElement[]
        // Change the 'Revenue' input
        fireEvent.change(inputs[0], { target: { value: 'Total Revenue' } })

        // Trigger blur to save
        fireEvent.blur(inputs[0])

        expect(handleDataChange).toHaveBeenCalledTimes(1)
        expect(handleDataChange).toHaveBeenCalledWith([
            { Item: 'Total Revenue', Value: '1000' },
            { Item: 'Cost', Value: '500' }
        ])
    })

    it('shows empty state when no data provided', () => {
        render(<VirtualTable data={[]} columns={mockColumns} />)
        expect(screen.getByText('暂无提取数据')).toBeInTheDocument()
    })
})
