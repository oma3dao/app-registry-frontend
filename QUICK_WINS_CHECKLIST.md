# Quick Wins Checklist for Test Coverage

**Goal:** Add high-impact tests with minimal effort to boost coverage quickly

## 🎯 Prioritized Test Cases (Sorted by Effort/Impact Ratio)

### 1. ⚡ Navigation Branches (30 min, +0.4% coverage)
**File:** `tests/navigation-branches.test.tsx`

```typescript
// Add these 4 test cases:

it('renders inactive link with text-foreground class', () => {
  // Test isActive: false branch (line 55)
  // Expected class: text-foreground
});

it('renders internal link without target attribute', () => {
  // Test isExternal: false branch (line 59)
  // Should not have target="_blank"
});

it('renders active internal link correctly', () => {
  // Test isActive: true, isExternal: false
  // Class: text-primary, no target attribute
});

it('renders inactive external link correctly', () => {
  // Test isActive: false, isExternal: true
  // Class: text-foreground, has target="_blank"
});
```

---

### 2. ⚡ Utils.ts Branches (1 hour, +0.3% coverage)
**File:** `tests/utils-branches.test.ts`

```typescript
// Already mostly covered, add edge cases:

it('handles normalizeAndValidateVersion with empty parts', () => {
  // Test version like "1."
  expect(() => normalizeAndValidateVersion('1.')).toThrow();
});

it('handles buildVersionedDID with null/undefined', () => {
  expect(() => buildVersionedDID(null as any, '1.0')).toThrow();
});
```

---

### 3. ⚡ Data Model Validators (2 hours, +0.3% coverage)
**File:** `tests/schema-data-model-validators.test.ts` (NEW)

```typescript
import { describe, it, expect } from 'vitest';
import { 
  NFTSchema, 
  AppRegistrationFormSchema,
  VersionSchema,
  TraitSchema,
  InterfaceFlagsSchema
} from '@/schema/data-model';

describe('Schema Validators', () => {
  // Test each schema's parse() method
  it('NFTSchema validates valid NFT data', () => {
    const validNFT = {
      did: 'did:web:example.com',
      name: 'Test App',
      version: '1.0.0',
      // ... all required fields
    };
    expect(() => NFTSchema.parse(validNFT)).not.toThrow();
  });

  it('NFTSchema rejects invalid DID', () => {
    const invalidNFT = { did: 'not-a-did', name: 'Test' };
    expect(() => NFTSchema.parse(invalidNFT)).toThrow();
  });

  // Repeat for other schemas...
});
```

---

### 4. ⚡ NFT View Modal Error Paths (2 hours, +0.5% coverage)
**File:** `tests/nft-view-modal-error-paths.test.tsx` (NEW)

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import NFTViewModal from '@/components/nft-view-modal';

// Test missing callback props
it('handles missing onEditMetadata callback', () => {
  render(<NFTViewModal 
    isOpen={true}
    nft={mockNFT}
    handleCloseViewModal={vi.fn()}
    onUpdateStatus={vi.fn()}
    // onEditMetadata is undefined
  />);
  
  const editButton = screen.getByText('Edit Metadata');
  fireEvent.click(editButton);
  
  // Should handle gracefully without crashing
});

// Test invalid status in attestation check
it('handles invalid NFT status in attestation', async () => {
  const invalidStatusNFT = {
    ...mockNFT,
    status: 999 // Invalid status
  };
  
  render(<NFTViewModal isOpen={true} nft={invalidStatusNFT} {...mockProps} />);
  
  await waitFor(() => {
    // Should handle invalid status gracefully
    expect(screen.queryByText('Error')).not.toBeInTheDocument();
  });
});
```

---

### 5. ⚡ Dashboard Owner Verification (3 hours, +0.6% coverage)
**File:** `tests/dashboard-owner-verification.test.tsx` (NEW)

```typescript
// Test non-owner update rejection
it('prevents non-owner from updating app', async () => {
  const ownerAddress = '0xowner...';
  const nonOwnerAddress = '0xnotowner...';
  
  const mockNFT = {
    did: 'did:web:example.com',
    minter: ownerAddress,
    // ... other fields
  };
  
  // Mock connected as non-owner
  vi.mocked(useActiveAccount).mockReturnValue({
    address: nonOwnerAddress,
  });
  
  render(<Dashboard />);
  
  // Try to update the app
  // Should show error toast
  // Should NOT call updateApp
});

