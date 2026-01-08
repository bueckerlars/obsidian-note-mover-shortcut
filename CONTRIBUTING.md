# Contributing to NoteMover Shortcut

Thank you for your interest in contributing to NoteMover Shortcut! This document provides guidelines and instructions for contributing to this project.

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn
- Git
- Basic knowledge of TypeScript and Obsidian plugin development

### Development Setup

1. **Fork the repository** from the `dev` branch

   ```bash
   # Clone your fork
   git clone https://github.com/YOUR_USERNAME/obsidian-note-mover-shortcut.git
   cd obsidian-note-mover-shortcut

   # Make sure you're on the dev branch
   git checkout dev
   git pull origin dev
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Build the plugin**
   ```bash
   npm run dev
   ```

## Contribution Workflow

### 1. Fork from the `dev` branch

Always fork and work from the `dev` branch, not `main`. The `dev` branch is where active development happens.

### 2. Create a feature branch

Create a new branch for your feature or bug fix:

```bash
# Make sure you're on the dev branch and up to date
git checkout dev
git pull origin dev

# Create and switch to a new feature branch
git checkout -b feat/your-feature-name
# or for bug fixes:
git checkout -b fix/your-bug-fix-name
```

**Branch naming conventions:**

- `feat/` - for new features
- `fix/` - for bug fixes
- `docs/` - for documentation changes
- `refactor/` - for code refactoring
- `test/` - for adding or updating tests
- `chore/` - for maintenance tasks

### 3. Make your changes

- Write clean, readable code
- Follow the existing code style
- Add comments for complex logic
- Update documentation if needed
- Test your changes thoroughly

### 4. Commit your changes

Make sure your code follows the project's standards before committing:

```bash
# Check code formatting
npm run format:check

# Run linting
npm run lint

# Fix any issues automatically
npm run lint:fix
npm run format
```

Write clear, descriptive commit messages:

```bash
git add .
git commit -m "feat: add new feature description"
git commit -m "fix: resolve issue with file movement"
```

**Commit message format:**

- Use present tense ("add feature" not "added feature")
- Use imperative mood ("move file" not "moves file")
- Start with a type: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- Keep the first line under 72 characters
- Add a blank line and detailed description if needed

### 5. Push and create a Pull Request

Push your feature branch to your fork:

```bash
git push origin feat/your-feature-name
```

Then, open a new Pull Request from your feature branch to the `dev` branch:

1. Go to the original repository on GitHub
2. Click "New Pull Request"
3. Select `dev` as the base branch
4. Select your feature branch as the compare branch
5. Fill out the PR template (see below)

### 6. Pull Request Description

When opening a Pull Request, please include:

- **Description of changes**: Clearly describe what changes you made and why
- **Issue reference**: If your PR solves an issue, link it using `Closes #123` or `Fixes #123`
- **Testing**: Describe how you tested your changes
- **Screenshots**: If applicable, include screenshots or GIFs demonstrating the changes
- **Checklist**: Confirm that you've:
  - [ ] Followed the code style guidelines
  - [ ] Tested your changes
  - [ ] Updated documentation if needed
  - [ ] Added appropriate commit messages

**Example PR Description:**

```markdown
## Description

This PR adds a new feature to filter files by creation date.

## Changes Made

- Added `created_at` filter criteria support
- Updated RuleMatcher to handle date-based filtering
- Added date parsing utilities

## Related Issues

Closes #42

## Testing

- Tested with various date formats
- Verified filtering works with existing rules
- Tested edge cases (invalid dates, missing dates)
```

## Code Style Guidelines

This project uses:

- **ESLint** for code linting
- **Prettier** for code formatting
- **TypeScript** for type safety

Before submitting your PR, ensure:

```bash
# All checks pass
npm run lint
npm run format:check
npm run type-check
```

## Project Structure

- `src/core/` - Core functionality and services
- `src/handlers/` - Command handlers
- `src/modals/` - Modal components
- `src/settings/` - Settings management
- `src/types/` - TypeScript type definitions
- `src/utils/` - Utility functions

## Questions?

If you have questions or need help, please:

1. Check existing issues and discussions
2. Open a new issue with the `question` label
3. Reach out to the maintainers

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow

Thank you for contributing to NoteMover Shortcut! 🎉
