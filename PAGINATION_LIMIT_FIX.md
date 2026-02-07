# GitHub Events API Pagination Limit Fix

## Problem

Users were encountering an error when fetching GitHub events:

```
Error fetching data for <username>: Failed to fetch events page 4: In order to keep the API fast for everyone, pagination is limited for this resource.
```

This error occurred because GitHub's Events API has a strict pagination limit (typically 3-4 pages max) to keep the API performant for all users. When attempting to fetch page 4 or beyond, the API returns a 422 status code with an error message about pagination being limited.

## Root Cause

The `fetchAllEvents` function in `src/hooks/useGitHubDataFetching.ts` was attempting to paginate through all available event pages without respecting GitHub's pagination limit. When it encountered the pagination limit, it would throw an error and fail the entire fetch operation.

## Solution

Implemented a two-part fix:

### 1. Proactive Limit (Prevention)

Added a `maxPages` constant set to 3 in the `fetchAllEvents` function to prevent requesting pages beyond GitHub's limit:

```typescript
const maxPages = 3; // GitHub Events API has pagination limits - stay within safe bounds

while (hasMorePages && page <= maxPages) {
  // ... fetching logic
}
```

This ensures we never request more than 3 pages, staying well within GitHub's documented limits.

### 2. Graceful Error Handling (Recovery)

Added specific error handling for the 422 status code with pagination limit message:

```typescript
if (!response.ok) {
  const responseJSON = await response.json();
  
  // Handle pagination limit error (422) - return what we have so far
  if (response.status === 422 && responseJSON.message?.includes('pagination is limited')) {
    console.warn(
      `GitHub Events API pagination limit reached for ${username} at page ${page}. Returning ${allEvents.length} events collected so far.`
    );
    hasMorePages = false;
    break; // Exit the pagination loop gracefully
  }
  
  throw new Error(`Failed to fetch events page ${page}: ${responseJSON.message}`);
}
```

This catches the pagination limit error if it does occur and gracefully returns the events collected up to that point, rather than failing the entire operation.

### 3. User Feedback

Added logging when the page limit is reached to inform users:

```typescript
if (page > maxPages) {
  console.warn(
    `Reached GitHub Events API pagination limit (${maxPages} pages) for ${username}. ` +
    `Returning ${allEvents.length} events. GitHub API limits pagination for the events endpoint.`
  );
}
```

## Files Modified

1. **`src/hooks/useGitHubDataFetching.ts`**
   - Added `maxPages = 3` limit to the `fetchAllEvents` function
   - Added graceful error handling for 422 pagination limit errors
   - Added warning logs when limits are reached

2. **`src/hooks/useGitHubDataFetching.test.ts`**
   - Added test case to verify pagination limit is respected

## Testing

- All existing tests continue to pass (594 tests)
- Added new test case to verify the pagination limit behavior
- Similar handling already exists in `src/utils/githubSearch.ts` and is tested there

## Impact

- Users will no longer see errors when fetching events for active GitHub users
- The application will successfully fetch up to 300 events (3 pages × 100 events per page)
- Users are informed via console warnings if the limit is reached
- The fix is backward compatible and doesn't change the API for existing code

## GitHub API Context

GitHub's Events API is documented to:
- Return only events from the last 90 days
- Return a maximum of 300 events per user
- Limit pagination to prevent abuse and maintain API performance

This fix respects these documented constraints while providing the best user experience possible.

