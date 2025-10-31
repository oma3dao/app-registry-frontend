import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { McpConfigEditor } from '@/components/wizard-steps/mcp-config'

const setup = (value?: any) => {
	const onChange = vi.fn()
	render(<McpConfigEditor value={value} onChange={onChange} />)
	return { onChange }
}

describe('McpConfigEditor', () => {
	it('renders and adds a tool, edits fields, removes it', () => {
		const { onChange } = setup({ tools: [] })
		fireEvent.click(screen.getByRole('button', { name: /add tool/i }))
		expect(onChange).toHaveBeenCalled()
		render(<McpConfigEditor value={{ tools: [{ name: '', description: '', inputSchema: {} }] }} onChange={onChange} />)
		const name = screen.getByPlaceholderText(/Tool name/i)
		fireEvent.change(name, { target: { value: 'search' } })
		const desc = screen.getByPlaceholderText(/Description/i)
		fireEvent.change(desc, { target: { value: 'desc' } })
		const schema = screen.getByPlaceholderText(/Input schema/i)
		fireEvent.change(schema, { target: { value: '{"type":"object"}' } })
		// Remove first tool
		const removeButtons = screen.getAllByRole('button')
		fireEvent.click(removeButtons.find(b => b.innerHTML.includes('Trash')) || removeButtons[removeButtons.length - 1])
		expect(onChange).toHaveBeenCalled()
	})

	it('adds resource and edits fields', () => {
		const { onChange } = setup({ resources: [] })
		fireEvent.click(screen.getByRole('button', { name: /add resource/i }))
		render(<McpConfigEditor value={{ resources: [{ uri: '', name: '', description: '', mimeType: '' }] }} onChange={onChange} />)
		fireEvent.change(screen.getByPlaceholderText(/URI/i), { target: { value: 'file:///data' } })
		fireEvent.change(screen.getByPlaceholderText(/Resource name/i), { target: { value: 'Data' } })
		fireEvent.change(screen.getByPlaceholderText(/Description \(optional\)/i), { target: { value: 'desc' } })
		fireEvent.change(screen.getByPlaceholderText(/MIME type/i), { target: { value: 'text/plain' } })
		expect(onChange).toHaveBeenCalled()
	})

	it('adds prompt and edits fields', () => {
		const { onChange } = setup({ prompts: [] })
		fireEvent.click(screen.getByRole('button', { name: /add prompt/i }))
		render(<McpConfigEditor value={{ prompts: [{ name: '', description: '' }] }} onChange={onChange} />)
		fireEvent.change(screen.getByPlaceholderText(/Prompt name/i), { target: { value: 'p1' } })
		fireEvent.change(screen.getByPlaceholderText(/Prompt description/i), { target: { value: 'pd' } })
		expect(onChange).toHaveBeenCalled()
	})

	it('renders transport/auth section', () => {
		setup({ transport: {}, authentication: {} })
		expect(screen.getByText(/Transport & Authentication/i)).toBeInTheDocument()
	})
})
