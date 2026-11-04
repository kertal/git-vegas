# GitVegas architectural review

Reviewed at commit `738a917` (branch `main`), 2026-11-02.

## 1. What the system is

A local-first, single-page PWA. No backend. The browser talks to `api.github.com` directly,
stores raw responses in IndexedDB, and derives every view from that raw data in memory.

```
 SearchForm ──> useGitHubDataFetching ──fetch──> api.github.com
                      │  (search/issues + users/{u}/events)
                      ▼ store raw
             IndexedDB (GitVegasDB: events, metadata, prCache)
                      │ useIndexedDBStorage x2  (one hook per key)
                      ▼
             useGitHubDataProcessing
               rawDataUtils.processRawEvents / categorizeRawSearchItems
               → GitHubItem[]  → prEnrichment (N fetches, SWR cache)
                      │
   HeaderSearch ──searchText──┐
                      ▼       ▼
        views/{Summary, IssuesAndPRsList, EventView}
          each: viewFiltering → group → useListSelection/useDialogNavigation/useCopyFeedback → clipboard
```

Cross-cutting state: `FormContext` (defined in `App.tsx`) carries form fields, counts, loading state
and `searchText` to the form, the dialog and all three views. Persistence is `localStorage` via
`useLocalStorage` (a dozen keys) plus IndexedDB for bulk data.

The overall shape is sound for the product: raw data in, pure transforms, dumb views. The
problems below are mostly about things that drifted during iteration rather than a wrong
foundation.

## 2. Findings, ordered by impact

### 2.1 The "session only" token option is not honoured (correctness and security)

`SettingsDialog` offers "Browser Session (Recommended)" vs "Local Storage" and moves a
`github-token` key between `sessionStorage` and `localStorage`. Nothing reads that key.
The token the app actually uses is `formSettings.githubToken`, which `useFormSettings` always
serialises into `localStorage['github-form-settings']`, regardless of the chosen option.

Result: a user who picks the recommended option believes the token dies with the tab. It does not.
It also survives `clearCachesKeepToken`, by design, and is copied back into form settings.

Fix direction: make the token its own storage concern. Read it from a `tokenStorage` adapter
(session or local) in one place, and strip `githubToken` from the persisted `FormSettings` object.
Files: `src/components/SettingsDialog.tsx`, `src/hooks/useLocalStorage.ts` (`useFormSettings`),
`src/hooks/useGitHubFormState.ts`.

### 2.2 Two parallel data-fetch stacks, one of them dead but fully tested

Live path: `useGitHubDataFetching` (338 lines) does validation, pagination, the search query, the
events pagination, sorting and storage inline, with `fetchAllEvents` redefined on every render.

Dead path: `src/utils/githubSearch.ts` (624 lines: `performGitHubSearch`,
`performCombinedGitHubSearch`, `fetchUserItems`, `fetchUserEvents`, `validateAndCacheUsernames`,
`isCacheValid`) has no importers outside its own 809-line test file. `src/utils/README.md`
describes it as the main search path. It also uses a different search query than the live code
(`author:` only, no `assignee:`), so the tests pin behaviour the app does not have.

Fix direction: delete `githubSearch.ts` and its test, or move the live fetch logic out of the hook
into it. Either way, one module should own "how we call GitHub". The hook should only own
React state.

### 2.3 Type discrimination by title prefix

`GitHubItem` is one struct for search results, issue events, PR events, reviews, review comments,
issue comments, pushes, forks, stars, wiki edits and repo creation. Which one an item is gets
decided in at least six places by string sniffing:

- `summaryGrouping.getEventType`: `title.startsWith('Review on:')`, `'Comment on:'`, `'Review comment on:'`
- `resultsUtils.getItemType`: `'Reviewed:'` (a prefix nothing produces any more) and `'Comment on:'`
- `filterUtils`: `'Comment on:'`
- `clipboard.deduplicateByTitle`: `'Review on:'`
- `Summary.groupItemsByUrl`: `'Review on:'`
- `prEnrichment.needsPREnrichment`: `'Pull Request #'`, `'Review on: Pull Request #'`, and `title.includes('undefined')`

`rawDataUtils.transformEventToItem` builds those titles, and `prEnrichment` later rewrites them,
so a display string is doubling as the discriminant. Renaming a prefix for UI reasons silently
breaks grouping, filtering, deduplication and enrichment. `originalEventType` already exists and
is the right discriminant; it is only used as a first-choice fallback.

