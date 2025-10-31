import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TransactionAlert } from '../src/components/ui/transaction-alert';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Info: vi.fn(({ className, ...props }) => (
    <svg data-testid="info-icon" className={className} {...props} />
  )),
}));

describe('TransactionAlert component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default props', () => {
    render(<TransactionAlert />);
    
    expect(screen.getByText('Transaction Pending')).toBeInTheDocument();
    expect(screen.getByText('Please approve the transaction in your wallet')).toBeInTheDocument();
    expect(screen.getByTestId('info-icon')).toBeInTheDocument();
  });

  it('renders with custom title', () => {
    render(<TransactionAlert title="Custom Title" />);
    
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.getByText('Please approve the transaction in your wallet')).toBeInTheDocument();
  });

  it('renders with custom description', () => {
    render(<TransactionAlert description="Custom description text" />);
    
    expect(screen.getByText('Transaction Pending')).toBeInTheDocument();
    expect(screen.getByText('Custom description text')).toBeInTheDocument();
  });

  it('renders with custom title and description', () => {
    render(<TransactionAlert title="Custom Title" description="Custom description" />);
    
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.getByText('Custom description')).toBeInTheDocument();
  });

  it('shows mobile message when isMobile is true', () => {
    render(<TransactionAlert isMobile={true} />);
    
    expect(screen.getByText('Transaction Pending')).toBeInTheDocument();
    expect(screen.getByText('Please approve the transaction in your wallet')).toBeInTheDocument();
    expect(screen.getByText('Please check your wallet app for the transaction confirmation.')).toBeInTheDocument();
  });

  it('does not show mobile message when isMobile is false', () => {
    render(<TransactionAlert isMobile={false} />);
    
    expect(screen.getByText('Transaction Pending')).toBeInTheDocument();
    expect(screen.getByText('Please approve the transaction in your wallet')).toBeInTheDocument();
    expect(screen.queryByText('Please check your wallet app for the transaction confirmation.')).not.toBeInTheDocument();
  });

  it('does not show mobile message when isMobile is not provided', () => {
    render(<TransactionAlert />);
    
    expect(screen.getByText('Transaction Pending')).toBeInTheDocument();
    expect(screen.getByText('Please approve the transaction in your wallet')).toBeInTheDocument();
    expect(screen.queryByText('Please check your wallet app for the transaction confirmation.')).not.toBeInTheDocument();
  });

  it('renders with all custom props', () => {
    render(
      <TransactionAlert 
        title="Custom Transaction" 
        description="Custom transaction description" 
        isMobile={true} 
      />
    );
    
    expect(screen.getByText('Custom Transaction')).toBeInTheDocument();
    expect(screen.getByText('Custom transaction description')).toBeInTheDocument();
    expect(screen.getByText('Please check your wallet app for the transaction confirmation.')).toBeInTheDocument();
  });

  it('has correct CSS classes for styling', () => {
    render(<TransactionAlert />);
    
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-blue-50', 'border-blue-200', 'dark:bg-blue-950', 'dark:border-blue-900', 'mb-4');
  });

  it('info icon has correct styling classes', () => {
    render(<TransactionAlert />);
    
    const infoIcon = screen.getByTestId('info-icon');
    expect(infoIcon).toHaveClass('h-5', 'w-5', 'text-blue-600', 'dark:text-blue-400');
  });

  it('title has correct styling classes', () => {
    render(<TransactionAlert />);
    
    const title = screen.getByText('Transaction Pending');
    expect(title).toHaveClass('text-blue-800', 'dark:text-blue-300');
  });

  it('description has correct styling classes', () => {
    render(<TransactionAlert />);
    
    const description = screen.getByText('Please approve the transaction in your wallet');
    expect(description).toHaveClass('text-blue-700', 'dark:text-blue-400');
  });

  it('mobile message has correct styling classes', () => {
    render(<TransactionAlert isMobile={true} />);
    
    const mobileMessage = screen.getByText('Please check your wallet app for the transaction confirmation.');
    expect(mobileMessage).toHaveClass('block', 'mt-1', 'font-medium');
  });
}); 