// Test owner can update
it('allows owner to update app', async () => {
  const ownerAddress = '0xowner...';
  
  const mockNFT = {
    did: 'did:web:example.com',
    minter: ownerAddress,
  };
  
  vi.mocked(useActiveAccount).mockReturnValue({
    address: ownerAddress,
  });
  
  render(<Dashboard />);
  
  // Update should succeed
  // updateApp should be called
});
```

---

## 📋 Implementation Order

### Day 1: Quick Wins (4-5 hours)
- [ ] Navigation branches (30 min)
- [ ] Utils edge cases (1 hour)
- [ ] Data model validators (2 hours)
- [ ] NFT view modal errors (2 hours)

**Expected Gain:** +1.5% coverage → 98.5% total

### Day 2: Medium Effort (3-4 hours)
- [ ] Dashboard owner verification (3 hours)
- [ ] Verify-and-attest resolver errors (2 hours)

**Expected Gain:** +1.0% coverage → 99.5% total

### Day 3: Final Polish (2-3 hours)
- [ ] localStorage error handling (1 hour)
- [ ] Remaining modal edge cases (1 hour)
- [ ] Documentation updates (1 hour)

**Expected Gain:** +0.5% coverage → 100% total

---

## 🛠️ Tools & Commands

### Run specific test file
```bash
npm test -- navigation-branches --run
```

### Generate coverage for specific file
```bash
npm test -- navigation-branches --run --coverage
```

### Watch mode for development
```bash
npm test -- navigation-branches
```

### Coverage report with HTML
```bash
npm run test:coverage
open coverage/index.html
```

---

## 💡 Pro Tips

### 1. Use Coverage Report to Guide Testing
```bash
# Generate coverage
npm run test:coverage

# Open HTML report
open coverage/lcov-report/index.html

# Click on file to see line-by-line coverage
# Red lines = uncovered
# Yellow lines = partially covered branches
```

### 2. Focus on Red Lines First
- Red (uncovered) lines have highest impact
- Yellow (partial) lines are quick wins
- Green lines already covered

### 3. Copy Existing Test Patterns
- Look at similar tests in the codebase
- Reuse mock setups
- Follow established patterns

### 4. Test One Thing at a Time
- One test file at a time
- One component at a time
- One function at a time
- Prevents overwhelm and bugs

### 5. Run Tests Frequently
```bash
# After each test addition:
npm test -- your-test-file --run

# Check coverage change:
npm run test:coverage | grep "All files"
```

---

## 🎯 Success Criteria

### After Day 1
- [ ] 98.5%+ statement coverage
- [ ] All quick win tests passing
- [ ] No new failing tests

### After Day 2
- [ ] 99.5%+ statement coverage
- [ ] Owner verification tested
- [ ] Resolver errors covered

### After Day 3
- [ ] 100% statement coverage (or close)
- [ ] All error paths tested
- [ ] Documentation updated

---

## ⚠️ Watch Out For

### Common Pitfalls
1. **Forgetting to mock dependencies**
   - Always mock external APIs
   - Mock thirdweb hooks
   - Mock localStorage

2. **Not using act() for state updates**
   ```typescript
   // BAD
   fireEvent.click(button);
   expect(state).toBe(newValue);
   
   // GOOD
   await act(async () => {
     fireEvent.click(button);
   });
   await waitFor(() => {
     expect(state).toBe(newValue);
   });
   ```

3. **Testing implementation instead of behavior**
   - Test what the user sees
   - Test user interactions
   - Don't test internal state directly

4. **Flaky tests due to timing**
   - Use waitFor() for async operations
   - Don't use setTimeout in tests
   - Mock timers when needed

---

## 📚 Quick Reference

### Most Common Test Patterns

```typescript
// Pattern 1: Component rendering
it('renders component', () => {
  render(<MyComponent />);
  expect(screen.getByText('Hello')).toBeInTheDocument();
});

// Pattern 2: User interaction
it('handles click', async () => {
  const handleClick = vi.fn();
  render(<Button onClick={handleClick} />);
  
  await userEvent.click(screen.getByRole('button'));
  
  expect(handleClick).toHaveBeenCalled();
});

// Pattern 3: Async operation
it('loads data', async () => {
  render(<DataComponent />);
  
  await waitFor(() => {
    expect(screen.getByText('Data loaded')).toBeInTheDocument();
  });
});

// Pattern 4: Error handling
it('handles error', async () => {
  mockFetch.mockRejectedValue(new Error('Failed'));
  
  render(<Component />);
  
  await waitFor(() => {
    expect(screen.getByText('Error occurred')).toBeInTheDocument();
  });
});

// Pattern 5: Conditional rendering
it('shows/hides based on prop', () => {
  const { rerender } = render(<Component show={true} />);
  expect(screen.getByText('Content')).toBeInTheDocument();
  
  rerender(<Component show={false} />);
  expect(screen.queryByText('Content')).not.toBeInTheDocument();
});
```

---

## 🚀 Get Started Now

```bash
# 1. Create your first test file
touch tests/navigation-branches-extended.test.tsx

# 2. Copy a similar test as template
# Look at existing navigation-branches.test.tsx

# 3. Run in watch mode
npm test -- navigation-branches-extended

# 4. Write one test at a time
# 5. See it pass
# 6. Check coverage increase
npm run test:coverage | grep navigation
```

**You've got this!** Start with navigation branches - it's the quickest win. 🎯

