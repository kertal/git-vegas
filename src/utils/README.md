# Utils

Pure, framework-agnostic helpers used across the app. Anything with meaningful
logic lives here (behind unit tests) rather than inside React components, so the
UI layer stays thin.

## Data flow at a glance

```
network → rawDataUtils → viewFiltering / summaryGrouping → views
          (transform)     (filter / categorize)
```

The app stores **raw** GitHub API payloads in IndexedDB and re-derives every
view in memory. These modules are the derivation layer.

## Modules

### Data transformation
- **`rawDataUtils.ts`** — Converts raw GitHub Events API payloads into the
  unified `GitHubItem` shape (`transformEventToItem`, `processRawEvents`) and
  date-filters/deduplicates Search API items (`categorizeRawSearchItems`).
- **`prEnrichment.ts`** — Fills in missing PR details (title, state, labels) for
  items reconstructed from events, using an IndexedDB-backed cache and an
  SWR-style refresh.

### Filtering & categorization
- **`viewFiltering.ts`** — The single source of truth for the free-text search
  box: `parseSearchText` extracts `label:` / `user:` / `repo:` / `org:`
  qualifiers (and their negations), and `filterItemsByAdvancedSearch` applies
  them. Also exposes `sortItemsByUpdatedDate`.
- **`summaryGrouping.ts`** — Categorizes items for the Summary view
  (`getEventType`, `isReviewItem`, `groupSummaryData`) using the stable GitHub
  event type where available and title prefixes as a fallback.
- **`summaryConstants.ts` / `summaryHelpers.ts`** — Group names and small
  selection/formatting helpers for the Summary view.

### Storage
- **`indexedDB.ts`** — Typed wrapper around IndexedDB for events, search items,
  and the PR-details cache. The events/items store is generic over the item
  type (`EventsData<T>`).
- **`storageUtils.ts`** — localStorage helpers with quota/error handling.
- **`usernameCache.ts`** — Caches username validation results and avatar URLs to
  avoid repeated API calls.

### State & sharing
- **`urlState.ts`** — Parses/generates shareable URL parameters and owns the
  `ResultsFilter` config type (`createDefaultFilter`).
- **`settings.ts`** — App-wide constants (API page size, request delay,
  username limit).
- **`environment.ts`** — Test/runtime environment detection.

### Presentation helpers
- **`clipboard.ts`** — Copies items to the clipboard as plain text or styled
  HTML.
- **`textUtils.ts`** — Text truncation/formatting helpers.
- **`actionUtils.ts`** — Maps event actions to display labels.
- **`pwaUtils.ts`** — Service-worker/PWA update helpers.

## Conventions

- Utilities are pure and side-effect free where possible; network and storage
  side effects are isolated to `indexedDB.ts`, `prEnrichment.ts`, and
  `usernameCache.ts`.
- Every module with logic has a colocated `*.test.ts` (or a test under
  `__tests__/`). Run `npm test`.
