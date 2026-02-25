/**
 * OMATrust Specification Compliance: Reputation Display (Reputation Spec)
 * 
 * Tests implementation compliance with OMATrust Reputation Specification
 * for rating display, star visualization, and attestation lists.
 * 
 * SPECIFICATION REFERENCES:
 * - OMATrust Reputation Specification: omatrust-specification-reputation.pdf
 * - Repository: https://github.com/oma3dao/omatrust-docs/tree/main/specification
 * 
 * This test file validates EXTERNAL SPECIFICATIONS, not internal implementation.
 * 
 * KEY REQUIREMENTS:
 * - Ratings 1-5 with star visualization
 * - Average displayed to one decimal place
 * - Review count shown with proper pluralization
 * - Attestation type icons
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StarRating } from '@/components/star-rating';
import { AttestationList } from '@/components/attestation-list';
import type { AttestationQueryResult } from '@/lib/attestation-queries';

describe('OMATrust Reputation Spec: Star Rating Component', () => {
  /**
   * Specification: OMATrust Reputation Specification
   * 
   * Tests validate star rating display requirements.
   */

  describe('Rating Display Format (OT-RP-004, OT-RP-053)', () => {
    it('displays rating with count - OT-RP-004', () => {
      /**
       * Specification: OMATrust Reputation Specification
       * Requirement ID: OT-RP-004
       * Requirement: "Rating count MUST be displayed alongside average"
       */

      render(<StarRating rating={4.5} count={10} />);
      
      // Should show count
      expect(screen.getByText(/10/)).toBeInTheDocument();
      // Should show rating
      expect(screen.getByText(/4\.5/)).toBeInTheDocument();
    });

    it('displays in format "{rating} ({count} reviews)" - OT-RP-053', () => {
      /**
       * Specification: OMATrust Reputation Specification
       * Requirement ID: OT-RP-053
       * Requirement: "Rating display format: '{rating} ({count} reviews)'"
       */

      render(<StarRating rating={4.0} count={5} />);
      
      expect(screen.getByText(/4\.0/)).toBeInTheDocument();
      expect(screen.getByText(/5/)).toBeInTheDocument();
      expect(screen.getByText(/reviews/)).toBeInTheDocument();
    });

    it('uses singular "review" for count = 1 - OT-RP-054', () => {
      /**
       * Specification: OMATrust Reputation Specification
       * Requirement ID: OT-RP-054
       * Requirement: "Singular 'review' for count = 1"
       */

      render(<StarRating rating={5.0} count={1} />);
      
      // Should use singular "review" not "reviews"
      expect(screen.getByText(/1 review\)/)).toBeInTheDocument();
    });

    it('uses plural "reviews" for count > 1', () => {
      render(<StarRating rating={3.5} count={10} />);
      
      expect(screen.getByText(/10 reviews\)/)).toBeInTheDocument();
    });

    it('uses plural "reviews" for count = 0', () => {
      render(<StarRating rating={0} count={0} />);
      
      expect(screen.getByText(/0 reviews\)/)).toBeInTheDocument();
    });
  });

  describe('Rating to Decimal Place (OT-RP-012)', () => {
    it('displays average to one decimal place - OT-RP-012', () => {
      /**
       * Specification: OMATrust Reputation Specification
       * Requirement ID: OT-RP-012
       * Requirement: "Average SHOULD be displayed to one decimal place"
       */

      render(<StarRating rating={4.333333} count={3} />);
      
      // Should display as 4.3, not 4.333333
      expect(screen.getByText(/4\.3/)).toBeInTheDocument();
    });

    it('displays whole numbers with .0', () => {
      render(<StarRating rating={5} count={1} />);
      
      expect(screen.getByText(/5\.0/)).toBeInTheDocument();
    });
  });

  describe('Star Size Variants (OT-RP-050)', () => {
    it('supports small size - OT-RP-050', () => {
      /**
       * Specification: OMATrust Reputation Specification
       * Requirement ID: OT-RP-050
       * Requirement: "Stars MUST support sm/md/lg sizes"
       */

      const { container } = render(<StarRating rating={4} count={5} size="sm" />);
      
      // Small size should use h-4 w-4 classes
      const svg = container.querySelector('svg');
      expect(svg?.classList.contains('h-4') || svg?.classList.contains('w-4')).toBe(true);
    });

    it('supports medium size (default)', () => {
      const { container } = render(<StarRating rating={4} count={5} />);
      
      // Default (medium) size should use h-5 w-5 classes
      const svg = container.querySelector('svg');
      expect(svg?.classList.contains('h-5') || svg?.classList.contains('w-5')).toBe(true);
    });

    it('supports large size', () => {
      const { container } = render(<StarRating rating={4} count={5} size="lg" />);
      
      // Large size should use h-6 w-6 classes
      const svg = container.querySelector('svg');
      expect(svg?.classList.contains('h-6') || svg?.classList.contains('w-6')).toBe(true);
    });
  });

  describe('Star Color (OT-RP-051, OT-RP-052)', () => {
    it('renders 5 star icons', () => {
      const { container } = render(<StarRating rating={3} count={5} />);
      
      // Should render exactly 5 stars
      const stars = container.querySelectorAll('svg');
      expect(stars.length).toBe(5);
    });
  });
});

