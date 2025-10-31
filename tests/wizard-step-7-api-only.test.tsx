import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Step7_ApiOnly from '@/components/wizard-steps/step-7-api-only';

// Mock the dependencies
vi.mock('@/lib/wizard/field-requirements', () => ({
  isFieldRequired: vi.fn(() => true),
}));

vi.mock('@/components/url-validator', () => ({
  UrlValidator: ({ url }: { url: string }) => (
    <div data-testid="url-validator">URL: {url}</div>
  ),
}));

// Mock the MCP Config Editor
vi.mock('@/components/wizard-steps/mcp-config', () => ({
  McpConfigEditor: ({ value, onChange }: any) => (
    <div data-testid="mcp-config-editor">
      <button onClick={() => onChange({ tools: [] })}>Apply JSON</button>
    </div>
  ),
}));

describe('Step7_ApiOnly', () => {
  const defaultContext = {
    state: {
      metadata: {},
      interfaceFlags: { human: true, api: true, smartContract: false },
      apiType: 'a2a', // Add apiType to pass the early return check
      endpoint: { url: '', schemaUrl: '' },
    },
    updateField: vi.fn(),
    status: 'idle' as const,
    setStatus: vi.fn(),
    errors: {}
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders A2A URL field', () => {
    render(<Step7_ApiOnly {...defaultContext} />);
    
    expect(screen.getByLabelText(/Agent Card URL/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('https://example.com/.well-known/agent-card.json')).toBeInTheDocument();
  });

  it('renders MCP configuration section for MCP type', () => {
    const contextWithMcp = {
      ...defaultContext,
      state: {
        ...defaultContext.state,
        apiType: 'mcp' as const,
      }
    };
    
    render(<Step7_ApiOnly {...contextWithMcp} />);
    
    expect(screen.getByText(/MCP \(Model Context Protocol\) Configuration/)).toBeInTheDocument();
  });

  it('shows warning when API is selected but no API type', () => {
    const contextWithoutApiType = {
      ...defaultContext,
      state: {
        ...defaultContext.state,
        apiType: null,
      }
    };
    
    render(<Step7_ApiOnly {...contextWithoutApiType} />);
    
    expect(screen.getByText(/Please select an API type in Step 1/)).toBeInTheDocument();
  });

  it('handles A2A URL input', () => {
    const mockUpdateField = vi.fn();
    const context = { ...defaultContext, updateField: mockUpdateField };
    
    render(<Step7_ApiOnly {...context} />);
    
    const input = screen.getByLabelText(/Agent Card URL/);
    fireEvent.change(input, { target: { value: 'https://example.com/agent-card.json' } });
    
    expect(mockUpdateField).toHaveBeenCalledWith('endpoint', { url: 'https://example.com/agent-card.json', schemaUrl: '' });
  });

  it('handles MCP JSON input and apply', () => {
    const mockUpdateField = vi.fn();
    const contextWithMcp = {
      ...defaultContext,
      state: {
        ...defaultContext.state,
        apiType: 'mcp' as const,
      },
      updateField: mockUpdateField
    };
    
    render(<Step7_ApiOnly {...contextWithMcp} />);
    
    // Click the apply button in the mocked MCP editor
    const applyButton = screen.getByText('Apply JSON');
    fireEvent.click(applyButton);
    
    expect(mockUpdateField).toHaveBeenCalledWith('mcp', { tools: [] });
  });

  it('shows existing data when provided', () => {
    const contextWithData = {
      ...defaultContext,
      state: {
        ...defaultContext.state,
        endpoint: {
          url: 'https://existing.com/agent-card.json',
          schemaUrl: ''
        },
        mcp: { tools: ['test'] }
      }
    };
    
    render(<Step7_ApiOnly {...contextWithData} />);
    
    expect(screen.getByDisplayValue('https://existing.com/agent-card.json')).toBeInTheDocument();
  });

  it('shows error styling for invalid fields', () => {
    const contextWithErrors = {
      ...defaultContext,
      errors: {
        'endpoint.url': 'Invalid URL'
      }
    };
    
    render(<Step7_ApiOnly {...contextWithErrors} />);
    
    expect(screen.getByText('Invalid URL')).toBeInTheDocument();
  });

  it('shows error styling for MCP configuration', () => {
    const contextWithMcpErrors = {
      ...defaultContext,
      state: {
        ...defaultContext.state,
        apiType: 'mcp' as const,
      },
      errors: {
        'mcp': 'Invalid configuration'
      }
    };
    
    render(<Step7_ApiOnly {...contextWithMcpErrors} />);
    
    expect(screen.getByText('Invalid configuration')).toBeInTheDocument();
  });
});
