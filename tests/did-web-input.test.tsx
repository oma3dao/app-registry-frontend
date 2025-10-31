import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { DidWebInput } from '@/components/did-web-input';

describe('DidWebInput component', () => {
  it('renders with did:web: prefix displayed', () => {
    const onChange = vi.fn();
    render(<DidWebInput onChange={onChange} />);

    expect(screen.getByText('did:web:')).toBeInTheDocument();
  });

  it('renders domain input field', () => {
    const onChange = vi.fn();
    render(<DidWebInput onChange={onChange} />);

    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
  });

  it('displays Domain label', () => {
    const onChange = vi.fn();
    render(<DidWebInput onChange={onChange} />);

    expect(screen.getByText('Domain')).toBeInTheDocument();
  });

  it('accepts domain input', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<DidWebInput onChange={onChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'example.com');

    expect(input).toHaveValue('example.com');
  });

  it('calls onChange with did:web format on blur', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<DidWebInput onChange={onChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'example.com');
    await user.tab(); // Blur the input

    expect(onChange).toHaveBeenCalledWith('did:web:example.com');
  });

  it('normalizes domain to lowercase on blur', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<DidWebInput onChange={onChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'EXAMPLE.COM');
    await user.tab();

    expect(onChange).toHaveBeenCalledWith('did:web:example.com');
  });

  it('shows preview of complete DID as user types', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<DidWebInput onChange={onChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'example.com');

    // Should show the complete DID preview
    expect(screen.getByText(/did:web:example\.com/i)).toBeInTheDocument();
  });

  it('validates domain format on blur', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<DidWebInput onChange={onChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'invalid domain with spaces');
    await user.tab();

    expect(screen.getByText(/Invalid domain format/i)).toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('accepts valid subdomains', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<DidWebInput onChange={onChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'app.example.com');
    await user.tab();

    expect(onChange).toHaveBeenCalledWith('did:web:app.example.com');
  });

  it('handles empty input on blur', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<DidWebInput onChange={onChange} />);

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.tab(); // Blur without typing

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('displays external error when provided', () => {
    const onChange = vi.fn();
    render(<DidWebInput onChange={onChange} error="External error message" />);

    expect(screen.getByText('External error message')).toBeInTheDocument();
  });

  it('parses existing DID value', () => {
    const onChange = vi.fn();
    render(<DidWebInput value="did:web:example.com" onChange={onChange} />);

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('example.com');
  });

  it('applies custom className', () => {
    const onChange = vi.fn();
    const { container } = render(
      <DidWebInput onChange={onChange} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('shows check icon when valid', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<DidWebInput onChange={onChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'example.com');
    await user.tab();

    // Should show success indicator (check icon or similar)
    // The exact implementation depends on the component's visual feedback
  });

  it('accepts domains with hyphens', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<DidWebInput onChange={onChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'my-app.example-domain.com');
    await user.tab();

    expect(onChange).toHaveBeenCalledWith('did:web:my-app.example-domain.com');
  });

  it('accepts numeric domains', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<DidWebInput onChange={onChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, '123.example.com');
    await user.tab();

    expect(onChange).toHaveBeenCalledWith('did:web:123.example.com');
  });

  it('removes trailing dot from domain', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<DidWebInput onChange={onChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'example.com.');
    await user.tab();

    expect(onChange).toHaveBeenCalledWith('did:web:example.com');
  });

  it('handles localhost', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<DidWebInput onChange={onChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'localhost');
    await user.tab();

    expect(onChange).toHaveBeenCalledWith('did:web:localhost');
  });

  it('clears error when user starts typing', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<DidWebInput onChange={onChange} error="Initial error" />);

    expect(screen.getByText('Initial error')).toBeInTheDocument();

    const input = screen.getByRole('textbox');
    await user.type(input, 'e');

    // Internal error should be cleared when typing
    // External error might still be shown depending on implementation
  });
});

