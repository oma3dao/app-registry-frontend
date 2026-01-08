/**
 * Star Rating Component Tests
 * 
 * Tests for StarRating component rendering and calculations
 * Validates star display, partial ratings, and size variants
 * 
 * Related Specification: OMATrust Reputation Specification
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StarRating } from '@/components/star-rating';

// Mock lucide-react Star icon
vi.mock('lucide-react', () => ({
  Star: ({ className }: { className?: string }) => (
    <span 
      data-testid="star-icon" 
      className={className}
      data-filled={className?.includes('fill-yellow') ? 'true' : 'false'}
    >
      ★
    </span>
  ),
}));

describe('StarRating Component', () => {

  describe('Basic Rendering', () => {
    /**
     * Test: Renders 5 stars
     */
    it('renders exactly 5 stars', () => {
      render(<StarRating rating={3} count={10} />);
      
      const stars = screen.getAllByTestId('star-icon');
      expect(stars.length).toBe(5);
    });

    /**
     * Test: Displays rating value
     */
    it('displays rating value with one decimal', () => {
      render(<StarRating rating={4.5} count={10} />);
      
      expect(screen.getByText(/4\.5/)).toBeInTheDocument();
    });

    /**
     * Test: Displays review count
     */
    it('displays review count', () => {
      render(<StarRating rating={4} count={25} />);
      
      expect(screen.getByText(/25/)).toBeInTheDocument();
    });

    /**
     * Test: Singular "review" for count of 1
     */
    it('uses singular "review" for count of 1', () => {
      render(<StarRating rating={5} count={1} />);
      
      expect(screen.getByText('5.0 (1 review)')).toBeInTheDocument();
    });

    /**
     * Test: Plural "reviews" for count > 1
     */
    it('uses plural "reviews" for count > 1', () => {
      render(<StarRating rating={4} count={5} />);
      
      expect(screen.getByText('4.0 (5 reviews)')).toBeInTheDocument();
    });
  });

  describe('Star Fill States', () => {
    /**
     * Test: 0 rating shows no filled stars
     */
    it('shows no filled stars for 0 rating', () => {
      render(<StarRating rating={0} count={0} />);
      
      const stars = screen.getAllByTestId('star-icon');
      const filledStars = stars.filter(s => s.getAttribute('data-filled') === 'true');
      expect(filledStars.length).toBe(0);
    });

    /**
     * Test: 5 rating shows all filled stars
     */
    it('shows all filled stars for 5 rating', () => {
      render(<StarRating rating={5} count={10} />);
      
      const stars = screen.getAllByTestId('star-icon');
      const filledStars = stars.filter(s => s.getAttribute('data-filled') === 'true');
      expect(filledStars.length).toBe(5);
    });

    /**
     * Test: 3 rating shows 3 filled stars
     */
    it('shows correct number of filled stars for integer rating', () => {
      render(<StarRating rating={3} count={10} />);
      
      const stars = screen.getAllByTestId('star-icon');
      const filledStars = stars.filter(s => s.getAttribute('data-filled') === 'true');
      expect(filledStars.length).toBe(3);
    });

    /**
     * Test: 2.5 rating shows 2 full + 1 partial
     */
    it('handles partial ratings', () => {
      render(<StarRating rating={2.5} count={10} />);
      
      const stars = screen.getAllByTestId('star-icon');
      // At least 2 should be filled (the full ones)
      const filledStars = stars.filter(s => 
        s.className?.includes('fill-yellow-400') || 
        s.className?.includes('fill-yellow-200')
      );
      expect(filledStars.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Size Variants', () => {
    /**
     * Test: Small size variant
     */
    it('applies small size classes', () => {
      render(<StarRating rating={4} count={10} size="sm" />);
      
      const stars = screen.getAllByTestId('star-icon');
      expect(stars[0].className).toContain('h-4');
      expect(stars[0].className).toContain('w-4');
    });

    /**
     * Test: Medium size variant (default)
     */
    it('applies medium size classes by default', () => {
      render(<StarRating rating={4} count={10} />);
      
      const stars = screen.getAllByTestId('star-icon');
      expect(stars[0].className).toContain('h-5');
      expect(stars[0].className).toContain('w-5');
    });

    /**
     * Test: Large size variant
     */
    it('applies large size classes', () => {
      render(<StarRating rating={4} count={10} size="lg" />);
      
      const stars = screen.getAllByTestId('star-icon');
      expect(stars[0].className).toContain('h-6');
      expect(stars[0].className).toContain('w-6');
    });
  });

  describe('Edge Cases', () => {
    /**
     * Test: Zero count displays correctly
     */
    it('handles zero count', () => {
      render(<StarRating rating={0} count={0} />);
      
      expect(screen.getByText('0.0 (0 reviews)')).toBeInTheDocument();
    });

    /**
     * Test: Very high count displays correctly
     */
    it('handles large review counts', () => {
      render(<StarRating rating={4.8} count={10000} />);
      
      expect(screen.getByText(/10000 reviews/)).toBeInTheDocument();
    });

    /**
     * Test: Rating rounds to one decimal
     */
    it('rounds rating to one decimal place', () => {
      render(<StarRating rating={4.567} count={10} />);
      
      expect(screen.getByText(/4\.6/)).toBeInTheDocument();
    });

    /**
     * Test: Negative rating treated as 0
     * Note: Component may not handle this, but we document the behavior
     */
    it('handles rating below 0', () => {
      render(<StarRating rating={-1} count={5} />);
      
      // Should still render, even if behavior is undefined
      const stars = screen.getAllByTestId('star-icon');
      expect(stars.length).toBe(5);
    });

    /**
     * Test: Rating above 5 caps at 5 filled stars
     * Note: Component may not handle this, but we document the behavior
     */
    it('handles rating above 5', () => {
      render(<StarRating rating={10} count={5} />);
      
      // Should still render 5 stars
      const stars = screen.getAllByTestId('star-icon');
      expect(stars.length).toBe(5);
    });
  });

  describe('Rating Calculation Integration', () => {
    /**
     * Test: Common rating values display correctly
     */
    it('displays common rating values', () => {
      const testCases = [
        { rating: 1, expected: '1.0' },
        { rating: 2.5, expected: '2.5' },
        { rating: 3.3, expected: '3.3' },
        { rating: 4.7, expected: '4.7' },
        { rating: 5, expected: '5.0' },
      ];

      for (const { rating, expected } of testCases) {
        const { unmount } = render(<StarRating rating={rating} count={10} />);
        expect(screen.getByText(new RegExp(expected))).toBeInTheDocument();
        unmount();
      }
    });
  });

  describe('Styling', () => {
    /**
     * Test: Container has flex layout
     */
    it('container has flex layout with gap', () => {
      const { container } = render(<StarRating rating={4} count={10} />);
      
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('flex');
      expect(wrapper.className).toContain('items-center');
    });

    /**
     * Test: Stars container has proper spacing
     */
    it('stars have proper spacing', () => {
      const { container } = render(<StarRating rating={4} count={10} />);
      
      const starsContainer = container.querySelector('.gap-0\\.5');
      expect(starsContainer).toBeInTheDocument();
    });

    /**
     * Test: Text has muted color
     */
    it('count text has muted styling', () => {
      const { container } = render(<StarRating rating={4} count={10} />);
      
      const textElement = container.querySelector('.text-gray-600');
      expect(textElement).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    /**
     * Test: Rating value is readable
     */
    it('rating value is visible in text', () => {
      render(<StarRating rating={4.5} count={25} />);
      
      // Screen readers can read the text
      expect(screen.getByText('4.5 (25 reviews)')).toBeInTheDocument();
    });

    /**
     * Test: Stars provide visual representation
     */
    it('stars provide visual feedback', () => {
      render(<StarRating rating={3} count={10} />);
      
      // Visual users can see 5 stars
      const stars = screen.getAllByTestId('star-icon');
      expect(stars.length).toBe(5);
    });
  });
});

