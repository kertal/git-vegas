# GitHub API Format Change - Pull Request Events

## Problem

Users were experiencing undefined title errors when viewing pull request events. Investigation revealed that GitHub has changed the format of `PullRequestEvent` payloads in their Events API.

### Old Format (Previously)
The `pull_request` object in the payload contained full PR details:
```json
{
  "type": "PullRequestEvent",
  "payload": {
    "pull_request": {
      "id": 123,
      "number": 456,
      "title": "Fix bug in parser",
      "html_url": "https://github.com/org/repo/pull/456",
      "state": "open",
      "body": "This PR fixes...",
      "labels": [...],
      "updated_at": "2023-01-01T00:00:00Z",
      "closed_at": null,
      "merged_at": null,
      "merged": false
    }
  }
}
```

### New Format (Current)
The `pull_request` object now only contains minimal information:
```json
{
  "type": "PullRequestEvent",
  "payload": {
    "action": "labeled",
    "number": 241173,
    "pull_request": {
      "url": "https://api.github.com/repos/org/repo/pulls/241173",
      "id": 2959929265,
      "number": 241173,
      "head": { "ref": "feature-branch", "sha": "...", "repo": {...} },
      "base": { "ref": "main", "sha": "...", "repo": {...} }
    },
    "labels": [...]
  }
}
```

**Key Differences:**
- ❌ No `title` field in `pull_request`
- ❌ No `state` field in `pull_request`
- ❌ No `body` field in `pull_request`
- ❌ No `html_url` field in `pull_request`
- ❌ No `updated_at` field in `pull_request`
- ❌ No `closed_at` field in `pull_request`
- ❌ No `merged_at` field in `pull_request`
- ❌ No `merged` field in `pull_request`
- ✅ `action` field moved to payload level
- ✅ `labels` array moved to payload level
- ✅ Only basic PR metadata (url, id, number, head, base) in `pull_request`

## Solution

Updated the `transformEventToItem` function in `src/utils/rawDataUtils.ts` to handle both old and new API formats gracefully by:

1. **Constructing missing fields from available data**
2. **Using fallback values when data is unavailable**
3. **Creating descriptive titles based on the action**

### Changes Made

#### 1. PullRequestEvent Handler
```typescript
} else if (type === 'PullRequestEvent' && payload.pull_request) {
  const pr = payload.pull_request;
  const payloadWithAction = payload as { action?: string; number?: number; labels?: any[] };
  
  // GitHub API changed format - pr object no longer contains full details
  // Construct what we can from available data
  const prNumber = pr.number || payloadWithAction.number;
  const htmlUrl = pr.html_url || `https://github.com/${repo.name}/pull/${prNumber}`;
  const action = payloadWithAction.action || 'updated';
  
  // Create a descriptive title based on the action since title is not provided
  const title = pr.title || `Pull Request #${prNumber} ${action}`;
  
  return {
    id: pr.id,
    event_id: event.id,
    html_url: htmlUrl,
    title: title,
    created_at: event.created_at,
    updated_at: pr.updated_at || event.created_at,
    state: pr.state || 'open',
    body: pr.body || `Pull request ${action} by ${actorUser.login}`,
    labels: payloadWithAction.labels || pr.labels || [],
    // ... rest of fields
  };
}
```

**Key Improvements:**
- Uses `pr.title` if available, falls back to `"Pull Request #123 labeled"`
- Constructs `html_url` from repo name and PR number if not provided
- Gets labels from payload level if not in `pull_request` object
- Provides sensible defaults for missing fields

#### 2. PullRequestReviewEvent Handler
Similar updates to handle the new format for review events.

#### 3. PullRequestReviewCommentEvent Handler
Similar updates to handle the new format for review comment events.

## Testing

Added comprehensive test to verify the new format is handled correctly:

```typescript
it('should handle new GitHub API format for PullRequestEvent (without full PR details)', () => {
  const mockPREvent: GitHubEvent = {
    // ... new format event
  };

  const result = transformEventToItem(mockPREvent);

  expect(result?.title).toBe('Pull Request #241173 labeled');
  expect(result?.html_url).toBe('https://github.com/elastic/kibana/pull/241173');
  expect(result?.labels).toEqual(mockPREvent.payload.labels);
});
```

## Files Modified

1. **`src/utils/rawDataUtils.ts`**
   - Updated `transformEventToItem()` for `PullRequestEvent`
   - Updated `transformEventToItem()` for `PullRequestReviewEvent`
   - Updated `transformEventToItem()` for `PullRequestReviewCommentEvent`
   - Added fallback logic for missing fields
   - Added comments explaining the API format change

2. **`src/utils/__tests__/rawDataUtils.test.ts`**
   - Added test for new GitHub API format
   - Verifies correct handling of minimal PR data

## Test Results

✅ **All 595 tests passing** (added 1 new test)  
✅ **No linter errors**  
✅ **Backward compatible** - handles both old and new formats  
✅ **Graceful degradation** - provides sensible defaults when data is missing

## Impact

### Before Fix
- ❌ Runtime errors: `Cannot read properties of undefined (reading 'startsWith')`
- ❌ Items without titles filtered out
- ❌ Pull request events not displayed

### After Fix
- ✅ No runtime errors
- ✅ Pull request events display with generated titles
- ✅ All available information preserved
- ✅ Backward compatible with old API format

## Example Output

For a PR event with action "labeled":
- **Title:** `Pull Request #241173 labeled`
- **HTML URL:** `https://github.com/elastic/kibana/pull/241173`
- **Labels:** From payload level
- **Body:** `Pull request labeled by username`

## Future Considerations

GitHub may continue to evolve their API format. This fix establishes a pattern for:
1. **Graceful degradation** - Use what's available, construct what's missing
2. **Fallback values** - Provide sensible defaults
3. **Backward compatibility** - Support both old and new formats

If GitHub adds more event types or changes other event formats, follow this same pattern:
- Check for fields at multiple levels (payload and nested objects)
- Provide constructive fallbacks
- Add comprehensive tests
- Document the changes

## Related Issues

This fix addresses:
1. Undefined title property errors
2. Missing labels on PR events
3. Incomplete PR information display
4. GitHub API evolution compatibility

## References

- GitHub Events API: https://docs.github.com/en/rest/activity/events
- Pull Request Events: https://docs.github.com/en/webhooks/webhook-events-and-payloads#pull_request

