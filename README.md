# GitVegas 🎰

> **Local-First GitHub Activity Explorer & Search Tool**

GitVegas was started around an offsite in Las Vegas, started on a flight, iterated during a sleepless jet lag night, refined in the weeks and month after. 
It was mainly created using cursur and 99% it was prompted. The original intend was to allow the quick copy and paste of descriptive GitHub links.

Technically speaking, GitVegas is a Progressive Web App (PWA) that provides comprehensive GitHub activity exploration, search, and analytics. Built with React, TypeScript, and modern web technologies, it offers a native app-like experience with offline capabilities.

## ✨ Features

### 🔍 **Multi-Mode GitHub Data Access**
- **Search Mode**: Find issues and pull requests across repositories
- **Events Mode**: Explore GitHub activity events (up to 300 events per user)
- **Summary Mode**: Get a comprehensive overview of all activity

### 🎯 **Advanced Search & Filtering**
- **Real-time Search**: Filter by text, labels, users, and repositories
- **Repository Filtering**: Use `repo:owner/repo` and `-repo:owner/repo` syntax
- **Label Filtering**: Filter by specific labels with `label:name` syntax
- **User Filtering**: Filter by authors with `author:username` syntax
- **Date Range Filtering**: Specify custom date ranges for all searches

### 📊 **Comprehensive Data Views**
- **Timeline View**: Chronological display of all GitHub activity
- **Summary View**: Categorized overview (PRs, Issues, Comments, Commits)
- **Detailed Item View**: Full issue/PR details with markdown support
- **Bulk Operations**: Select and copy multiple items at once

### 🚀 **Progressive Web App (PWA)**
- **Offline Support**: Works without internet connection
- **App Installation**: Install as native app on desktop and mobile
- **Background Updates**: Automatic content updates
- **Local-First**: All data processed locally for privacy

### 💾 **Smart Caching & Performance**
- **IndexedDB Storage**: Fast local data storage
- **Intelligent Caching**: 30-minute cache with automatic refresh
- **Avatar Caching**: User avatars cached for faster loading
- **Search Persistence**: Search queries saved across sessions

### 🔗 **Sharing & Collaboration**
- **Shareable URLs**: Generate links with search parameters
- **URL State Management**: Deep linking to specific searches
- **Export Functionality**: Copy results to clipboard
- **Bulk Copy**: Select and copy multiple items

