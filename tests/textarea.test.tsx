// Test for the Textarea component: checks rendering, different states, and user interactions
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { Textarea } from '../src/components/ui/textarea';

describe('Textarea', () => {
  // Test basic textarea rendering
  it('renders textarea with placeholder', () => {
    render(<Textarea placeholder="Enter text" />);
    const textarea = screen.getByPlaceholderText('Enter text');
    expect(textarea).toBeInTheDocument();
  });

  // Test textarea value handling
  it('handles value changes', () => {
    const handleChange = vi.fn();
    render(<Textarea value="initial" onChange={handleChange} />);
    
    const textarea = screen.getByDisplayValue('initial');
    fireEvent.change(textarea, { target: { value: 'new value' } });
    
    expect(handleChange).toHaveBeenCalled();
  });

  // Test disabled state
  it('handles disabled state', () => {
    render(<Textarea disabled placeholder="Disabled textarea" />);
    const textarea = screen.getByPlaceholderText('Disabled textarea');
    expect(textarea).toBeDisabled();
  });

  // Test required attribute
  it('applies required attribute', () => {
    render(<Textarea required placeholder="Required textarea" />);
    const textarea = screen.getByPlaceholderText('Required textarea');
    expect(textarea).toBeRequired();
  });

  // Test custom className
  it('applies custom className', () => {
    render(<Textarea className="custom-class" placeholder="Custom textarea" />);
    const textarea = screen.getByPlaceholderText('Custom textarea');
    expect(textarea).toHaveClass('custom-class');
  });

  // Test textarea with default value
  it('renders with default value', () => {
    render(<Textarea defaultValue="default text" />);
    expect(screen.getByDisplayValue('default text')).toBeInTheDocument();
  });

  // Test textarea focus and blur events
  it('handles focus and blur events', () => {
    const handleFocus = vi.fn();
    const handleBlur = vi.fn();
    
    render(<Textarea onFocus={handleFocus} onBlur={handleBlur} placeholder="Test textarea" />);
    const textarea = screen.getByPlaceholderText('Test textarea');
    
    fireEvent.focus(textarea);
    expect(handleFocus).toHaveBeenCalled();
    
    fireEvent.blur(textarea);
    expect(handleBlur).toHaveBeenCalled();
  });

  // Test textarea with name attribute
  it('applies name attribute', () => {
    render(<Textarea name="test-textarea" placeholder="Named textarea" />);
    const textarea = screen.getByPlaceholderText('Named textarea');
    expect(textarea).toHaveAttribute('name', 'test-textarea');
  });

  // Test textarea with id attribute
  it('applies id attribute', () => {
    render(<Textarea id="test-id" placeholder="ID textarea" />);
    const textarea = screen.getByPlaceholderText('ID textarea');
    expect(textarea).toHaveAttribute('id', 'test-id');
  });

  // Test textarea with rows and cols attributes
  it('applies rows and cols attributes', () => {
    render(<Textarea rows={5} cols={50} placeholder="Sized textarea" />);
    const textarea = screen.getByPlaceholderText('Sized textarea');
    expect(textarea).toHaveAttribute('rows', '5');
    expect(textarea).toHaveAttribute('cols', '50');
  });

  // Test textarea with maxlength attribute
  it('applies maxlength attribute', () => {
    render(<Textarea maxLength={100} placeholder="Limited textarea" />);
    const textarea = screen.getByPlaceholderText('Limited textarea');
    expect(textarea).toHaveAttribute('maxlength', '100');
  });

  // Test textarea with aria attributes
  it('applies aria attributes', () => {
    render(
      <Textarea 
        aria-label="Test textarea"
        aria-describedby="description"
        placeholder="Accessible textarea"
      />
    );
    const textarea = screen.getByPlaceholderText('Accessible textarea');
    expect(textarea).toHaveAttribute('aria-label', 'Test textarea');
    expect(textarea).toHaveAttribute('aria-describedby', 'description');
  });

  // Test textarea with readOnly attribute
  it('applies readOnly attribute', () => {
    render(<Textarea readOnly placeholder="Read-only textarea" />);
    const textarea = screen.getByPlaceholderText('Read-only textarea');
    expect(textarea).toHaveAttribute('readonly');
  });
}); 