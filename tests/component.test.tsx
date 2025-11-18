// Test for the LandingPage component: checks that the main heading is rendered
import React from 'react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock client and thirdweb/react dependencies
vi.mock('../src/app/client', () => ({
  __esModule: true,
  client: {},
  default: {},
}));
vi.mock('thirdweb/react', () => ({
  useActiveAccount: () => ({}),
  ConnectButton: () => null,
}));
import { render, screen } from '@testing-library/react';
import LandingPage from '../src/components/landing-page';

describe('LandingPage', () => {
  // This test checks that the main heading is present in the document
  it('renders the main heading', () => {
    render(<LandingPage />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('OMATrust is Trust for');
  });
}); 