Fix direction: add a required `kind` field (`'issue' | 'pr' | 'pr_review' | 'pr_review_comment' |
'issue_comment' | 'push' | ...`) set once in `rawDataUtils` and in the search-item path, and make
every consumer switch on it. Keep titles purely presentational.

### 2.4 The IndexedDB layer is typed and named for events but stores two different things

`useIndexedDBStorage` returns `events: GitHubEvent[]`; the app calls it twice, once for events and
once for search items. That forces `as unknown as GitHubItem[]` / `as unknown as GitHubEvent[]` in
`App.tsx`, `useGitHubDataFetching.ts` (store side) and `useGitHubDataProcessing.ts` (three places).
`RawDataStorage` in `types.ts` still says search items live in localStorage, which is no longer true.

More serious: `clearEvents` and `clearSearchItems` both call `eventsStorage.clear()`, which runs
`indexedDBManager.clearAll()` and wipes events, search items, metadata and the PR cache together.
So "Clear Search Items" in settings also deletes all events, and vice versa, which is not what the
three buttons promise.

Fix direction: make the storage hook generic (`useIndexedDBStorage<T>(key)`), add
`eventsStorage.remove(key)` that deletes one record, and keep `clearAll` for the "Clear All" button.
Also note the store holds one record per key with the whole array inside, so this is a key/value
blob store. That is fine at 300 events per user, but `getStorageInfo` serialising everything with
`JSON.stringify` to compute a size will get slow if the dataset grows.

### 2.5 Shared links lose most of what they claim to carry

`ShareButton` → `urlState.generateUrlParams` writes `username`, `startDate`, `endDate`, `apiMode`,
`searchText` and filter fields. The reader is not `urlState.parseUrlParams` (unused) but
`useFormSettings`, which reads only `username`, `startDate`, `endDate` and takes
`usernames[0]`, so a multi-user link collapses to one user, `apiMode` is dropped, and `searchText`
is never applied. `ShareButton` is also rendered without the `searchText` prop in `App.tsx`, so the
filter is never written either.

There are three URL utilities: `utils.ts` (`getParamFromUrl`, `updateUrlParams`), `urlState.ts`
(`parseUrlParams`, `cleanupUrlParams`, `applyUrlOverrides`, all unused), and the inline code in
`useFormSettings`.

Fix direction: one module owns the URL schema in both directions. `useFormSettings` should call
`parseUrlParams` and apply every field it accepts.

### 2.6 A large unused surface that still looks load-bearing

Modules with no non-test importers (or only type imports):

| Module | Lines | Notes |
|---|---|---|
| `utils/githubSearch.ts` | 624 | see 2.2 |
| `utils/resultsUtils.ts` | 631 | only `parseSearchText` is used, via `viewFiltering`; `filterByText` is a copy of `filterItemsByAdvancedSearch` |
| `utils/filterUtils.ts` | ~110 | unused |
| `utils/textUtils.ts`, `utils/pwaUtils.ts` | | unused; `pwaUtils` registers a window listener at import time |
| `utils/storageUtils.ts` | 240 | only `clearAllGitHubData` and `clearCachesKeepToken` are used; `safeSetItem` is duplicated in `useLocalStorage` |
| `types.ts` `ResultsContextType`, `FormContextType` | | `FormContextType` is redefined (differently) in `App.tsx`; `ResultsContextType` has no provider, only test mocks |
| `src/test/setup.ts` mocks `useResultsContext` | | a hook that no longer exists |

Roughly a third of `src/utils` and a comparable share of the tests are exercising code the app
does not run. The utils README documents the dead modules as the architecture.

### 2.7 Three views that are 70% the same component

`Summary`, `IssuesAndPRsList` and `EventView` each implement: collapsed sections in
localStorage, filter → sort → group, "all displayed items" for selection, select-all checkbox,
per-section checkbox, collapse toggle that deselects, bulk copy handler that builds `groupedData`
twice, `DescriptionDialog` wiring, `EmptyState` branching. The extraction into `useListSelection`,
`useDialogNavigation` and `useCopyFeedback` was the right move but stopped halfway.

Fix direction: a single `GroupedItemList` component that takes `groups: Record<string, GitHubItem[]>`
plus a `storagePrefix`, and three thin "grouping strategy" wrappers. That would also give
`EventView` the per-section pagination the other two have.

### 2.8 Data-processing hook does the same work three times and can show stale results

`useGitHubDataProcessing` computes `categorizeRawSearchItems` and `processRawEvents` for
`baseResults`, then again for `searchItemsCount` and `eventsCount`. In summary mode that is five
passes over the raw arrays per change of `searchText`.

