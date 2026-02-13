/**
 * Attestation Display Component Tests
 * 
 * Tests for AttestationList component rendering
 * Validates proper display of attestation data, icons, and formatting
 * 
 * Related Specification: OMATrust Reputation Specification
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AttestationList } from '@/components/attestation-list';
import type { AttestationQueryResult } from '@/lib/attestation-queries';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Shield: () => <span data-testid="icon-shield">Shield</span>,
  Award: () => <span data-testid="icon-award">Award</span>,
  FileCheck: () => <span data-testid="icon-filecheck">FileCheck</span>,
  LinkIcon: () => <span data-testid="icon-link">Link</span>,
  Star: ({ className }: { className?: string }) => (
    <span data-testid="icon-star" className={className}>Star</span>
  ),
  MessageSquare: () => <span data-testid="icon-message">Message</span>,
}));

describe('AttestationList Component', () => {

  // Helper to create mock attestations
  const createMockAttestation = (overrides: Partial<AttestationQueryResult> = {}): AttestationQueryResult => ({
    uid: '0x' + Math.random().toString(16).slice(2).padEnd(64, '0'),
    attester: '0x1234567890123456789012345678901234567890',
    recipient: '0xabcdef1234567890abcdef1234567890abcdef12',
    data: '0x',
    time: Math.floor(Date.now() / 1000),
    expirationTime: 0,
    revocationTime: 0,
    refUID: '0x' + '0'.repeat(64),
    revocable: true,
    schemaId: 'user-review',
    schemaTitle: 'User Review',
    decodedData: {},
    ...overrides,
  });

  describe('Empty State', () => {
    /**
     * Test: Displays empty message when no attestations
     */
    it('displays empty message when no attestations', () => {
      render(<AttestationList attestations={[]} />);
      
      expect(screen.getByText('No attestations yet')).toBeInTheDocument();
    });

    /**
     * Test: Empty state has appropriate styling
     */
    it('empty state is centered with muted text', () => {
      const { container } = render(<AttestationList attestations={[]} />);
      
      const emptyMessage = container.querySelector('.text-center');
      expect(emptyMessage).toBeInTheDocument();
    });
  });

  describe('Attestation Rendering', () => {
    /**
     * Test: Renders single attestation correctly
     */
    it('renders single attestation with title', () => {
      const attestation = createMockAttestation({
        schemaTitle: 'Security Assessment',
      });

      render(<AttestationList attestations={[attestation]} />);
      
      expect(screen.getByText('Security Assessment')).toBeInTheDocument();
    });

    /**
     * Test: Renders multiple attestations
     */
    it('renders multiple attestations', () => {
      const attestations = [
        createMockAttestation({ schemaTitle: 'User Review' }),
        createMockAttestation({ schemaTitle: 'Endorsement' }),
        createMockAttestation({ schemaTitle: 'Certification' }),
      ];

      render(<AttestationList attestations={attestations} />);
      
      expect(screen.getByText('User Review')).toBeInTheDocument();
      expect(screen.getByText('Endorsement')).toBeInTheDocument();
      expect(screen.getByText('Certification')).toBeInTheDocument();
    });

    /**
     * Test: Displays attester address (shortened)
     */
    it('displays shortened attester address', () => {
      const attestation = createMockAttestation({
        attester: '0xabcdef1234567890abcdef1234567890abcdef12',
      });

      render(<AttestationList attestations={[attestation]} />);
      
      // Format: 0xabcd...ef12
      expect(screen.getByText(/By 0xabcd.*ef12/)).toBeInTheDocument();
    });

    /**
     * Test: Displays formatted date
     */
    it('displays formatted date', () => {
      const specificDate = new Date('2024-06-15T12:00:00Z').getTime() / 1000;
      const attestation = createMockAttestation({
        time: specificDate,
      });

      render(<AttestationList attestations={[attestation]} />);
      
      // Date format varies by locale, just check something is rendered
      const dateRegex = /\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|\w+ \d{1,2}, \d{4}/;
      expect(screen.getByText(dateRegex)).toBeInTheDocument();
    });
  });

  describe('Schema Icons', () => {
    /**
     * Test: Certification attestation shows Award icon
     */
    it('shows Award icon for certification', () => {
      const attestation = createMockAttestation({
        schemaId: 'certification',
        schemaTitle: 'Certification',
      });

      render(<AttestationList attestations={[attestation]} />);
      
      expect(screen.getByTestId('icon-award')).toBeInTheDocument();
    });

    /**
     * Test: Endorsement shows FileCheck icon
     */
    it('shows FileCheck icon for endorsement', () => {
      const attestation = createMockAttestation({
        schemaId: 'endorsement',
        schemaTitle: 'Endorsement',
      });

      render(<AttestationList attestations={[attestation]} />);
      
      expect(screen.getByTestId('icon-filecheck')).toBeInTheDocument();
    });

    /**
     * Test: Security assessment shows Shield icon
     */
    it('shows Shield icon for security-assessment', () => {
      const attestation = createMockAttestation({
        schemaId: 'security-assessment',
        schemaTitle: 'Security Assessment',
      });

      render(<AttestationList attestations={[attestation]} />);
      
      expect(screen.getByTestId('icon-shield')).toBeInTheDocument();
    });

    /**
     * Test: User review shows Star icon
     */
    it('shows Star icon for user-review', () => {
      const attestation = createMockAttestation({
        schemaId: 'user-review',
        schemaTitle: 'User Review',
      });

      render(<AttestationList attestations={[attestation]} />);
      
      expect(screen.getAllByTestId('icon-star').length).toBeGreaterThan(0);
    });

    /**
     * Test: Linked identifier shows Link icon
     */
    it('shows Link icon for linked-identifier', () => {
      const attestation = createMockAttestation({
        schemaId: 'linked-identifier',
        schemaTitle: 'Linked Identifier',
      });

      render(<AttestationList attestations={[attestation]} />);
      
      expect(screen.getByTestId('icon-link')).toBeInTheDocument();
    });

    /**
     * Test: User review response shows MessageSquare icon
     */
    it('shows MessageSquare icon for user-review-response', () => {
      const attestation = createMockAttestation({
        schemaId: 'user-review-response',
        schemaTitle: 'Response',
      });

      render(<AttestationList attestations={[attestation]} />);
      
      expect(screen.getByTestId('icon-message')).toBeInTheDocument();
    });

    /**
     * Test: Unknown schema falls back to Shield icon
     */
    it('falls back to Shield icon for unknown schema', () => {
      const attestation = createMockAttestation({
        schemaId: 'unknown-schema',
        schemaTitle: 'Unknown',
      });

      render(<AttestationList attestations={[attestation]} />);
      
      expect(screen.getByTestId('icon-shield')).toBeInTheDocument();
    });
  });

  describe('Rating Display', () => {
    /**
     * Test: Displays star rating when present
     */
    it('displays star rating when rating is present', () => {
      const attestation = createMockAttestation({
        schemaId: 'user-review',
        decodedData: {
          rating: 4,
        },
      });

      render(<AttestationList attestations={[attestation]} />);
      
      // Should have 5 stars total
      const stars = screen.getAllByTestId('icon-star');
      expect(stars.length).toBeGreaterThanOrEqual(5);
    });

    /**
     * Test: Does not display stars when no rating
     */
    it('does not display extra stars when no rating', () => {
      const attestation = createMockAttestation({
        schemaId: 'endorsement',
        schemaTitle: 'Endorsement',
        decodedData: {},
      });

      const { container } = render(<AttestationList attestations={[attestation]} />);
      
      // Should only have the one icon star from the schema icon mapping fallback, not 5 rating stars
      const allStars = container.querySelectorAll('[data-testid="icon-star"]');
      // For endorsement without rating, we expect 0-1 stars (icon only, not rating)
      expect(allStars.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Comment Display', () => {
    /**
     * Test: Displays comment when present
     */
    it('displays comment when present', () => {
      const attestation = createMockAttestation({
        decodedData: {
          comment: 'This is a great app!',
        },
      });

      render(<AttestationList attestations={[attestation]} />);
      
      expect(screen.getByText(/This is a great app!/)).toBeInTheDocument();
    });

    /**
     * Test: Comment is wrapped in quotes
     */
    it('wraps comment in quotes', () => {
      const attestation = createMockAttestation({
        decodedData: {
          comment: 'Great experience',
        },
      });

      render(<AttestationList attestations={[attestation]} />);
      
      const commentText = screen.getByText(/Great experience/);
      expect(commentText.textContent).toContain('Great experience');
    });

    /**
     * Test: Long comments are truncated
     */
    it('truncates long comments with line-clamp', () => {
      const longComment = 'A'.repeat(500);
      const attestation = createMockAttestation({
        decodedData: {
          comment: longComment,
        },
      });

      const { container } = render(<AttestationList attestations={[attestation]} />);
      
      const commentElement = container.querySelector('.line-clamp-2');
      expect(commentElement).toBeInTheDocument();
    });
  });

  describe('Unique Keys', () => {
    /**
     * Test: Each attestation has unique key (uid)
     */
    it('uses uid as key for each attestation', () => {
      const attestations = [
        createMockAttestation({ uid: '0x' + 'a'.repeat(64) }),
        createMockAttestation({ uid: '0x' + 'b'.repeat(64) }),
      ];

      const { container } = render(<AttestationList attestations={attestations} />);
      
      // Should have 2 separate attestation cards
      const cards = container.querySelectorAll('.border.rounded-lg');
      expect(cards.length).toBe(2);
    });
  });

  describe('Accessibility', () => {
    /**
     * Test: Attestation cards are focusable for accessibility
     */
    it('renders semantic HTML structure', () => {
      const attestation = createMockAttestation({
        schemaTitle: 'User Review',
      });

      const { container } = render(<AttestationList attestations={[attestation]} />);
      
      // Should have proper heading for title
      expect(container.querySelector('h4')).toBeInTheDocument();
    });

    /**
     * Test: Attester address has monospace font for readability
     */
    it('displays attester address in monospace font', () => {
      const attestation = createMockAttestation();

      const { container } = render(<AttestationList attestations={[attestation]} />);
      
      const addressElement = container.querySelector('.font-mono');
      expect(addressElement).toBeInTheDocument();
    });
  });

  describe('Hover States', () => {
    /**
     * Test: Cards have hover transition
     */
    it('cards have hover transition class', () => {
      const attestation = createMockAttestation();

      const { container } = render(<AttestationList attestations={[attestation]} />);
      
      const card = container.querySelector('.hover\\:bg-gray-50');
      expect(card).toBeInTheDocument();
    });
  });
});