### 🎨 **Modern UI/UX**
- **GitHub-Native Design**: Uses Primer React components
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark/Light Theme**: Automatic theme detection
- **Accessibility**: Full keyboard navigation and screen reader support

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- GitHub account (optional, for enhanced features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/git-vegas.git
   cd git-vegas
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   ```
   http://localhost:5173
   ```

### Building for Production

```bash
# Build the application
npm run build

# Preview the production build
npm run preview

# Deploy to GitHub Pages
npm run deploy
```

## 📖 Usage Guide

### Basic Search

1. **Enter GitHub Username(s)**
   - Single user: `octocat`
   - Multiple users: `octocat,defunkt,mojombo`

2. **Set Date Range**
   - Choose start and end dates for your search
   - Defaults to last 30 days

3. **Select API Mode**
   - **Summary**: Overview of all activity
   - **GitHub Issues & PRs**: Detailed search results
   - **GitHub Events**: Activity timeline

4. **Click "Update"** to fetch data

### Advanced Search

Use the header search bar for real-time filtering:

- **Text Search**: `bug fix` - finds items containing "bug fix"
- **Label Filter**: `label:bug` - shows items with "bug" label
- **Repository Filter**: `repo:owner/repo` - shows items from specific repo
- **Exclude Repo**: `-repo:owner/repo` - excludes items from specific repo
- **Author Filter**: `author:username` - shows items by specific author
- **Combined**: `label:bug repo:react/react` - combines multiple filters

### Data Views

#### Summary View
- **PRs - merged**: Merged pull requests
- **PRs - opened**: New pull requests
- **PRs - closed**: Closed (not merged) pull requests
- **Issues - opened**: New issues
- **Issues - closed**: Closed issues
- **Comments**: Issue and PR comments
- **Commits**: Code commits
- **Other Events**: Repository events

#### Events View
- Chronological timeline of all GitHub activity
- Up to 300 events per user (GitHub API limit)
- Event latency: 30 seconds to 6 hours

#### Issues & PRs View
- Detailed search results
- Advanced filtering and sorting
- Bulk selection and copy operations

### Offline Usage

GitVegas works offline with cached data:

- **Cached Results**: Previous searches remain available
- **Offline Indicator**: Visual indicator when offline
- **Smart Caching**: Automatic cache management
- **PWA Installation**: Install as native app for better offline experience

## 🛠️ Development

### Project Structure

```
src/
├── components/          # Reusable UI components
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── views/              # Main application views
├── types/              # TypeScript type definitions
└── assets/             # Static assets
```

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run preview          # Preview production build

# Testing
npm run test             # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report
npm run test:e2e         # Run end-to-end tests

# Code Quality
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
npm run format:check     # Check code formatting

# Deployment
npm run deploy           # Deploy to GitHub Pages
```

### Testing

The project includes comprehensive testing:

- **Unit Tests**: 583+ tests with Vitest
- **Integration Tests**: React Testing Library
- **E2E Tests**: Playwright for browser testing
- **Coverage**: V8 coverage reporting

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file for local development:

```env
# GitHub API Configuration
VITE_GITHUB_API_URL=https://api.github.com
VITE_GITHUB_CLIENT_ID=your_client_id

# PWA Configuration
VITE_PWA_NAME=GitVegas
VITE_PWA_SHORT_NAME=GitVegas
VITE_PWA_DESCRIPTION=GitHub Activity Explorer
```

### GitHub Token (Optional)

For enhanced features, add a GitHub personal access token:

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate a new token with `public_repo` scope
3. Enter the token in GitVegas settings

## 📱 PWA Features

### Installation

**Desktop (Chrome/Edge)**:
1. Visit the deployed site
2. Click install icon in address bar
3. Follow browser prompts

**Mobile (iOS/Android)**:
1. Open site in browser
2. Tap share button
3. Select "Add to Home Screen"

### Offline Capabilities

- **App Shell**: Full interface works offline
- **Cached Data**: Previous searches available offline
- **Smart Updates**: Background content updates
- **Offline Detection**: Real-time status monitoring

## 🚀 Deployment

### GitHub Pages

The project is configured for automatic deployment to GitHub Pages:

```bash
npm run deploy
```

### Other Platforms

The built application can be deployed to any static hosting service:

- **Netlify**: Drag and drop `dist/` folder
- **Vercel**: Connect GitHub repository
- **AWS S3**: Upload `dist/` contents
- **Firebase Hosting**: Use Firebase CLI

## 📊 Performance

### Optimizations

- **Code Splitting**: Automatic route-based splitting
- **Tree Shaking**: Unused code elimination
- **Image Optimization**: Automatic image compression
- **Service Worker**: Intelligent caching strategies
- **IndexedDB**: Fast local data storage

### Bundle Analysis

```bash
npm run build
# Check dist/ folder for optimized assets
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Run tests: `npm run test`
5. Make your changes and submit a PR

### Code Style

- **TypeScript**: Strict type checking enabled
- **ESLint**: Comprehensive linting rules
- **Prettier**: Automatic code formatting
- **Conventional Commits**: Standard commit message format

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **GitHub API**: For providing comprehensive data access
- **Primer React**: For the beautiful UI components
- **Vite**: For the fast build tooling
- **React**: For the amazing framework
- **TypeScript**: For type safety

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/git-vegas/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/git-vegas/discussions)
- **Documentation**: [Wiki](https://github.com/yourusername/git-vegas/wiki)

---

**Made with ❤️ by the GitVegas Team**

*Inspired by the need for better GitHub activity exploration and search capabilities.*