`results = enrichedResults.length > 0 ? enrichedResults : baseResults` means switching `apiMode`
shows the previous mode's enriched list until the enrichment effect for the new mode resolves,
and if the new mode's base list is empty the old list persists until the effect clears it.

Fix direction: derive the mode-independent processed arrays once (`processedEvents`,
`processedSearchItems`) and compose counts and `baseResults` from those. Key enriched results by
the `baseResults` identity so a stale list is never returned.

### 2.9 Config and repo hygiene

- Two unit-test runners are configured: `jest.config.ts` plus `jest`, `ts-jest`, `@types/jest`,
  `jest-environment-jsdom`, `identity-obj-proxy` in devDependencies, and a `src/setupTests.ts`,
  while `npm test` runs Vitest with `src/test/setup.ts`. One should go.
- `dev-dist/` is tracked in git although `.gitignore` lists it.
- Twelve root-level `*_FIX.md` / `*_FEATURE.md` files describe past work. `CUSTOM_SECTIONS_FEATURE.md`
  describes a feature with no code. These should move to a `docs/` folder or a changelog, or be
  deleted.
- `README.md` says "30-minute cache with automatic refresh" and a search syntax (`author:`)
  that differ from the code (`user:` and no TTL on the main dataset).
- `.github/workflows/deploy.yml` runs build only; `npm run lint` and `npm test` are not in CI,
  which is how the dead-code drift above went unnoticed.
- About ninety `console.log/warn/error` calls in app code, no log abstraction, so production
  output is noisy and the test run is too.
- `eslint-disable react-hooks/exhaustive-deps` is used once; several effects list extra deps
  instead (`useGitHubFormState` lists `avatarCache` and `usernames` although it does not read them),
  which causes extra effect runs guarded only by `fromUrlParams`.

### 2.10 Service-worker API caching duplicates the app's own cache

`vite.config.ts` caches every `api.github.com` response NetworkFirst for 24 hours in Cache Storage,
including authenticated responses (the cache key ignores the `Authorization` header). The app
already keeps its own IndexedDB copy of exactly those responses. Two caches with different
lifetimes make "why am I seeing old data" hard to answer, and a stale cached `search/issues` page
can be served for a different token's session on the same browser. Consider restricting the runtime
cache to avatars and letting IndexedDB be the only data cache.

## 3. What is in good shape

- Raw-in, derive-everything design: the GitHub payload is stored untouched (`original`), so
  transforms can be changed without refetching.
- `rawDataUtils.transformEventToItem` is a clear single place for event → item mapping, with
  good test coverage.
- `prEnrichment` is a well-contained SWR cache with in-flight deduplication.
- `useLocalStorage` handles `Set`/`Map` round-tripping and quota errors.
- Primer React gives consistent UI with little custom CSS.
- Vitest plus Playwright coverage exists and runs quickly (see section 5).

## 4. Suggested order of work

1. Fix the token storage mismatch (2.1) and the clear-buttons behaviour (2.4). Both are user-visible
   promises the app does not keep.
2. Delete dead modules and their tests (2.6, 2.2), remove the Jest config, untrack `dev-dist`, add
   `lint` and `test` to CI (2.9). This shrinks the codebase before any refactor.
3. Introduce `kind` on `GitHubItem` and remove title sniffing (2.3).
4. Make the storage hook generic and type the two datasets honestly (2.4).
5. Consolidate URL state into one module and make share links round-trip (2.5).
6. Extract `GroupedItemList` (2.7) and simplify `useGitHubDataProcessing` (2.8).

## 5. Verification run

Run on a fresh `npm ci` at commit `738a917`.

| Check | Result |
|---|---|
| `npm run build` typecheck (`tsc` with root `tsconfig.json`) | passes |
| `tsc -p tsconfig.app.json --noEmit` (the stricter Vite-generated config) | 74 errors, all TS1484 (`verbatimModuleSyntax` type-only imports). This config is not referenced by any script, so it is dead configuration. |
| `npm run lint` | 8 errors, 3 warnings in 7 files (unused vars, `any`, a `require()` in a test, hook deps) |
| `npx vitest run` | 631 passed, 2 failed, 13 skipped, 43 files, 44 s |

The two failures are timeouts in `src/views/__tests__/IssuesAndPRsList.test.tsx`
("select all selects items on all pages", "deselect all clears items on all pages"): 150 rendered
rows plus `userEvent` exceed the 5 s default. They are a flaky-by-design test, not a product bug,
but they mean `main` is red and nobody notices because CI does not run tests.

Playwright e2e tests were not run (they need a dev server and network access to GitHub).
