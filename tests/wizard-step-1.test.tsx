import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import Step1_Verification from '@/components/wizard-steps/step-1-verification';
import type { StepRenderContext } from '@/lib/wizard';

// Mock dependencies
vi.mock('thirdweb/react', () => ({
  useActiveAccount: vi.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
  })),
}));

vi.mock('@/lib/utils/did', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils/did')>();
  return {
    ...actual,
    normalizeDidWeb: vi.fn((did: string) => did),
    normalizeDid: vi.fn((did: string) => did),
    normalizeDomain: vi.fn((domain: string) => domain),
  };
});

describe('Wizard Step 1 - Verification', () => {
  let mockContext: StepRenderContext;

  beforeEach(() => {
    mockContext = {
      state: {
        name: '',
        version: '',
        did: '',
        interfaces: { human: true, api: false, smartContract: false },
        _verificationStatus: 'idle' as any,
      },
      updateField: vi.fn(),
      errors: {},
    };

    global.fetch = vi.fn();
  });

  // Tests basic rendering of step 1
  it('renders all required fields', () => {
    render(<Step1_Verification {...mockContext} />);

    expect(screen.getByLabelText(/App Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Version/i)).toBeInTheDocument();
    expect(screen.getAllByText(/DID Type/i)[0]).toBeInTheDocument();
    // Interface checkboxes are present without a heading
    expect(screen.getByLabelText(/Human/i)).toBeInTheDocument();
  });

  // Tests app name input
  it('updates app name field', async () => {
    const user = userEvent.setup();
    render(<Step1_Verification {...mockContext} />);

    const nameInput = screen.getByLabelText(/App Name/i);
    await user.type(nameInput, 'My Test App');

    expect(mockContext.updateField).toHaveBeenCalledWith('name', expect.stringContaining('M'));
  });

  // Tests version input
  it('updates version field', async () => {
    const user = userEvent.setup();
    render(<Step1_Verification {...mockContext} />);

    const versionInput = screen.getByLabelText(/Version/i);
    await user.type(versionInput, '1.0.0');

    expect(mockContext.updateField).toHaveBeenCalled();
  });

  // Tests DID type selection
  it('shows did:web input when web DID type selected', async () => {
    mockContext.state.did = 'did:web:example.com';
    
    render(<Step1_Verification {...mockContext} />);

    // Should show did:web specific input when DID is set
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/example\.com/i)).toBeInTheDocument();
    });
  });

  // Tests DID type switching
  it('pre-fills DID type based on did value', () => {
    mockContext.state.did = 'did:web:example.com';
    
    render(<Step1_Verification {...mockContext} />);

    // Component should recognize did:web type from state
    expect(screen.getByPlaceholderText(/example\.com/i)).toBeInTheDocument();
  });

  // Tests interface selection
  it('displays interface checkboxes', () => {
    render(<Step1_Verification {...mockContext} />);

    expect(screen.getByLabelText(/Human/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/API/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Smart Contract/i)).toBeInTheDocument();
  });

  // Tests error display
  it('displays validation errors', () => {
    mockContext.errors = {
      name: 'App name is required',
      version: 'Invalid version format',
    };

    render(<Step1_Verification {...mockContext} />);

    expect(screen.getByText('App name is required')).toBeInTheDocument();
    expect(screen.getByText('Invalid version format')).toBeInTheDocument();
  });

  // Tests pre-filled state
  it('shows pre-filled values from state', () => {
    mockContext.state = {
      name: 'Existing App',
      version: '2.0.0',
      did: 'did:web:example.com',
      interfaces: { human: true, api: true, smartContract: false },
      _verificationStatus: 'idle' as any,
    };

    render(<Step1_Verification {...mockContext} />);

    const nameInput = screen.getByLabelText(/App Name/i) as HTMLInputElement;
    const versionInput = screen.getByLabelText(/Version/i) as HTMLInputElement;

    expect(nameInput.value).toBe('Existing App');
    expect(versionInput.value).toBe('2.0.0');
  });

  // Tests DID verification component presence
  it('shows verification component when did:web is selected', async () => {
    mockContext.state.did = 'did:web:example.com';
    
    render(<Step1_Verification {...mockContext} />);

    // Should show verification instructions
    await waitFor(() => {
      expect(screen.getByText(/Website DID.*Requirements/i)).toBeInTheDocument();
    });
  });

  // Tests placeholder text
  it('displays helpful placeholder text', () => {
    render(<Step1_Verification {...mockContext} />);

    const nameInput = screen.getByLabelText(/App Name/i);
    const versionInput = screen.getByLabelText(/Version/i);

    expect(nameInput).toHaveAttribute('placeholder');
    expect(versionInput).toHaveAttribute('placeholder');
  });

  // Tests required field indicators
  it('marks required fields appropriately', () => {
    render(<Step1_Verification {...mockContext} />);

    const nameInput = screen.getByLabelText(/App Name/i);
    const versionInput = screen.getByLabelText(/Version/i);

    expect(nameInput).toHaveAttribute('required');
    expect(versionInput).toHaveAttribute('required');
  });

  // Tests version format hint
  it('shows version format hint', () => {
    render(<Step1_Verification {...mockContext} />);

    expect(screen.getByText(/Semantic version/i)).toBeInTheDocument();
  });
});

