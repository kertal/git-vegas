# Custom Sections Feature

## Overview

The Custom Sections feature allows users to create configurable sections on the Overview tab that display issues and pull requests filtered by specific labels from specified repositories. This provides a powerful way to track important issues across different repositories and label combinations.

## Features

### 🎯 **Configurable Sections**
- Create multiple custom sections with unique configurations
- Each section can target a specific GitHub repository
- Filter by one or more labels
- Choose to show issues, pull requests, or both
- Set maximum number of items to display (1-50)
- Enable/disable sections individually

### 💾 **Persistent Storage**
- **Configuration**: Stored in localStorage for immediate access
- **Data Cache**: Results stored in IndexedDB with 30-minute expiration
- **Offline Support**: Cached data available when offline

### 🔄 **Smart Data Management**
- Automatic data refresh when cache expires
- Manual refresh button for each section
- Sorted by updated date (descending)
- Efficient API usage with caching

### 🎨 **GitHub-Native UI**
- Timeline-based display matching GitHub's design
- User avatars and repository information
- Direct links to issues/PRs and repositories
- Status indicators and timestamps
- Responsive design for all screen sizes

## Usage

### Adding a Custom Section

1. **Open Overview Tab**: Navigate to the Overview tab in GitVegas
2. **Manage Sections**: Click the "Manage Sections" button (gear icon) in the top-right
3. **Add Section**: Click "Add Section" button
4. **Configure Section**:
   - **Title**: Give your section a descriptive name
   - **Repository**: Enter repository in `owner/repo` format
   - **Labels**: Add one or more labels to filter by
   - **Type**: Choose Issues, Pull Requests, or Both
   - **Max Items**: Set how many items to display (1-50)
5. **Save**: Click "Create" to save the section

### Managing Sections

- **Edit**: Click the pencil icon to modify section settings
- **Enable/Disable**: Toggle sections on/off without deleting
- **Delete**: Click the trash icon to permanently remove a section
- **Refresh**: Click the refresh icon on any section to update its data

### Repository Validation

The system automatically validates repositories when you enter them:
- ✅ **Green checkmark**: Repository exists and is accessible
- ❌ **Red X**: Repository not found or access denied
- **Label suggestions**: Available repository labels are shown for easy selection

## Technical Implementation

### Architecture

```
src/
├── types.ts                     # TypeScript interfaces for custom sections
├── utils/
│   ├── customSections.ts        # Configuration management (localStorage)
│   ├── customSectionAPI.ts      # GitHub API integration
│   └── indexedDB.ts            # Data caching (enhanced)
├── components/
│   ├── CustomSectionManager.tsx # Section configuration UI
│   ├── CustomSectionDisplay.tsx # Section data display
│   └── OverviewTab.tsx         # Enhanced with custom sections
└── __tests__/                  # Unit tests
```

### Data Flow

1. **Configuration**: `CustomSectionManager` ↔ `localStorage`
2. **Data Fetching**: `CustomSectionAPI` → GitHub API
3. **Caching**: `IndexedDB` for 30-minute cache
4. **Display**: `CustomSectionDisplay` renders cached data

### Storage Strategy

- **localStorage**: Section configurations (lightweight, immediate access)
- **IndexedDB**: API response data (larger capacity, structured storage)
- **Cache Expiry**: 30 minutes for optimal freshness vs. API usage

## API Integration

### GitHub Search API

Custom sections use GitHub's Search API to fetch issues and pull requests:

```javascript
// Example query for issues with specific labels
GET /search/issues?q=repo:owner/repo is:issue label:"bug" label:"high-priority"&sort=updated&order=desc
```

### Rate Limiting

- **Without Token**: 60 requests/hour per IP
- **With Token**: 5,000 requests/hour
- **Caching**: Reduces API calls significantly
- **Error Handling**: Graceful degradation when limits are reached

## Configuration Examples

### Bug Tracking Section
```json
{
  "title": "Critical Bugs",
  "repository": "microsoft/vscode",
  "labels": ["bug", "critical"],
  "type": "issues",
  "maxItems": 10
}
```

### Feature Requests Section
```json
{
  "title": "Feature Requests",
  "repository": "facebook/react",
  "labels": ["enhancement", "feature-request"],
  "type": "both",
  "maxItems": 15
}
```

### Security Issues Section
```json
{
  "title": "Security Issues",
  "repository": "nodejs/node",
  "labels": ["security"],
  "type": "issues",
  "maxItems": 5
}
```

## Best Practices

### Section Organization
- Use descriptive titles that indicate purpose
- Group related labels together
- Set appropriate item limits (5-15 for most cases)
- Enable only sections you actively monitor

### Performance Optimization
- Don't create too many sections (recommend < 10)
- Use specific label combinations to reduce result sets
- Leverage caching by not refreshing unnecessarily
- Add GitHub token for higher rate limits

### Label Strategy
- Use existing repository labels when possible
- Combine labels for more specific filtering
- Check label suggestions in the repository field
- Consider label naming conventions of target repositories

## Troubleshooting

### Common Issues

**Repository Not Found**
- Verify repository name format: `owner/repo`
- Check if repository is public or you have access
- Ensure correct spelling and case

**No Results Displayed**
- Verify labels exist in the target repository
- Check if any issues/PRs have those label combinations
- Try broadening label criteria or changing type filter

**API Rate Limit Exceeded**
- Add GitHub personal access token in settings
- Wait for rate limit reset (1 hour for unauthenticated)
- Reduce number of sections or refresh frequency

**Slow Loading**
- Check internet connection
- Verify GitHub API status
- Consider reducing maxItems for faster loading

### Debug Information

Each section displays:
- Last updated timestamp
- Repository accessibility status
- Error messages when applicable
- Loading indicators during data fetch

## Future Enhancements

Potential improvements for future versions:

- **Advanced Filtering**: Date ranges, assignees, milestones
- **Sorting Options**: Different sort criteria beyond updated date
- **Export Features**: Export section data to CSV/JSON
- **Notifications**: Alert when new items match criteria
- **Templates**: Pre-configured section templates for common use cases
- **Bulk Operations**: Import/export section configurations
- **Analytics**: Track section usage and performance metrics

## Security Considerations

- **Token Storage**: GitHub tokens stored securely in browser storage
- **API Permissions**: Recommends minimal read-only permissions
- **Data Privacy**: All data stored locally, no external servers
- **HTTPS Only**: All GitHub API calls use secure connections

## Testing

The feature includes comprehensive unit tests:

- Configuration management tests
- Component rendering tests
- API integration tests
- Error handling tests
- User interaction tests

Run tests with: `npm test`

## Support

For issues or questions about the Custom Sections feature:

1. Check this documentation first
2. Review GitHub API documentation
3. Check browser console for error messages
4. Verify GitHub token permissions if using authentication 