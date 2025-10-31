// Test for the Input component: checks rendering, different types, states, and user interactions
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { Input } from '../src/components/ui/input';

describe('Input', () => {
  // Test basic input rendering
  it('renders input with placeholder', () => {
    render(<Input placeholder="Enter text" />);
    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toBeInTheDocument();
  });

  // Test different input types
  it('renders with different input types', () => {
    const { rerender } = render(<Input type="text" placeholder="Text input" />);
    expect(screen.getByDisplayValue('')).toHaveAttribute('type', 'text');

    rerender(<Input type="email" placeholder="Email input" />);
    expect(screen.getByDisplayValue('')).toHaveAttribute('type', 'email');

    rerender(<Input type="password" placeholder="Password input" />);
    expect(screen.getByDisplayValue('')).toHaveAttribute('type', 'password');

    rerender(<Input type="number" placeholder="Number input" />);
    expect(screen.getByDisplayValue('')).toHaveAttribute('type', 'number');
  });

  // Test input value handling
  it('handles value changes', () => {
    const handleChange = vi.fn();
    render(<Input value="initial" onChange={handleChange} />);
    
    const input = screen.getByDisplayValue('initial');
    fireEvent.change(input, { target: { value: 'new value' } });
    
    expect(handleChange).toHaveBeenCalled();
  });

  // Test disabled state
  it('handles disabled state', () => {
    render(<Input disabled placeholder="Disabled input" />);
    const input = screen.getByPlaceholderText('Disabled input');
    expect(input).toBeDisabled();
  });

  // Test required attribute
  it('applies required attribute', () => {
    render(<Input required placeholder="Required input" />);
    const input = screen.getByPlaceholderText('Required input');
    expect(input).toBeRequired();
  });

  // Test custom className
  it('applies custom className', () => {
    render(<Input className="custom-class" placeholder="Custom input" />);
    const input = screen.getByPlaceholderText('Custom input');
    expect(input).toHaveClass('custom-class');
  });

  // Test input with default value
  it('renders with default value', () => {
    render(<Input defaultValue="default text" />);
    expect(screen.getByDisplayValue('default text')).toBeInTheDocument();
  });

  // Test input focus and blur events
  it('handles focus and blur events', () => {
    const handleFocus = vi.fn();
    const handleBlur = vi.fn();
    
    render(<Input onFocus={handleFocus} onBlur={handleBlur} placeholder="Test input" />);
    const input = screen.getByPlaceholderText('Test input');
    
    fireEvent.focus(input);
    expect(handleFocus).toHaveBeenCalled();
    
    fireEvent.blur(input);
    expect(handleBlur).toHaveBeenCalled();
  });

  // Test input with name attribute
  it('applies name attribute', () => {
    render(<Input name="test-input" placeholder="Named input" />);
    const input = screen.getByPlaceholderText('Named input');
    expect(input).toHaveAttribute('name', 'test-input');
  });

  // Test input with id attribute
  it('applies id attribute', () => {
    render(<Input id="test-id" placeholder="ID input" />);
    const input = screen.getByPlaceholderText('ID input');
    expect(input).toHaveAttribute('id', 'test-id');
  });

  // Test input with aria attributes
  it('applies aria attributes', () => {
    render(
      <Input 
        aria-label="Test input"
        aria-describedby="description"
        placeholder="Accessible input"
      />
    );
    const input = screen.getByPlaceholderText('Accessible input');
    expect(input).toHaveAttribute('aria-label', 'Test input');
    expect(input).toHaveAttribute('aria-describedby', 'description');
  });
}); 