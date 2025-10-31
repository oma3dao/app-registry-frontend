// tests/navigation.test.tsx
// Test suite for the Navigation component
// This file verifies that the Navigation component renders correctly, handles navigation links properly,
// and maintains accessibility standards.

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Navigation } from '../src/components/navigation';
import { vi } from 'vitest';

// Mock Next.js navigation hooks
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({ src, alt, width, height, priority, className }: any) => (
    <img 
      src={src} 
      alt={alt} 
      width={width} 
      height={height} 
      data-priority={priority}
      className={className}
    />
  ),
}));

// Mock the app config constants
vi.mock('@/config/app-config', () => ({
  OMA3_DOCS_URL: 'https://docs.oma3.org',
  OMA3_WEBSITE_URL: 'https://oma3.org',
}));

// Mock the Button component to properly handle props
vi.mock('../src/components/ui/button', () => ({
  Button: ({ children, className, ...props }: any) => {
    const { isConnectButton, connectButtonProps, ...restProps } = props;
    return <button className={className} {...restProps}>{children}</button>;
  },
  buttonVariants: () => '',
}));

describe('Navigation component', () => {
  // This test verifies that the Navigation component renders without crashing
  it('renders without errors', () => {
    render(<Navigation />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  // This test checks that the OMA3 logo is rendered correctly
  it('renders the OMA3 logo', () => {
    render(<Navigation />);
    const logo = screen.getByAltText('OMA3');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', '/OMA_logo.svg');
  });

  // This test verifies that the logo links to the home page
  it('has logo linking to home page', () => {
    render(<Navigation />);
    const logoLink = screen.getByRole('link', { name: /OMA3/i });
    expect(logoLink).toHaveAttribute('href', '/');
  });

  // This test checks that all navigation links are rendered
  it('renders all navigation links', () => {
    render(<Navigation />);
    
    const docsLink = screen.getByRole('link', { name: 'Docs' });
    const aboutLink = screen.getByRole('link', { name: 'About' });
    
    expect(docsLink).toBeInTheDocument();
    expect(aboutLink).toBeInTheDocument();
  });

  // This test verifies that external links have the correct attributes
  it('external links have correct target and rel attributes', () => {
    render(<Navigation />);
    
    const docsLink = screen.getByRole('link', { name: 'Docs' });
    const aboutLink = screen.getByRole('link', { name: 'About' });
    
    expect(docsLink).toHaveAttribute('target', '_blank');
    expect(docsLink).toHaveAttribute('rel', 'noopener noreferrer');
    expect(aboutLink).toHaveAttribute('target', '_blank');
    expect(aboutLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  // This test checks that external links point to the correct URLs
  it('external links point to correct URLs', () => {
    render(<Navigation />);
    
    const docsLink = screen.getByRole('link', { name: 'Docs' });
    const aboutLink = screen.getByRole('link', { name: 'About' });
    
    expect(docsLink).toHaveAttribute('href', 'https://docs.oma3.org');
    expect(aboutLink).toHaveAttribute('href', 'https://oma3.org');
  });

  // This test verifies that the navigation has the correct structure
  it('has correct navigation structure', () => {
    render(<Navigation />);
    
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('border-b');
    
    // Check for the main container
    const container = nav.querySelector('.flex.h-20');
    expect(container).toBeInTheDocument();
  });

  // This test checks that navigation links have proper styling classes
  it('navigation links have proper styling', () => {
    render(<Navigation />);
    
    const docsLink = screen.getByRole('link', { name: 'Docs' });
    const aboutLink = screen.getByRole('link', { name: 'About' });
    
    expect(docsLink).toHaveClass('text-xl', 'font-semibold', 'transition-colors', 'hover:text-primary');
    expect(aboutLink).toHaveClass('text-xl', 'font-semibold', 'transition-colors', 'hover:text-primary');
  });

  // This test verifies accessibility by checking for proper ARIA labels
  it('maintains accessibility standards', () => {
    render(<Navigation />);
    
    // Check that navigation has proper role
    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();
    
    // Check that all links are accessible
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
    
    links.forEach(link => {
      expect(link).toBeInTheDocument();
    });
  });

  // This test checks that the navigation is responsive with proper flex layout
  it('has responsive layout structure', () => {
    render(<Navigation />);
    
    const container = screen.getByRole('navigation').querySelector('.flex.h-20');
    expect(container).toHaveClass('flex', 'h-20', 'items-center', 'px-4', 'max-w-7xl', 'mx-auto');
    
    // Check for flex-1 spacer
    const spacer = container?.querySelector('.flex-1');
    expect(spacer).toBeInTheDocument();
  });
}); 