describe('OMATrust Reputation Spec: Attestation List Component', () => {
  /**
   * Specification: OMATrust Reputation Specification
   * 
   * Tests validate attestation list display requirements.
   */

  describe('Empty State (OT-RP-040)', () => {
    it('displays "No attestations yet" for empty list - OT-RP-040', () => {
      /**
       * Specification: OMATrust Reputation Specification
       * Requirement ID: OT-RP-040
       * Requirement: "Empty attestations MUST display 'No attestations yet'"
       */

      render(<AttestationList attestations={[]} />);
      
      expect(screen.getByText('No attestations yet')).toBeInTheDocument();
    });
  });

  describe('Review Display (OT-RP-020, OT-RP-021, OT-RP-022)', () => {
    const mockAttestation: AttestationQueryResult = {
      uid: '0x1234567890abcdef',
      attester: '0x1234567890123456789012345678901234567890',
      recipient: '0xRecipient',
      data: '0x',
      time: 1704067200, // Jan 1, 2024
      expirationTime: 0,
      revocationTime: 0,
      refUID: '0x',
      revocable: true,
      schemaId: 'user-review',
      schemaTitle: 'User Review',
      decodedData: {
        subject: 'did:web:app.example.com',
        rating: 4,
        comment: 'Great app!',
      },
    };

    it('shows attester address - OT-RP-020', () => {
      /**
       * Specification: OMATrust Reputation Specification
       * Requirement ID: OT-RP-020
       * Requirement: "Reviews MUST show attester address"
       */

      render(<AttestationList attestations={[mockAttestation]} />);
      
      // Should show some form of the attester address
      expect(screen.getByText(/0x1234/)).toBeInTheDocument();
    });

    it('truncates attester address - OT-RP-021', () => {
      /**
       * Specification: OMATrust Reputation Specification
       * Requirement ID: OT-RP-021
       * Requirement: "Attester address SHOULD be truncated for display"
       */

      render(<AttestationList attestations={[mockAttestation]} />);
      
      // Should show truncated format: 0x1234...7890
      expect(screen.getByText(/0x1234.*\.\.\..*7890/)).toBeInTheDocument();
    });

    it('shows review date - OT-RP-022', () => {
      /**
       * Specification: OMATrust Reputation Specification
       * Requirement ID: OT-RP-022
       * Requirement: "Review date MUST be displayed"
       */

      render(<AttestationList attestations={[mockAttestation]} />);
      
      // Unix timestamp 1704067200 = Jan 1, 2024
      // The exact format depends on locale, but should contain the date
      const dateText = screen.getByText(/2024/);
      expect(dateText).toBeInTheDocument();
    });

    it('shows schema title', () => {
      render(<AttestationList attestations={[mockAttestation]} />);
      
      expect(screen.getByText('User Review')).toBeInTheDocument();
    });

    it('shows rating stars for reviews with rating', () => {
      render(<AttestationList attestations={[mockAttestation]} />);
      
      // Should render star icons for the rating
      const stars = document.querySelectorAll('svg');
      expect(stars.length).toBeGreaterThan(0);
    });

    it('shows comment/review body', () => {
      render(<AttestationList attestations={[mockAttestation]} />);
      
      expect(screen.getByText(/Great app!/)).toBeInTheDocument();
    });
  });

  describe('Attestation Type Icons (OT-RP-030 to OT-RP-034)', () => {
    const createAttestation = (schemaId: string, schemaTitle: string): AttestationQueryResult => ({
      uid: `0x${schemaId}`,
      attester: '0x1234567890123456789012345678901234567890',
      recipient: '0xRecipient',
      data: '0x',
      time: 1704067200,
      expirationTime: 0,
      revocationTime: 0,
      refUID: '0x',
      revocable: true,
      schemaId,
      schemaTitle,
      decodedData: { subject: 'did:web:app.example.com' },
    });

    it('renders icon for certification attestations - OT-RP-030', () => {
      /**
       * Specification: OMATrust Reputation Specification
       * Requirement ID: OT-RP-030
       * Requirement: "Certification attestations MUST show Award icon"
       */

      render(<AttestationList attestations={[
        createAttestation('certification', 'Certification')
      ]} />);
      
      // Should render an icon (SVG element)
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('renders icon for endorsement attestations - OT-RP-031', () => {
      /**
       * Specification: OMATrust Reputation Specification
       * Requirement ID: OT-RP-031
       * Requirement: "Endorsement attestations MUST show FileCheck icon"
       */

      render(<AttestationList attestations={[
        createAttestation('endorsement', 'Endorsement')
      ]} />);
      
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('renders icon for security assessments - OT-RP-032', () => {
      /**
       * Specification: OMATrust Reputation Specification
       * Requirement ID: OT-RP-032
       * Requirement: "Security assessments MUST show Shield icon"
       */

      render(<AttestationList attestations={[
        createAttestation('security-assessment', 'Security Assessment')
      ]} />);
      
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('renders icon for user reviews - OT-RP-033', () => {
      /**
       * Specification: OMATrust Reputation Specification
       * Requirement ID: OT-RP-033
       * Requirement: "User reviews MUST show Star icon"
       */

      render(<AttestationList attestations={[
        createAttestation('user-review', 'User Review')
      ]} />);
      
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('renders icon for linked identifiers - OT-RP-034', () => {
      /**
       * Specification: OMATrust Reputation Specification
       * Requirement ID: OT-RP-034
       * Requirement: "Linked identifiers MUST show Link icon"
       */

      render(<AttestationList attestations={[
        createAttestation('linked-identifier', 'Linked Identifier')
      ]} />);
      
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('renders fallback icon for unknown schema types', () => {
      render(<AttestationList attestations={[
        createAttestation('unknown-type', 'Unknown Type')
      ]} />);
      
      // Should still render an icon (fallback to Shield)
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Multiple Attestations', () => {
    it('renders multiple attestations', () => {
      const attestations: AttestationQueryResult[] = [
        {
          uid: '0xreview1',
          attester: '0x1111111111111111111111111111111111111111',
          recipient: '0xRecipient',
          data: '0x',
          time: 1704067200,
          expirationTime: 0,
          revocationTime: 0,
          refUID: '0x',
          revocable: true,
          schemaId: 'user-review',
          schemaTitle: 'User Review',
          decodedData: { subject: 'did:web:app1.com', rating: 5 },
        },
        {
          uid: '0xcert1',
          attester: '0x2222222222222222222222222222222222222222',
          recipient: '0xRecipient',
          data: '0x',
          time: 1704153600,
          expirationTime: 0,
          revocationTime: 0,
          refUID: '0x',
          revocable: true,
          schemaId: 'certification',
          schemaTitle: 'Certification',
          decodedData: { subject: 'did:web:app1.com' },
        },
      ];

      render(<AttestationList attestations={attestations} />);
      
      expect(screen.getByText('User Review')).toBeInTheDocument();
      expect(screen.getByText('Certification')).toBeInTheDocument();
    });
  });
});

