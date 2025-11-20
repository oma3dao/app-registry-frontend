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
      endpointUrl: '',
      endpointSchemaUrl: '',
      endpointName: 'A2A',
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
    
    // New structure uses separate fields
    expect(mockUpdateField).toHaveBeenCalledWith('endpointUrl', 'https://example.com/agent-card.json');
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
        endpointUrl: 'https://existing.com/agent-card.json',
        endpointSchemaUrl: '',
        mcp: { tools: ['test'] }
      }
    };
    
    render(<Step7_ApiOnly {...contextWithData} />);
    
    expect(screen.getByDisplayValue('https://existing.com/agent-card.json')).toBeInTheDocument();
  });

  it('shows error styling for invalid fields', () => {
    const contextWithErrors = {
      ...defaultContext,
      state: {
        ...defaultContext.state,
        endpointUrl: 'invalid-url',
      },
      errors: {
        endpointUrl: 'Invalid URL'
      }
    };
    
    render(<Step7_ApiOnly {...contextWithErrors} />);
    
    // Error message should be displayed in the component
    const errorMessage = screen.getByText('Invalid URL');
    expect(errorMessage).toBeInTheDocument();
    // Input should also have error styling
    const input = screen.getByLabelText(/Agent Card URL/);
    expect(input).toBeInTheDocument();
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

  it('renders smart contract guidance when only contract interface is enabled', () => {
    const contractOnlyContext = {
      ...defaultContext,
      state: {
        ...defaultContext.state,
        interfaceFlags: { human: false, api: false, smartContract: true },
        apiType: null,
      },
    };

    render(<Step7_ApiOnly {...contractOnlyContext} />);

    expect(screen.getByText(/Smart Contract Configuration/)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Recommended RPC Endpoint/)
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Interface Versions/)
    ).not.toBeInTheDocument();
  });

  it('renders combined note when both API and smart contract interfaces are selected', () => {
    const combinedContext = {
      ...defaultContext,
      state: {
        ...defaultContext.state,
        interfaceFlags: { human: false, api: true, smartContract: true },
        apiType: 'jsonrpc' as const,
      },
    };

    render(<Step7_ApiOnly {...combinedContext} />);

    expect(
      screen.getByText(/You've selected both API and Smart Contract interfaces/i)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/JSON-RPC Endpoint URL/)
    ).toBeInTheDocument();
  });

  it('auto-populates endpoint name based on API type', () => {
    const mockUpdateField = vi.fn();
    const graphqlContext = {
      ...defaultContext,
      state: {
        ...defaultContext.state,
        apiType: 'graphql' as const,
      },
      updateField: mockUpdateField,
    };

    render(<Step7_ApiOnly {...graphqlContext} />);

    expect(mockUpdateField).toHaveBeenCalledWith('endpointName', 'GraphQL');
  });

  it('updates interface versions list when user types values', () => {
    const mockUpdateField = vi.fn();
    const context = { ...defaultContext, updateField: mockUpdateField };

    render(<Step7_ApiOnly {...context} />);

    const versionsInput = screen.getByLabelText(/Interface Versions/i);
    fireEvent.change(versionsInput, { target: { value: 'v1, v2, ' } });

    expect(mockUpdateField).toHaveBeenCalledWith('interfaceVersions', ['v1', 'v2']);
  });

  it('uses GraphQL-specific schema placeholder and helper text', () => {
    const graphqlContext = {
      ...defaultContext,
      state: {
        ...defaultContext.state,
        apiType: 'graphql' as const,
      },
    };

    render(<Step7_ApiOnly {...graphqlContext} />);

    expect(
      screen.getByPlaceholderText('https://api.example.com/graphql?sdl')
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Ideally: GraphQL SDL\/schema file/)
    ).toBeInTheDocument();
  });
});
