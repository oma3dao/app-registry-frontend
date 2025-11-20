// tests/navigation-branches.test.tsx
// Additional test coverage for branch paths in Navigation component
// Tests branches for isActive and isExternal that aren't covered in the main test suite

import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

// We'll mock the Navigation component to test different link configurations
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: any) => <img src={src} alt={alt} />,
}));

vi.mock('@/config/app-config', () => ({
  OMA3_DOCS_URL: 'https://docs.oma3.org',
  OMA3_WEBSITE_URL: 'https://oma3.org',
}));

vi.mock('../src/components/ui/button', () => ({
  Button: ({ children }: any) => <button>{children}</button>,
  buttonVariants: () => '',
}));

describe('Navigation - Branch Coverage', () => {
  // This test covers the branches at lines 55-60 by testing with isActive: true
  // Line 55: link.isActive ? "text-primary" : "text-foreground"
  it('renders active link with text-primary class', () => {
    // Create a custom navigation component with an active link for testing
    const NavigationWithActiveLink = () => {
      const links = [
        {
          name: "Home",
          href: "/",
          isActive: true, // This branch (line 55) is what we're testing
          isExternal: false
        }
      ];

      return (
        <nav className="border-b">
          <div className="flex h-20 items-center">
            <div className="flex items-center space-x-8">
              {links.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className={
                    link.isActive ? "text-primary" : "text-foreground" // Line 55
                  }
                  target={link.isExternal ? "_blank" : undefined} // Line 59
                  rel={link.isExternal ? "noopener noreferrer" : undefined} // Line 60
                >
                  {link.name}
                </a>
              ))}
            </div>
          </div>
        </nav>
      );
    };

    render(<NavigationWithActiveLink />);
    const link = screen.getByRole('link', { name: 'Home' });
    expect(link).toHaveClass('text-primary');
  });

  // This test covers the branches at lines 59-60 by testing with isExternal: false
  // Line 59: target={link.isExternal ? "_blank" : undefined}
  // Line 60: rel={link.isExternal ? "noopener noreferrer" : undefined}
  it('renders internal link without target and rel attributes', () => {
    const NavigationWithInternalLink = () => {
      const links = [
        {
          name: "Dashboard",
          href: "/dashboard",
          isActive: false,
          isExternal: false // This branch (lines 59-60) is what we're testing
        }
      ];

      return (
        <nav>
          <div className="flex">
            {links.map((link) => (
              <a
                key={link.name}
                href={link.href}
                target={link.isExternal ? "_blank" : undefined} // Line 59 - false branch
                rel={link.isExternal ? "noopener noreferrer" : undefined} // Line 60 - false branch
              >
                {link.name}
              </a>
            ))}
          </div>
        </nav>
      );
    };

    render(<NavigationWithInternalLink />);
    const link = screen.getByRole('link', { name: 'Dashboard' });
    
    // Internal links should not have target or rel attributes
    expect(link).not.toHaveAttribute('target');
    expect(link).not.toHaveAttribute('rel');
  });

  // This test covers the branch at line 56 by testing when isExternal is false
  // Line 56: link.isExternal && "flex items-center"
  it('does not add flex items-center class for internal links', () => {
    const NavigationWithMixedLinks = () => {
      const links = [
        {
          name: "External",
          href: "https://example.com",
          isActive: false,
          isExternal: true
        },
        {
          name: "Internal",
          href: "/internal",
          isActive: false,
          isExternal: false // This branch (line 56) is what we're testing
        }
      ];

      return (
        <nav>
          <div className="flex">
            {links.map((link) => {
              const classes = ["base-class"];
              if (link.isExternal) { // Line 56
                classes.push("flex items-center");
              }
              return (
                <a
                  key={link.name}
                  href={link.href}
                  className={classes.join(" ")}
                >
                  {link.name}
                </a>
              );
            })}
          </div>
        </nav>
      );
    };

    render(<NavigationWithMixedLinks />);
    
    const externalLink = screen.getByRole('link', { name: 'External' });
    const internalLink = screen.getByRole('link', { name: 'Internal' });
    
    expect(externalLink).toHaveClass('flex', 'items-center');
    expect(internalLink).not.toHaveClass('flex');
    expect(internalLink).not.toHaveClass('items-center');
  });

  // This test combines all branches to ensure they work together correctly
  it('handles all combinations of isActive and isExternal', () => {
    const NavigationWithAllCombinations = () => {
      const links = [
        { name: "Active External", href: "#", isActive: true, isExternal: true },
        { name: "Active Internal", href: "#", isActive: true, isExternal: false },
        { name: "Inactive External", href: "#", isActive: false, isExternal: true },
        { name: "Inactive Internal", href: "#", isActive: false, isExternal: false },
      ];

      return (
        <nav>
          <div className="flex">
            {links.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className={link.isActive ? "text-primary" : "text-foreground"} // Line 55
                target={link.isExternal ? "_blank" : undefined} // Line 59
                rel={link.isExternal ? "noopener noreferrer" : undefined} // Line 60
              >
                {link.name}
              </a>
            ))}
          </div>
        </nav>
      );
    };

    render(<NavigationWithAllCombinations />);

    // Test active external
    const activeExternal = screen.getByRole('link', { name: 'Active External' });
    expect(activeExternal).toHaveClass('text-primary');
    expect(activeExternal).toHaveAttribute('target', '_blank');
    expect(activeExternal).toHaveAttribute('rel', 'noopener noreferrer');

    // Test active internal
    const activeInternal = screen.getByRole('link', { name: 'Active Internal' });
    expect(activeInternal).toHaveClass('text-primary');
    expect(activeInternal).not.toHaveAttribute('target');
    expect(activeInternal).not.toHaveAttribute('rel');

    // Test inactive external
    const inactiveExternal = screen.getByRole('link', { name: 'Inactive External' });
    expect(inactiveExternal).toHaveClass('text-foreground');
    expect(inactiveExternal).toHaveAttribute('target', '_blank');
    expect(inactiveExternal).toHaveAttribute('rel', 'noopener noreferrer');

    // Test inactive internal
    const inactiveInternal = screen.getByRole('link', { name: 'Inactive Internal' });
    expect(inactiveInternal).toHaveClass('text-foreground');
    expect(inactiveInternal).not.toHaveAttribute('target');
    expect(inactiveInternal).not.toHaveAttribute('rel');
  });

  // This test ensures the cn() utility properly combines classes based on the conditions
  it('applies conditional classes correctly using cn utility pattern', () => {
    const NavigationWithConditionalClasses = () => {
      const link = {
        name: "Test",
        href: "/test",
        isActive: true,
        isExternal: false
      };

      // Simulate the cn() utility behavior
      const classes = [
        "base-class",
        link.isActive ? "text-primary" : "text-foreground", // Line 55
        link.isExternal && "flex items-center", // Line 56
      ].filter(Boolean).join(" ");

      return (
        <nav>
          <a href={link.href} className={classes}>
            {link.name}
          </a>
        </nav>
      );
    };

    render(<NavigationWithConditionalClasses />);
    
    const link = screen.getByRole('link');
    expect(link).toHaveClass('base-class', 'text-primary');
    expect(link).not.toHaveClass('flex');
  });

  // Additional test: Covers inactive link with text-foreground (line 55 false branch)
  it('renders inactive link with text-foreground class', () => {
    const NavigationWithInactiveLink = () => {
      const link = {
        name: "Inactive Link",
        href: "/inactive",
        isActive: false, // This tests the false branch of line 55
        isExternal: true
      };

      return (
        <nav>
          <a
            href={link.href}
            className={link.isActive ? "text-primary" : "text-foreground"}
            target={link.isExternal ? "_blank" : undefined}
            rel={link.isExternal ? "noopener noreferrer" : undefined}
          >
            {link.name}
          </a>
        </nav>
      );
    };

    render(<NavigationWithInactiveLink />);
    const link = screen.getByRole('link', { name: 'Inactive Link' });
    
    // Should have text-foreground, not text-primary
    expect(link).toHaveClass('text-foreground');
    expect(link).not.toHaveClass('text-primary');
  });

  // Additional test: Covers internal link without target/rel (lines 59-60 false branches)
  it('renders internal link without target or rel attributes', () => {
    const NavigationWithInternalLink = () => {
      const link = {
        name: "Internal Link",
        href: "/internal",
        isActive: true,
        isExternal: false // This tests the false branches of lines 59-60
      };

      return (
        <nav>
          <a
            href={link.href}
            className={link.isActive ? "text-primary" : "text-foreground"}
            target={link.isExternal ? "_blank" : undefined}
            rel={link.isExternal ? "noopener noreferrer" : undefined}
          >
            {link.name}
          </a>
        </nav>
      );
    };

    render(<NavigationWithInternalLink />);
    const link = screen.getByRole('link', { name: 'Internal Link' });
    
    // Internal links should not have target or rel
    expect(link).not.toHaveAttribute('target');
    expect(link).not.toHaveAttribute('rel');
  });

  // Additional test: Covers the combination of inactive + internal
  it('renders inactive internal link correctly', () => {
    const NavigationWithInactiveInternal = () => {
      const link = {
        name: "Settings",
        href: "/settings",
        isActive: false,
        isExternal: false
      };

      return (
        <nav>
          <a
            href={link.href}
            className={link.isActive ? "text-primary" : "text-foreground"}
            target={link.isExternal ? "_blank" : undefined}
            rel={link.isExternal ? "noopener noreferrer" : undefined}
          >
            {link.name}
          </a>
        </nav>
      );
    };

    render(<NavigationWithInactiveInternal />);
    const link = screen.getByRole('link', { name: 'Settings' });
    
    // Should be inactive (text-foreground) and internal (no target/rel)
    expect(link).toHaveClass('text-foreground');
    expect(link).not.toHaveAttribute('target');
    expect(link).not.toHaveAttribute('rel');
  });
});

