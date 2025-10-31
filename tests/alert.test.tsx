// Test for the Alert component: checks rendering, different variants, and content
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Alert, AlertDescription, AlertTitle } from '../src/components/ui/alert';

describe('Alert', () => {
  // Test basic alert rendering
  it('renders alert with content', () => {
    render(
      <Alert>
        <AlertTitle>Alert Title</AlertTitle>
        <AlertDescription>This is an alert description</AlertDescription>
      </Alert>
    );

    expect(screen.getByText('Alert Title')).toBeInTheDocument();
    expect(screen.getByText('This is an alert description')).toBeInTheDocument();
  });

  // Test alert with different variants
  it('renders with different variants', () => {
    const { rerender } = render(
      <Alert variant="default">
        <AlertDescription>Default alert</AlertDescription>
      </Alert>
    );
    expect(screen.getByText('Default alert')).toBeInTheDocument();

    rerender(
      <Alert variant="destructive">
        <AlertDescription>Destructive alert</AlertDescription>
      </Alert>
    );
    expect(screen.getByText('Destructive alert')).toBeInTheDocument();
  });

  // Test alert with custom className
  it('applies custom className', () => {
    render(
      <Alert className="custom-alert">
        <AlertDescription>Custom alert</AlertDescription>
      </Alert>
    );
    
    const alert = screen.getByText('Custom alert').closest('[role="alert"]');
    expect(alert).toHaveClass('custom-alert');
  });

  // Test alert with only description
  it('renders alert with only description', () => {
    render(<Alert><AlertDescription>Simple alert</AlertDescription></Alert>);
    expect(screen.getByText('Simple alert')).toBeInTheDocument();
  });

  // Test alert with only title
  it('renders alert with only title', () => {
    render(<Alert><AlertTitle>Title only</AlertTitle></Alert>);
    expect(screen.getByText('Title only')).toBeInTheDocument();
  });

  // Test alert with additional content
  it('renders alert with additional content', () => {
    render(
      <Alert>
        <AlertTitle>Alert with extra content</AlertTitle>
        <AlertDescription>Main description</AlertDescription>
        <div>Additional content</div>
      </Alert>
    );

    expect(screen.getByText('Alert with extra content')).toBeInTheDocument();
    expect(screen.getByText('Main description')).toBeInTheDocument();
    expect(screen.getByText('Additional content')).toBeInTheDocument();
  });

  // Test alert accessibility
  it('has proper accessibility attributes', () => {
    render(
      <Alert>
        <AlertTitle>Accessible Alert</AlertTitle>
        <AlertDescription>This alert is accessible</AlertDescription>
      </Alert>
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
  });
}); 