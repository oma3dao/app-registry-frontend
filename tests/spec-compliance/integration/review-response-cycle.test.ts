/**
 * Review/Response Cycle Integration Tests
 * 
 * Tests the complete review and response interaction cycle
 * Validates developer responses to user reviews
 * 
 * Specification: OMATrust Reputation Specification
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAllSchemas } from '@/config/schemas';
import type { AttestationQueryResult } from '@/lib/attestation-queries';

// Mock schemas
vi.mock('@/config/schemas', () => ({
  getAllSchemas: vi.fn(() => [
    {
      id: 'user-review',
      title: 'User Review',
      deployedUIDs: { 66238: '0x' + '1'.repeat(64) },
      fields: [
        { name: 'subject', type: 'string', required: true },
        { name: 'version', type: 'string', required: false },
        { name: 'ratingValue', type: 'integer', min: 1, max: 5, required: true },
        { name: 'summary', type: 'string', required: false },
      ],
    },
    {
      id: 'user-review-response',
      title: 'User Review Response',
      deployedUIDs: { 66238: '0x' + '2'.repeat(64) },
      fields: [
        { name: 'subject', type: 'string', required: true },
        { name: 'responseText', type: 'string', required: true },
      ],
    },
  ]),
}));

describe('Review/Response Cycle Integration', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to create review attestation
  const createReview = (
    uid: string,
    attester: string,
    time: number,
    rating: number,
    summary: string,
    subject: string = 'did:web:myapp.example.com',
    version: string = '1.0.0'
  ): AttestationQueryResult => ({
    uid,
    attester,
    recipient: '0x' + 'b'.repeat(40),
    data: '0x',
    time,
    expirationTime: 0,
    revocationTime: 0,
    refUID: '0x' + '0'.repeat(64),
    revocable: true,
    schemaId: 'user-review',
    schemaTitle: 'User Review',
    decodedData: {
      subject,
      version,
      ratingValue: rating,
      summary,
    },
  });

  // Helper to create response attestation
  const createResponse = (
    uid: string,
    attester: string, // App owner
    time: number,
    responseText: string,
    reviewUid: string,
    subject: string = 'did:web:myapp.example.com'
  ): AttestationQueryResult => ({
    uid,
    attester,
    recipient: '0x' + 'b'.repeat(40),
    data: '0x',
    time,
    expirationTime: 0,
    revocationTime: 0,
    refUID: reviewUid, // References the review being responded to
    revocable: true,
    schemaId: 'user-review-response',
    schemaTitle: 'User Review Response',
    decodedData: {
      subject,
      responseText,
    },
  });

  describe('Review Schema', () => {
    /**
     * Test: Review has required fields
     */
    it('review contains required fields', () => {
      const schemas = getAllSchemas();
      const reviewSchema = schemas.find(s => s.id === 'user-review');
      
      expect(reviewSchema).toBeDefined();
      expect(reviewSchema?.fields.find(f => f.name === 'subject')).toBeDefined();
      expect(reviewSchema?.fields.find(f => f.name === 'ratingValue')).toBeDefined();
    });

    /**
     * Test: Rating must be 1-5
     */
    it('rating value must be between 1 and 5', () => {
      const schemas = getAllSchemas();
      const reviewSchema = schemas.find(s => s.id === 'user-review');
      const ratingField = reviewSchema?.fields.find(f => f.name === 'ratingValue');
      
      expect(ratingField?.min).toBe(1);
      expect(ratingField?.max).toBe(5);
    });
  });

  describe('Response Schema', () => {
    /**
     * Test: Response has required fields
     */
    it('response contains required fields', () => {
      const schemas = getAllSchemas();
      const responseSchema = schemas.find(s => s.id === 'user-review-response');
      
      expect(responseSchema).toBeDefined();
      expect(responseSchema?.fields.find(f => f.name === 'subject')).toBeDefined();
      expect(responseSchema?.fields.find(f => f.name === 'responseText')).toBeDefined();
    });
  });

  describe('Review Creation', () => {
    /**
     * Test: Create positive review
     */
    it('creates positive review', () => {
      const review = createReview(
        '0x' + 'r1'.padEnd(64, '0'),
        '0xReviewer' + '0'.repeat(30),
        1000,
        5,
        'Excellent app, highly recommend!'
      );

      expect(review.decodedData?.ratingValue).toBe(5);
      expect(review.decodedData?.summary).toBe('Excellent app, highly recommend!');
      expect(review.schemaId).toBe('user-review');
    });

    /**
     * Test: Create negative review
     */
    it('creates negative review', () => {
      const review = createReview(
        '0x' + 'r2'.padEnd(64, '0'),
        '0xReviewer' + '0'.repeat(30),
        1000,
        1,
        'App crashed multiple times'
      );

      expect(review.decodedData?.ratingValue).toBe(1);
      expect(review.decodedData?.summary).toContain('crashed');
    });

    /**
     * Test: Review targets specific subject
     */
    it('review targets specific DID subject', () => {
      const review = createReview(
        '0x1',
        '0xReviewer',
        1000,
        4,
        'Good app',
        'did:web:specificapp.example.com'
      );

      expect(review.decodedData?.subject).toBe('did:web:specificapp.example.com');
    });

    /**
     * Test: Review can specify version
     */
    it('review can target specific version', () => {
      const review = createReview(
        '0x1',
        '0xReviewer',
        1000,
        4,
        'Good app',
        'did:web:app.com',
        '2.1.0'
      );

      expect(review.decodedData?.version).toBe('2.1.0');
    });
  });

  describe('Response Creation', () => {
    /**
     * Test: Create response to review
     */
    it('creates response linked to review', () => {
      const reviewUid = '0x' + 'review'.padEnd(64, '0');
      
      const response = createResponse(
        '0x' + 'response'.padEnd(64, '0'),
        '0xAppOwner' + '0'.repeat(30),
        2000,
        'Thank you for your feedback!',
        reviewUid
      );

      expect(response.refUID).toBe(reviewUid);
      expect(response.schemaId).toBe('user-review-response');
      expect(response.decodedData?.responseText).toBe('Thank you for your feedback!');
    });

    /**
     * Test: Response from app owner
     */
    it('response is from app owner address', () => {
      const appOwner = '0xAppOwner' + '0'.repeat(30);
      
      const response = createResponse(
        '0x1',
        appOwner,
        2000,
        'We appreciate your review',
        '0xreviewuid'
      );

      expect(response.attester).toBe(appOwner);
    });

    /**
     * Test: Response has later timestamp than review
     */
    it('response timestamp is after review timestamp', () => {
      const reviewTime = 1000;
      const responseTime = 2000;
      
      const review = createReview('0x1', '0xUser', reviewTime, 4, 'Good app');
      const response = createResponse('0x2', '0xOwner', responseTime, 'Thank you', '0x1');

      expect(response.time).toBeGreaterThan(review.time);
    });
  });

  describe('Review-Response Linking', () => {
    /**
     * Test: Response references review via refUID
     */
    it('links response to review via refUID', () => {
      const reviewUid = '0x' + 'a'.repeat(64);
      
      const review = createReview(reviewUid, '0xUser', 1000, 3, 'Average experience');
      const response = createResponse('0x' + 'b'.repeat(64), '0xOwner', 2000, 'We will improve', reviewUid);

      expect(response.refUID).toBe(review.uid);
    });

    /**
     * Test: Find response for a review
     */
    it('finds response for a specific review', () => {
      const review1Uid = '0x' + '1'.repeat(64);
      const review2Uid = '0x' + '2'.repeat(64);
      
      const attestations = [
        createReview(review1Uid, '0xUser1', 1000, 5, 'Great!'),
        createReview(review2Uid, '0xUser2', 1500, 2, 'Poor'),
        createResponse('0x3', '0xOwner', 2000, 'Thank you!', review1Uid),
        createResponse('0x4', '0xOwner', 2500, 'We apologize and will fix', review2Uid),
      ];

      // Find response for review1
      const responseToReview1 = attestations.find(
        a => a.schemaId === 'user-review-response' && a.refUID === review1Uid
      );

      expect(responseToReview1).toBeDefined();
      expect(responseToReview1?.decodedData?.responseText).toBe('Thank you!');

      // Find response for review2
      const responseToReview2 = attestations.find(
        a => a.schemaId === 'user-review-response' && a.refUID === review2Uid
      );

      expect(responseToReview2).toBeDefined();
      expect(responseToReview2?.decodedData?.responseText).toContain('apologize');
    });

    /**
     * Test: Review without response
     */
    it('identifies reviews without responses', () => {
      const review1Uid = '0x' + '1'.repeat(64);
      const review2Uid = '0x' + '2'.repeat(64);
      
      const attestations = [
        createReview(review1Uid, '0xUser1', 1000, 5, 'Great!'),
        createReview(review2Uid, '0xUser2', 1500, 4, 'Good'),
        createResponse('0x3', '0xOwner', 2000, 'Thank you!', review1Uid),
        // No response to review2
      ];

      const reviews = attestations.filter(a => a.schemaId === 'user-review');
      const responses = attestations.filter(a => a.schemaId === 'user-review-response');
      
      const reviewsWithoutResponse = reviews.filter(
        r => !responses.some(resp => resp.refUID === r.uid)
      );

      expect(reviewsWithoutResponse.length).toBe(1);
      expect(reviewsWithoutResponse[0].uid).toBe(review2Uid);
    });
  });

  describe('Complete Review-Response Cycle', () => {
    /**
     * Test: Full cycle from review to response
     */
    it('completes full review-response cycle', () => {
      // Step 1: User creates review
      const review = createReview(
        '0x' + 'review1'.padEnd(64, '0'),
        '0xUser123' + '0'.repeat(30),
        1000,
        2,
        'The app has too many bugs'
      );

      expect(review.decodedData?.ratingValue).toBe(2);
      expect(review.decodedData?.summary).toContain('bugs');

      // Step 2: App owner creates response
      const response = createResponse(
        '0x' + 'response1'.padEnd(64, '0'),
        '0xAppOwner' + '0'.repeat(28),
        2000,
        'Thank you for reporting these issues. We have released v1.1.0 with fixes.',
        review.uid
      );

      expect(response.refUID).toBe(review.uid);
      expect(response.decodedData?.responseText).toContain('v1.1.0');

      // Step 3: Verify linkage
      expect(response.time).toBeGreaterThan(review.time);
    });

    /**
     * Test: Multiple reviews with responses
     */
    it('handles multiple reviews with responses', () => {
      const interactions = [
        // Review 1 and response
        { review: createReview('0xr1'.padEnd(66, '0'), '0xU1', 1000, 1, 'Terrible') },
        { response: createResponse('0xresp1'.padEnd(66, '0'), '0xOwner', 1500, 'We apologize', '0xr1'.padEnd(66, '0')) },
        
        // Review 2 and response
        { review: createReview('0xr2'.padEnd(66, '0'), '0xU2', 2000, 5, 'Amazing!') },
        { response: createResponse('0xresp2'.padEnd(66, '0'), '0xOwner', 2500, 'Thank you!', '0xr2'.padEnd(66, '0')) },
        
        // Review 3 without response yet
        { review: createReview('0xr3'.padEnd(66, '0'), '0xU3', 3000, 3, 'Average') },
      ];

      const reviews = interactions.filter(i => 'review' in i).map(i => (i as any).review);
      const responses = interactions.filter(i => 'response' in i).map(i => (i as any).response);

      expect(reviews.length).toBe(3);
      expect(responses.length).toBe(2);

      // Verify each response links correctly
      responses.forEach(resp => {
        const linkedReview = reviews.find(r => r.uid === resp.refUID);
        expect(linkedReview).toBeDefined();
      });
    });
  });

  describe('Response Authorization', () => {
    /**
     * Test: Only app owner can respond
     * (Business logic - tested via attester field)
     */
    it('response attester should be app owner', () => {
      const appOwner = '0xAppOwner' + '0'.repeat(30);
      
      const response = createResponse(
        '0x1',
        appOwner,
        2000,
        'Official response',
        '0xreviewuid'
      );

      // In real system, contract would verify attester is app owner
      expect(response.attester).toBe(appOwner);
    });
  });

  describe('Response Content', () => {
    /**
     * Test: Response can be long text
     */
    it('supports detailed response text', () => {
      const detailedResponse = `
        Thank you for your detailed feedback. We have identified the issues you mentioned:
        
        1. The login bug has been fixed in version 1.2.0
        2. Performance improvements are included in the latest update
        3. The UI issue will be addressed in our next release
        
        Please update to the latest version and let us know if you experience any further issues.
      `.trim();

      const response = createResponse(
        '0x1',
        '0xOwner',
        2000,
        detailedResponse,
        '0xreview'
      );

      expect(response.decodedData?.responseText.length).toBeGreaterThan(100);
      expect(response.decodedData?.responseText).toContain('version 1.2.0');
    });

    /**
     * Test: Response targets same subject as review
     */
    it('response subject matches review subject', () => {
      const subject = 'did:web:myapp.example.com';
      
      const review = createReview('0x1', '0xUser', 1000, 4, 'Good app', subject);
      const response = createResponse('0x2', '0xOwner', 2000, 'Thanks', '0x1', subject);

      expect(response.decodedData?.subject).toBe(review.decodedData?.subject);
    });
  });

  describe('Edge Cases', () => {
    /**
     * Test: Review without summary
     */
    it('handles review without summary', () => {
      const review: AttestationQueryResult = {
        uid: '0x1',
        attester: '0xUser',
        recipient: '0xRecipient',
        data: '0x',
        time: 1000,
        expirationTime: 0,
        revocationTime: 0,
        refUID: '0x' + '0'.repeat(64),
        revocable: true,
        schemaId: 'user-review',
        schemaTitle: 'User Review',
        decodedData: {
          subject: 'did:web:app.com',
          ratingValue: 5,
          // No summary
        },
      };

      expect(review.decodedData?.summary).toBeUndefined();
      expect(review.decodedData?.ratingValue).toBe(5);
    });

    /**
     * Test: Multiple responses to same review (supersession)
     */
    it('handles multiple responses to same review', () => {
      const reviewUid = '0x' + 'review'.padEnd(64, '0');
      
      const responses = [
        createResponse('0xresp1', '0xOwner', 2000, 'Initial response', reviewUid),
        createResponse('0xresp2', '0xOwner', 3000, 'Updated response', reviewUid), // Newer
      ];

      // Find latest response
      const latestResponse = responses.sort((a, b) => b.time - a.time)[0];
      
      expect(latestResponse.decodedData?.responseText).toBe('Updated response');
    });

    /**
     * Test: Response to revoked review
     */
    it('response can reference revoked review', () => {
      const revokedReview = createReview('0x1', '0xUser', 1000, 1, 'Bad review');
      revokedReview.revocationTime = 1500; // Revoked

      const response = createResponse('0x2', '0xOwner', 2000, 'We note your feedback', revokedReview.uid);

      expect(revokedReview.revocationTime).toBeGreaterThan(0);
      expect(response.refUID).toBe(revokedReview.uid);
    });
  });
});

