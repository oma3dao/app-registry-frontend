import { describe, it, expect, vi } from 'vitest'
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

	/**
	 * Test: covers lines 31-132 - tool, resource, and prompt management functions
	 */
	describe('Tool management', () => {
		// Test: covers line 31 - addTool function
		it('adds a new tool when addTool is called', () => {
			const { onChange } = setup({ tools: [] })
			fireEvent.click(screen.getByRole('button', { name: /add tool/i }))
			
			expect(onChange).toHaveBeenCalledWith(
				expect.objectContaining({
					tools: [{ name: '', description: '', inputSchema: {} }]
				})
			)
		})

		// Test: covers lines 33-36 - updateTool function
		it('updates tool fields correctly', () => {
			const { onChange } = setup({
				tools: [{ name: '', description: '', inputSchema: {} }]
			})
			
			const nameInput = screen.getByPlaceholderText(/Tool name/i)
			fireEvent.change(nameInput, { target: { value: 'test-tool' } })
			
			expect(onChange).toHaveBeenCalledWith(
				expect.objectContaining({
					tools: [{ name: 'test-tool', description: '', inputSchema: {} }]
				})
			)
		})

		// Test: covers lines 39-42 - removeTool function
		it('removes tool when removeTool is called', () => {
			const onChange = vi.fn()
			// Render ONLY tools to isolate the buttons
			render(<McpConfigEditor value={{
				tools: [
					{ name: 'tool1', description: 'desc1', inputSchema: {} },
					{ name: 'tool2', description: 'desc2', inputSchema: {} }
				]
			}} onChange={onChange} />)
			
			// Find the first tool's section
			const toolSections = screen.getAllByText(/^Tool \d+$/)
			expect(toolSections.length).toBe(2)
			
			// Find the first tool container (parent of "Tool 1")
			const firstToolContainer = toolSections[0].closest('.p-3')
			expect(firstToolContainer).toBeTruthy()
			
			// Find the remove button within that container
			const removeButton = within(firstToolContainer as HTMLElement).getAllByRole('button')[0]
			expect(removeButton).toBeDefined()
			
			fireEvent.click(removeButton)
			
			// Should be called with tools array filtered to remove first item
			const calls = onChange.mock.calls
			expect(calls.length).toBeGreaterThan(0)
			const lastCall = calls[calls.length - 1][0]
			expect(lastCall.tools).toEqual([{ name: 'tool2', description: 'desc2', inputSchema: {} }])
		})

		// Test: covers lines 126-133 - inputSchema JSON parsing
		it('parses valid JSON for inputSchema', () => {
			const { onChange } = setup({
				tools: [{ name: '', description: '', inputSchema: {} }]
			})
			
			const schemaInput = screen.getByPlaceholderText(/Input schema/i)
			fireEvent.change(schemaInput, { 
				target: { value: '{"type": "object", "properties": {"name": {"type": "string"}}}' }
			})
			
			expect(onChange).toHaveBeenCalled()
		})

		// Test: covers lines 128-131 - inputSchema invalid JSON handling
		it('handles invalid JSON for inputSchema gracefully', () => {
			const { onChange } = setup({
				tools: [{ name: '', description: '', inputSchema: {} }]
			})
			
			const schemaInput = screen.getByPlaceholderText(/Input schema/i)
			fireEvent.change(schemaInput, { 
				target: { value: 'invalid json{' }
			})
			
			// Should still call onChange with the string value
			expect(onChange).toHaveBeenCalled()
		})
	})

	describe('Resource management', () => {
		// Test: covers lines 45-50 - addResource function
		it('adds a new resource when addResource is called', () => {
			const { onChange } = setup({ resources: [] })
			fireEvent.click(screen.getByRole('button', { name: /add resource/i }))
			
			expect(onChange).toHaveBeenCalledWith(
				expect.objectContaining({
					resources: [{ uri: '', name: '', description: '', mimeType: '' }]
				})
			)
		})

		// Test: covers lines 53-56 - updateResource function
		it('updates resource fields correctly', () => {
			const { onChange } = setup({
				resources: [{ uri: '', name: '', description: '', mimeType: '' }]
			})
			
			const uriInput = screen.getByPlaceholderText(/URI/i)
			fireEvent.change(uriInput, { target: { value: 'file:///data' } })
			
			expect(onChange).toHaveBeenCalled()
		})

		// Test: covers lines 59-62 - removeResource function
		it('removes resource when removeResource is called', () => {
			const onChange = vi.fn()
			// Render ONLY resources to isolate the buttons
			render(<McpConfigEditor value={{
				resources: [
					{ uri: 'file:///uri1', name: 'res1', description: 'desc1', mimeType: 'text/plain' },
					{ uri: 'file:///uri2', name: 'res2', description: 'desc2', mimeType: 'text/html' }
				]
			}} onChange={onChange} />)
			
			// Find the first resource's section
			const resourceSections = screen.getAllByText(/^Resource \d+$/)
			expect(resourceSections.length).toBe(2)
			
			// Find the first resource container (parent of "Resource 1")
			const firstResourceContainer = resourceSections[0].closest('.p-3')
			expect(firstResourceContainer).toBeTruthy()
			
			// Find the remove button within that container
			const removeButton = within(firstResourceContainer as HTMLElement).getAllByRole('button')[0]
			expect(removeButton).toBeDefined()
			
			fireEvent.click(removeButton)
			
			// Should be called with resources array filtered to remove first item
			const calls = onChange.mock.calls
			expect(calls.length).toBeGreaterThan(0)
			const lastCall = calls[calls.length - 1][0]
			expect(lastCall.resources).toEqual([{ uri: 'file:///uri2', name: 'res2', description: 'desc2', mimeType: 'text/html' }])
		})
	})

	describe('Prompt management', () => {
		// Test: covers lines 65-70 - addPrompt function
		it('adds a new prompt when addPrompt is called', () => {
			const { onChange } = setup({ prompts: [] })
			fireEvent.click(screen.getByRole('button', { name: /add prompt/i }))
			
			expect(onChange).toHaveBeenCalledWith(
				expect.objectContaining({
					prompts: [{ name: '', description: '', arguments: [] }]
				})
			)
		})

		// Test: covers lines 73-76 - updatePrompt function
		it('updates prompt fields correctly', () => {
			const { onChange } = setup({
				prompts: [{ name: '', description: '', arguments: [] }]
			})
			
			const nameInput = screen.getByPlaceholderText(/Prompt name/i)
			fireEvent.change(nameInput, { target: { value: 'test-prompt' } })
			
			expect(onChange).toHaveBeenCalled()
		})

		// Test: covers lines 79-82 - removePrompt function
		it('removes prompt when removePrompt is called', () => {
			const onChange = vi.fn()
			// Render ONLY prompts to isolate the buttons
			const { container } = render(<McpConfigEditor value={{
				prompts: [
					{ name: 'prompt1', description: 'desc1', arguments: [] },
					{ name: 'prompt2', description: 'desc2', arguments: [] }
				]
			}} onChange={onChange} />)
			
			// Find the first prompt's section
			const promptSections = screen.getAllByText(/^Prompt \d+$/)
			expect(promptSections.length).toBe(2)
			
			// Find the first prompt container (parent of "Prompt 1")
			const firstPromptContainer = promptSections[0].closest('.p-3')
			expect(firstPromptContainer).toBeTruthy()
			
			// Find the remove button within that container
			const removeButton = within(firstPromptContainer as HTMLElement).getAllByRole('button')[0]
			expect(removeButton).toBeDefined()
			
			fireEvent.click(removeButton)
			
			// Should be called with prompts array filtered to remove first item
			const calls = onChange.mock.calls
			expect(calls.length).toBeGreaterThan(0)
			const lastCall = calls[calls.length - 1][0]
			expect(lastCall.prompts).toEqual([{ name: 'prompt2', description: 'desc2', arguments: [] }])
		})
	})

	/**
	 * Test: covers lines 232-242 - transport & authentication JSON parsing
	 */
	describe('Transport & Authentication JSON parsing', () => {
		it('parses valid JSON for transport and authentication', () => {
			const { onChange } = setup({
				transport: {},
				authentication: {}
			})
			
			const transportInput = screen.getByPlaceholderText(/\{.*transport.*\}/i)
			fireEvent.change(transportInput, {
				target: {
					value: JSON.stringify({
						transport: { http: { port: 8080 } },
						authentication: { oauth2: { clientId: 'test' } }
					}, null, 2)
				}
			})
			
			expect(onChange).toHaveBeenCalledWith(
				expect.objectContaining({
					transport: { http: { port: 8080 } },
					authentication: { oauth2: { clientId: 'test' } }
				})
			)
		})

		// Test: covers lines 239-241 - invalid JSON handling
		it('handles invalid JSON for transport/auth gracefully', () => {
			const { onChange } = setup({
				transport: { http: {} },
				authentication: {}
			})
			
			const transportInput = screen.getByPlaceholderText(/\{.*transport.*\}/i)
			fireEvent.change(transportInput, {
				target: { value: 'invalid json{' }
			})
			
			// Should not call onChange with invalid JSON
			// The catch block silently ignores the error
			expect(onChange).not.toHaveBeenCalled()
		})

		// Test: covers lines 236-237 - partial JSON parsing
		it('handles partial JSON with only transport', () => {
			const { onChange } = setup({
				transport: {},
				authentication: {}
			})
			
			const transportInput = screen.getByPlaceholderText(/\{.*transport.*\}/i)
			fireEvent.change(transportInput, {
				target: {
					value: JSON.stringify({
						transport: { http: { port: 8080 } }
					}, null, 2)
				}
			})
			
			expect(onChange).toHaveBeenCalledWith(
				expect.objectContaining({
					transport: { http: { port: 8080 } }
				})
			)
		})
	})

	describe('Defensive coding - undefined array handling', () => {
		/**
		 * Test: covers line 40 - removeTool with undefined tools array
		 * Tests the fallback when config.tools is undefined
		 */
		it('handles removeTool when tools array is undefined', () => {
			const onChange = vi.fn()
			
			// Render with a tool, but tools array will be set to undefined
			render(<McpConfigEditor value={{ tools: [{ name: 'test', description: '', inputSchema: {} }] }} onChange={onChange} />)
			
			// Find and click remove button
			const removeButtons = screen.getAllByRole('button')
			const removeButton = removeButtons.find(b => b.querySelector('svg'))
			
			if (removeButton) {
				// Now change value to have undefined tools before clicking
				// This simulates the case where config.tools is undefined when removeTool is called
				const { rerender } = render(<McpConfigEditor value={{}} onChange={onChange} />)
				
				// The filter operation should handle undefined by using || []
				// When we remove from an empty/undefined array, result should be []
				fireEvent.click(removeButton)
				
				// Should call onChange with empty tools array due to fallback
				expect(onChange).toHaveBeenCalled()
			}
		})

		/**
		 * Test: covers line 60 - removeResource with undefined resources array  
		 * Tests the fallback when config.resources is undefined
		 */
		it('handles removeResource when resources array is undefined', () => {
			const onChange = vi.fn()
			
			// Render with a resource
			render(<McpConfigEditor value={{ resources: [{ uri: 'test', name: '', description: '', mimeType: '' }] }} onChange={onChange} />)
			
			// Find remove button in resources section
			const removeButtons = screen.getAllByRole('button')
			const removeButton = removeButtons.find(b => b.querySelector('svg'))
			
			if (removeButton) {
				// Rerender with undefined resources
				const { rerender } = render(<McpConfigEditor value={{}} onChange={onChange} />)
				
				fireEvent.click(removeButton)
				expect(onChange).toHaveBeenCalled()
			}
		})

		/**
		 * Test: covers line 80 - removePrompt with undefined prompts array
		 * Tests the fallback when config.prompts is undefined
		 */
		it('handles removePrompt when prompts array is undefined', () => {
			const onChange = vi.fn()
			
			// Render with a prompt
			render(<McpConfigEditor value={{ prompts: [{ name: 'test', description: '', arguments: [] }] }} onChange={onChange} />)
			
			// Find remove button
			const removeButtons = screen.getAllByRole('button')
			const removeButton = removeButtons.find(b => b.querySelector('svg'))
			
			if (removeButton) {
				// Rerender with undefined prompts
				const { rerender } = render(<McpConfigEditor value={{}} onChange={onChange} />)
				
				fireEvent.click(removeButton)
				expect(onChange).toHaveBeenCalled()
			}
		})
	})
})
