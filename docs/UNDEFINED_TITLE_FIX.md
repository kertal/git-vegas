# Undefined Title Property Fix

## Problem

Users were encountering a runtime error in the Summary view:

```
Uncaught TypeError: Cannot read properties of undefined (reading 'startsWith')
    at Summary.tsx:330:43
    at Array.forEach (<anonymous>)
    at Summary.tsx:323:24
    at Array.map (<anonymous>)
    at SummaryView2 (Summary.tsx:319:40)
```

This error occurred when the code tried to call `item.title.startsWith()` on an item where the `title` property was `undefined`.

## Root Cause

While the `GitHubItem` interface defines `title` as a required field, there were two issues:

1. **No validation at runtime**: Items from the GitHub Search API were stored without validating that required fields like `title` were present
2. **No defensive checks**: The Summary view accessed `item.title` without checking if it exists first

## Solution

Implemented a two-part fix:

### 1. Defensive Check in Summary View

Added a null check before accessing `item.title` in `src/views/Summary.tsx`:

```typescript
// Before (line 330)
const isReview = item.title.startsWith('Review on:') || item.originalEventType === 'PullRequestReviewEvent';

// After
const isReview = (item.title && item.title.startsWith('Review on:')) || item.originalEventType === 'PullRequestReviewEvent';
```

This ensures the code gracefully handles items without a title property.

### 2. Validation in Data Processing

Added validation to filter out items without required fields in `src/utils/rawDataUtils.ts`:

```typescript
const dateFilteredItems = rawItems.filter(item => {
  // Validate required fields - skip items with missing title
  if (!item.title) {
    console.warn('Skipping item with missing title:', item.html_url || item.id);
    return false;
  }
  
  // ... rest of filtering logic
});
```

This prevents items with missing titles from being processed and displayed in the first place.

## Files Modified

1. **`src/views/Summary.tsx`**
   - Added null check for `item.title` before calling `.startsWith()`
   - Prevents runtime errors when accessing title property

2. **`src/utils/rawDataUtils.ts`**
   - Added validation in `categorizeRawSearchItems()` function
   - Filters out items without a `title` property
   - Logs a warning when such items are encountered for debugging

## Testing

- All existing tests continue to pass (594 tests)
- No linter errors introduced
- The fix is defensive and backward compatible

## Impact

- Users will no longer see runtime errors when viewing the Summary
- Items with corrupted/missing data will be filtered out with a warning
- The application handles edge cases more gracefully
- Improved data quality validation throughout the app

## Why This Might Happen

While GitHub's API should always return a `title` for issues and PRs, this situation can occur due to:

1. **API response inconsistencies**: Rare API glitches or network issues
2. **Cached data corruption**: localStorage/IndexedDB data from previous versions
3. **Data migration issues**: Changes to the API response format over time
4. **Edge cases**: Deleted issues/PRs that were previously cached

The fix ensures the application remains resilient to these edge cases.

