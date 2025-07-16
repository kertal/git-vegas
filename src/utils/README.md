# Utils Documentation

This directory contains utility modules that provide reusable functions for the GitHub GitVegas application. Each module has comprehensive unit tests and is designed to be modular and maintainable.

## Modules Overview

### 1. [filterUtils.ts](./filterUtils.ts) - GitHub Items Filtering

Provides utilities for filtering and counting GitHub items (issues and pull requests) based on various criteria.

#### Main Functions:
- `countItemsMatchingFilter()` - Counts items matching specific filter criteria
- Filter Types: 'type', 'status', 'label', 'repo'

#### Usage:
```typescript
import { countItemsMatchingFilter } from './utils/filterUtils';

// Count pull requests
const prCount = countItemsMatchingFilter(items, 'type', 'pr', []);

// Count open issues
const openCount = countItemsMatchingFilter(items, 'status', 'open', []);
```

**Tests:** 31 test cases covering all filter types and edge cases  
**Lines of Code:** ~113 lines

---

### 2. [usernameCache.ts](./usernameCache.ts) - Username Validation Cache

Provides functions for managing cached validation state of GitHub usernames to avoid repeated API calls.

#### Main Functions:
- `createAddToCache()` - Creates function to add usernames to cache
- `createRemoveFromCache()` - Creates function to remove usernames from cache
- `categorizeUsernames()` - Categorizes usernames by validation status
- `needsValidation()` - Checks if usernames need validation
- `getInvalidUsernames()` - Gets usernames known to be invalid

#### Usage:
```typescript
import { createAddToCache, categorizeUsernames } from './utils/usernameCache';

const addToValidated = createAddToCache(setValidatedUsernames);
const { needValidation, alreadyValid, alreadyInvalid } = categorizeUsernames(
  usernames, validatedCache, invalidCache
);
```

**Tests:** 21 test cases covering all functions and edge cases  
**Lines of Code:** ~95 lines

---

### 3. [resultsUtils.ts](./resultsUtils.ts) - Results Filtering & Manipulation

Provides comprehensive functions for filtering, sorting, and manipulating GitHub items results.

#### Main Functions:
- `extractAvailableLabels()` - Extracts unique labels from items
- `filterByType()` - Filters by issue/PR type
- `filterByStatus()` - Filters by open/closed/merged status
- `filterByLabels()` - Filters by inclusive/exclusive labels
- `filterByRepository()` - Filters by repository
- `filterByText()` - Filters by text search
- `sortItems()` - Sorts by date (created/updated)
- `applyFiltersAndSort()` - Applies all filters and sorting
- `hasActiveFilters()` - Checks if any filters are active
- `getFilterSummary()` - Generates human-readable filter summary

#### Usage:
```typescript
import { applyFiltersAndSort, createDefaultFilter } from './utils/resultsUtils';

const filters = {
  filter: 'pr',
  statusFilter: 'open',
  labelFilter: 'bug',
  excludedLabels: ['wontfix'],
  // ... other filters
};

const filteredResults = applyFiltersAndSort(items, filters);
```

**Tests:** 52 test cases covering all functions and complex scenarios  
**Lines of Code:** ~280 lines

---

### 4. [clipboard.ts](./clipboard.ts) - Clipboard Operations

Handles copying GitHub items to clipboard in both plain text and HTML formats with rich styling.

#### Main Functions:
- `copyResultsToClipboard()` - Main clipboard function with fallback support
- `formatDateForClipboard()` - Formats dates for display
- `generatePlainTextFormat()` - Creates plain text output
- `generateHtmlFormat()` - Creates styled HTML output

#### Features:
- Compact vs detailed formatting modes
- Rich HTML with status color coding
- Label styling with background colors
- ClipboardItem API with fallback support

**Tests:** 18 test cases covering all formats and error scenarios  
**Lines of Code:** ~170 lines

---

### 5. [githubSearch.ts](./githubSearch.ts) - GitHub API Search Operations

Provides comprehensive GitHub search functionality with validation, caching, error handling, and progress tracking.

#### Main Functions:
- `validateSearchParams()` - Validates search parameters (dates, usernames)
- `validateAndCacheUsernames()` - Validates usernames with cache management
- `fetchUserItems()` - Fetches GitHub items for a single user
- `performGitHubSearch()` - Main search function with full orchestration
- `isCacheValid()` - Checks if cached results are still valid
- `createSearchCacheParams()` - Creates cache parameters with timestamp

#### Interfaces:
- `GitHubSearchParams` - Search parameter configuration
- `UsernameCache` - Username validation cache state
- `GitHubSearchResult` - Search result with metadata
- `CacheCallbacks` - Cache update callbacks
- `GitHubSearchOptions` - Search options configuration

#### Features:
- **Input Validation:** Comprehensive parameter and date validation
- **Username Validation:** Integrates with GitHub API for username verification
- **Caching:** Smart caching with configurable expiry times
- **Progress Tracking:** Real-time progress updates via callbacks
- **Error Handling:** Detailed error messages with context
- **Rate Limiting:** Configurable delays between API requests
- **URL Management:** Optional URL parameter updates

