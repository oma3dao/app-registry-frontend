import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Toaster } from '../src/components/ui/sonner';

// Mock next-themes
vi.mock('next-themes', () => {
  const useThemeMock = vi.fn(() => ({ theme: 'light' }));
  (globalThis as any).useThemeMock = useThemeMock;
  return { useTheme: useThemeMock };
});

// Mock sonner
vi.mock('sonner', () => ({
  Toaster: vi.fn(({ children, ...props }) => (
    <div data-testid="sonner-toaster" {...props}>
      {children}
    </div>
  )),
}));

describe('Toaster component', () => {
  let useThemeMock: any;
  beforeEach(() => {
    vi.clearAllMocks();
    useThemeMock = (globalThis as any).useThemeMock;
    useThemeMock.mockReset();
    useThemeMock.mockReturnValue({ theme: 'light' });
  });

  it('renders with default theme', () => {
    render(<Toaster />);
    const toaster = screen.getByTestId('sonner-toaster');
    expect(toaster).toBeInTheDocument();
  });

  it('applies theme from useTheme hook', () => {
    useThemeMock.mockReturnValue({ theme: 'dark' });
    render(<Toaster />);
    const toaster = screen.getByTestId('sonner-toaster');
    expect(toaster).toHaveAttribute('theme', 'dark');
  });

  it('applies system theme when theme is system', () => {
    useThemeMock.mockReturnValue({ theme: 'system' });
    render(<Toaster />);
    const toaster = screen.getByTestId('sonner-toaster');
    expect(toaster).toHaveAttribute('theme', 'system');
  });

  it('applies custom props', () => {
    render(<Toaster data-testid="custom-toaster" />);
    const toaster = screen.getByTestId('custom-toaster');
    expect(toaster).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Toaster className="custom-class" />);
    const toaster = screen.getByTestId('sonner-toaster');
    expect(toaster).toHaveClass('custom-class');
  });

  it('has correct default className', () => {
    render(<Toaster />);
    const toaster = screen.getByTestId('sonner-toaster');
    expect(toaster).toHaveClass('toaster group');
  });

  it('applies toast options with correct classNames', () => {
    render(<Toaster />);
    const toaster = screen.getByTestId('sonner-toaster');
    expect(toaster).toBeInTheDocument();
  });
}); 