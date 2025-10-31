import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

describe('Card Components', () => {
  // Tests Card component rendering
  it('renders Card component', () => {
    const { container } = render(<Card>Card content</Card>);
    
    expect(container.firstChild).toHaveClass('rounded-lg');
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  // Tests CardHeader component
  it('renders CardHeader component', () => {
    render(<CardHeader>Header content</CardHeader>);
    
    expect(screen.getByText('Header content')).toBeInTheDocument();
  });

  // Tests CardTitle component
  it('renders CardTitle component', () => {
    render(<CardTitle>Title text</CardTitle>);
    
    const title = screen.getByText('Title text');
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass('text-2xl');
  });

  // Tests CardDescription component
  it('renders CardDescription component', () => {
    render(<CardDescription>Description text</CardDescription>);
    
    const description = screen.getByText('Description text');
    expect(description).toBeInTheDocument();
    expect(description).toHaveClass('text-sm');
  });

  // Tests CardContent component
  it('renders CardContent component', () => {
    render(<CardContent>Content text</CardContent>);
    
    expect(screen.getByText('Content text')).toBeInTheDocument();
  });

  // Tests CardFooter component
  it('renders CardFooter component', () => {
    render(<CardFooter>Footer text</CardFooter>);
    
    const footer = screen.getByText('Footer text');
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveClass('flex');
  });

  // Tests complete Card structure
  it('renders complete card with all components', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Card</CardTitle>
          <CardDescription>This is a test card</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Main content goes here</p>
        </CardContent>
        <CardFooter>
          <button>Action</button>
        </CardFooter>
      </Card>
    );

    expect(screen.getByText('Test Card')).toBeInTheDocument();
    expect(screen.getByText('This is a test card')).toBeInTheDocument();
    expect(screen.getByText('Main content goes here')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });

  // Tests custom className on Card
  it('applies custom className to Card', () => {
    const { container } = render(<Card className="custom-class">Content</Card>);
    
    expect(container.firstChild).toHaveClass('custom-class');
    expect(container.firstChild).toHaveClass('rounded-lg'); // Default class preserved
  });

  // Tests custom className on CardHeader
  it('applies custom className to CardHeader', () => {
    const { container } = render(<CardHeader className="header-class">Header</CardHeader>);
    
    expect(container.firstChild).toHaveClass('header-class');
    expect(container.firstChild).toHaveClass('flex'); // Default class preserved
  });

  // Tests custom className on CardTitle
  it('applies custom className to CardTitle', () => {
    const { container } = render(<CardTitle className="title-class">Title</CardTitle>);
    
    expect(container.firstChild).toHaveClass('title-class');
  });

  // Tests custom className on CardDescription  
  it('applies custom className to CardDescription', () => {
    const { container } = render(<CardDescription className="desc-class">Desc</CardDescription>);
    
    expect(container.firstChild).toHaveClass('desc-class');
  });

  // Tests custom className on CardContent
  it('applies custom className to CardContent', () => {
    const { container } = render(<CardContent className="content-class">Content</CardContent>);
    
    expect(container.firstChild).toHaveClass('content-class');
  });

  // Tests custom className on CardFooter
  it('applies custom className to CardFooter', () => {
    const { container } = render(<CardFooter className="footer-class">Footer</CardFooter>);
    
    expect(container.firstChild).toHaveClass('footer-class');
  });

  // Tests forwarded ref on Card
  it('forwards ref to Card', () => {
    const ref = { current: null };
    render(<Card ref={ref as any}>Content</Card>);
    
    expect(ref.current).not.toBeNull();
  });

  // Tests forwarded ref on CardHeader
  it('forwards ref to CardHeader', () => {
    const ref = { current: null };
    render(<CardHeader ref={ref as any}>Header</CardHeader>);
    
    expect(ref.current).not.toBeNull();
  });

  // Tests other HTML props pass through
  it('passes through other HTML props to Card', () => {
    const { container } = render(
      <Card data-testid="test-card" aria-label="Test">
        Content
      </Card>
    );
    
    expect(container.firstChild).toHaveAttribute('data-testid', 'test-card');
    expect(container.firstChild).toHaveAttribute('aria-label', 'Test');
  });
});

