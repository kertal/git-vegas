# Filter Utils

This module provides utilities for filtering and counting GitHub items (issues and pull requests) based on various criteria.

## Functions

### `countItemsMatchingFilter`

Counts the number of GitHub items that match the specified filter criteria.

#### Parameters

- `items: GitHubItem[]` - Array of GitHub items to filter and count
- `filterType: FilterType` - The type of filter to apply ('type', 'status', 'label', 'repo')
- `filterValue: FilterValue` - The value to filter by (depends on filterType)
- `excludedLabels: string[]` - Array of label names to exclude from results

#### Returns

`number` - The count of items that match the filter criteria

#### Filter Types

##### Type Filter (`filterType: 'type'`)

Filters items by their type:
- `'all'` - Count all items (issues and pull requests)
- `'issue'` - Count only issues
- `'pr'` - Count only pull requests

##### Status Filter (`filterType: 'status'`)

Filters items by their status:
- `'all'` - Count all items regardless of status
- `'open'` - Count only open items
- `'closed'` - Count only closed items (excludes merged pull requests)
- `'merged'` - Count only merged pull requests

**Note**: For pull requests, the function differentiates between closed (not merged) and merged states. A pull request is considered merged if it has `pull_request.merged_at` set or `merged: true`.

##### Label Filter (`filterType: 'label'`)

Filters items by the presence of a specific label:
- `filterValue` should be the exact label name
- Items must have the specified label AND not have any labels in the `excludedLabels` array
- Returns 0 for non-existent labels

##### Repository Filter (`filterType: 'repo'`)

Filters items by repository:
- `filterValue` should be in the format `'owner/repo-name'`
- The function automatically transforms GitHub API repository URLs from `https://api.github.com/repos/owner/repo` format

#### Examples

```typescript
import { countItemsMatchingFilter } from './utils/filterUtils';

// Count all pull requests
const prCount = countItemsMatchingFilter(items, 'type', 'pr', []);

// Count open issues
const openCount = countItemsMatchingFilter(items, 'status', 'open', []);

// Count items with 'bug' label, excluding items with 'wontfix' label
const bugCount = countItemsMatchingFilter(items, 'label', 'bug', ['wontfix']);

// Count items from specific repository
const repoCount = countItemsMatchingFilter(items, 'repo', 'owner/repo-name', []);
```

#### Edge Cases

The function handles various edge cases gracefully:

- **Empty or invalid arrays**: Returns 0 for `null`, `undefined`, or empty arrays
- **Invalid filter types**: Returns 0 for unrecognized filter types
- **Missing labels**: Handles items with `undefined` or empty labels arrays
- **Missing repository URLs**: Handles items without repository information
- **Malformed data**: Gracefully handles missing or invalid properties

#### Type Definitions

```typescript
type FilterType = 'type' | 'status' | 'label' | 'repo';
type FilterValue = string;

interface FilterOptions {
  filterType: FilterType;
  filterValue: FilterValue;
  excludedLabels: string[];
}
```

## Testing

The module includes comprehensive unit tests covering:

- All filter types (type, status, label, repository)
- Edge cases and error handling
- Complex filtering scenarios
- Performance with various data sets

Run tests with:
```bash
npm test src/utils/filterUtils.test.ts
```

## Usage in Components

This utility is primarily used in the `ResultsList` component to:
- Show counts in filter buttons (e.g., "Issues (5)", "PRs (3)")
- Calculate filter statistics
- Provide real-time feedback on filter effectiveness

The function helps users understand how many items match different filter criteria before applying them, improving the user experience of the filtering interface. 