#### Usage:
```typescript
import { performGitHubSearch, GitHubSearchParams, UsernameCache } from './utils/githubSearch';

const searchParams: GitHubSearchParams = {
  username: 'octocat',
  startDate: '2023-01-01',
  endDate: '2023-12-31',
  githubToken: 'your-token'
};

const cache: UsernameCache = {
  validatedUsernames: new Set(['octocat']),
  invalidUsernames: new Set()
};

const result = await performGitHubSearch(searchParams, cache, {
  onProgress: (message) => console.log(message),
  cacheCallbacks: { addToValidated, addToInvalid, removeFromValidated },
  updateUrl: true,
  requestDelay: 500
});

console.log(`Found ${result.totalCount} items`);
```

**Tests:** 35 test cases covering all functions, error scenarios, and edge cases  
**Lines of Code:** ~310 lines

---

### 6. [utils/index.ts](../utils.ts) - Core Utilities

Contains foundational utility functions used throughout the application.

#### Functions:
- `validateGitHubUsernames()` - Validates GitHub usernames via API
- `validateUsernameList()` - Validates username format and syntax
- `isValidDateString()` - Validates date strings
- `getParamFromUrl()` / `updateUrlParams()` - URL parameter handling
- `getContrastColor()` - Calculates text contrast for backgrounds

**Tests:** 48 test cases covering validation, date handling, and utility functions  
**Lines of Code:** ~200+ lines

---

## App.tsx Refactoring Impact

### Before Refactoring:
- **App.tsx size:** ~587 lines
- **Inline helper functions:** ~100+ lines of helper logic
- **Complex search logic:** ~150 lines of GitHub API handling
- **Username cache operations:** ~30 lines of Set manipulation
- **Limited testability** for search functionality

### After Refactoring:
- **App.tsx size:** ~485 lines (-102 lines, 17% reduction)
- **Extracted utilities:** 6 modular utility files
- **New test coverage:** 179 additional test cases
- **Improved maintainability:** Separated concerns and cleaner code
- **Enhanced reusability:** Utilities can be used across components

### Major Migration: GitHub Search Logic

The most significant improvement was migrating the complex `handleSearch` function (~150 lines) to a dedicated `githubSearch.ts` utility. This migration provides:

#### Benefits:
1. **Separation of Concerns:** GitHub API logic separated from UI state management
2. **Comprehensive Testing:** 35 test cases covering all search scenarios
3. **Error Handling:** Robust error handling with detailed context
4. **Progress Tracking:** Clean callback-based progress updates
5. **Caching Logic:** Extracted cache validation and management
6. **Type Safety:** Full TypeScript interfaces for all parameters
7. **Reusability:** Search logic can be used in other components

#### Before (App.tsx handleSearch):
```typescript
// ~150 lines of inline search logic with:
// - Parameter validation mixed with API calls
// - Cache management mixed with UI updates
// - Complex nested try-catch blocks
// - Difficult to test in isolation
```

#### After (githubSearch.ts):
```typescript
// Clean, testable, modular functions:
const result = await performGitHubSearch(params, cache, options);
// - 35 comprehensive unit tests
// - Separated validation, API calls, and caching
// - Clear interfaces and error handling
// - Easily testable and reusable
```

### Code Quality Improvements:

1. **Modularity:** Complex logic separated into focused utility modules
2. **Testability:** 179 comprehensive unit tests covering edge cases
3. **Type Safety:** Full TypeScript coverage with proper interfaces
4. **Documentation:** Extensive JSDoc comments and usage examples
5. **Error Handling:** Robust error handling in all utilities
6. **Performance:** Optimized filtering, caching, and API mechanisms
7. **Maintainability:** Clean separation of concerns and single responsibility

### Maintained Functionality:
- ✅ All existing features preserved
- ✅ No breaking changes to user experience
- ✅ Backward compatibility maintained
- ✅ Performance improvements in search and filtering
- ✅ Enhanced error handling and user feedback

## Testing Summary

Total test coverage across all utility modules:
- **filterUtils:** 31 tests
- **usernameCache:** 21 tests  
- **resultsUtils:** 52 tests
- **clipboard:** 18 tests
- **githubSearch:** 35 tests (NEW)
- **utils:** 48 tests
- **Total:** 205 utility tests

### New GitHub Search Tests Include:
- Parameter validation (6 tests)
- Username validation and caching (7 tests)
- GitHub API operations (7 tests)
- Cache validation logic (5 tests)
- Complete search orchestration (8 tests)
- Utility functions (2 tests)

All tests run in parallel and provide comprehensive coverage including:
- Happy path scenarios
- Edge cases and error conditions
- Type safety and input validation
- Performance considerations
- Browser compatibility
- API error handling
- Cache expiry scenarios

## Usage in Components

These utilities are primarily used in:
- **App.tsx:** Main application logic, search orchestration, and state management
- **IssuesAndPRsList.tsx:** Results filtering and display
- **SearchForm.tsx:** Username validation and form handling

The refactoring maintains a clean separation of concerns while dramatically improving code organization, testability, and maintainability. The migration of the GitHub search logic represents a significant improvement in code quality and developer experience. 