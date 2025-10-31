// tests/test-utils.tsx
import React from 'react';
import { render, RenderOptions } from '@testing-library/react';

// Test wrapper component that provides necessary context
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div data-testid="test-wrapper">{children}</div>;
};

// Custom render function that wraps components with necessary providers
const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return render(ui, { wrapper: TestWrapper, ...options });
};

// Re-export everything from testing-library
export * from '@testing-library/react';

// Override the render method
export { customRender as render }; 