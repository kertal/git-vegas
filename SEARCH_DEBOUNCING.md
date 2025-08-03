# Search Debouncing Feature

This feature adds debouncing to the search input to improve performance and user experience.

## What is Debouncing?

Debouncing is a programming practice used to ensure that time-consuming tasks don't fire so often, that it stalls the performance of the web page. In the context of search, it means that the search function will only execute after the user has stopped typing for a specified amount of time.

## Implementation

### Components Affected

- **HeaderSearch**: The main search input in the header that filters results in real-time

### How It Works

1. **User Types**: When a user types in the search box, the input value updates immediately for visual feedback
2. **Debounce Timer**: A 300ms timer starts after each keystroke
3. **Timer Reset**: If the user types again before 300ms, the timer resets
4. **Search Execution**: Only after 300ms of no typing does the actual search filter execute

### Technical Details

- **Debounce Delay**: 300 milliseconds
- **Hook Used**: `useDebouncedSearch` from `src/hooks/useDebouncedSearch.ts`
- **Immediate Clear**: The clear button bypasses debouncing for instant response

## Benefits

### Performance
- **Reduced API Calls**: Prevents excessive filtering operations while typing
- **Better Responsiveness**: UI remains smooth during rapid typing
- **Resource Efficiency**: Reduces unnecessary computations

### User Experience
- **Visual Feedback**: Input updates immediately so users see what they're typing
- **Intuitive Behavior**: Search results update after a natural pause in typing
- **Clear Function**: Instant clearing when the X button is clicked

## Code Example

```tsx
// Before (immediate search on every keystroke)
const handleInputChange = (event) => {
  onSearchChange(event.target.value); // Called on every keystroke
};

// After (debounced search)
const { inputValue, setInputValue, clearSearch } = useDebouncedSearch(
  searchText,
  onSearchChange,
  300 // 300ms delay
);

const handleInputChange = (event) => {
  setInputValue(event.target.value); // Updates input immediately
  // onSearchChange is called after 300ms of no typing
};
```

## Testing

The debouncing functionality is tested in `src/components/__tests__/HeaderSearch.test.tsx` with the following test cases:

- ✅ Renders with placeholder text
- ✅ Calls setInputValue when user types
- ✅ Calls clearSearch when clear button is clicked
- ✅ Shows clear button when there is input value
- ✅ Does not show clear button when input is empty
- ✅ Uses debounced search hook with correct parameters

## Configuration

The debounce delay can be adjusted by changing the third parameter in the `useDebouncedSearch` hook:

```tsx
const { inputValue, setInputValue, clearSearch } = useDebouncedSearch(
  searchText,
  onSearchChange,
  500 // Change to 500ms for slower response
);
```

## Future Enhancements

- **Adaptive Debouncing**: Different delays for different input lengths
- **Search History**: Remember recent searches
- **Search Suggestions**: Auto-complete based on previous searches
- **Keyboard Shortcuts**: Quick access to search functionality 