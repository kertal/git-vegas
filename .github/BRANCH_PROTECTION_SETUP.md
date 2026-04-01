# Branch Protection Setup

To ensure that tests must pass before PRs can be merged, configure branch protection rules on the `main` branch.

## Setup Instructions

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Branches**
3. Click **Add rule** (or edit the existing rule for `main`)
4. Configure the following settings:

### Branch Name Pattern
```
main
```

### Protection Rules

#### Required Status Checks
- ✅ Check **Require status checks to pass before merging**
- ✅ Check **Require branches to be up to date before merging**
- Add the following status checks:
  - `test` (from the test.yml workflow)
  - `build` (from the deploy.yml workflow) - optional but recommended

#### Additional Recommended Settings
- ✅ **Require a pull request before merging**
  - Require approvals: 1 (or as needed)
- ✅ **Do not allow bypassing the above settings**
- ✅ **Require conversation resolution before merging**

## What This Does

With these settings enabled:
1. Pull requests to `main` must pass all Playwright tests
2. Pull requests to `main` must pass the build step
3. PRs cannot be merged until all status checks pass
4. The test workflow runs automatically on every PR

## Workflow Details

The test workflow (`.github/workflows/test.yml`) runs:
- Unit tests (Vitest)
- Build verification
- E2E tests (Playwright)
  - Tests run on Chromium only in CI (for speed and reliability)
  - Locally, tests run on all browsers (Chromium, Firefox, WebKit, Mobile)

## Manual Setup Required

⚠️ **Important**: Branch protection rules must be configured manually through the GitHub UI. They cannot be set via code or configuration files.

After pushing these changes, a repository administrator should:
1. Follow the setup instructions above
2. Verify that the test workflow runs successfully on a test PR
3. Confirm that the status checks appear in the branch protection settings
