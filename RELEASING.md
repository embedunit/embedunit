# Release Process

This project uses [Changesets](https://github.com/changesets/changesets) for version management and publishing.

## Overview

All `@embedunit/*` packages use **fixed versioning** - they always share the same version number. When any package changes, all packages are released together.

## For Contributors

### Adding a Changeset

When you make a change that should be released, add a changeset:

```bash
pnpm changeset
```

This will prompt you to:
1. Select which packages are affected (usually auto-detected)
2. Choose the bump type:
   - `patch` - Bug fixes, documentation updates
   - `minor` - New features (backward compatible)
   - `major` - Breaking changes
3. Write a summary of the changes

A new file will be created in `.changeset/` - commit this with your PR.

### When to Add a Changeset

**Add a changeset for:**
- Bug fixes
- New features
- Breaking changes
- Performance improvements
- Dependency updates that affect users

**Don't add a changeset for:**
- Documentation-only changes (README, comments)
- Test-only changes
- CI/tooling changes
- Refactoring with no user-facing changes

### Example Changeset

```markdown
---
"@embedunit/core": minor
---

Add support for async beforeAll/afterAll hooks
```

Since we use fixed versioning, you only need to mention one package - all will be bumped together.

## For Maintainers

### Automated Release Flow

1. **PRs with changesets merge to main**
   - The release workflow detects pending changesets
   - Creates/updates a "Version Packages" PR automatically

2. **Review the Version Packages PR**
   - Check the changelog updates
   - Verify version bump is correct (patch/minor/major)
   - Merge when ready to release

3. **Publishing happens automatically**
   - Merging the Version Packages PR triggers publishing
   - All packages are built and published to npm
   - Git tags are created
   - GitHub Release is created with changelog

### Manual Release (if needed)

```bash
# 1. Ensure you're on main and up to date
git checkout main
git pull

# 2. Version packages (updates package.json files and changelogs)
pnpm version

# 3. Commit the version changes
git add .
git commit -m "chore: version packages"

# 4. Build and publish
pnpm release

# 5. Push changes and tags
git push --follow-tags
```

### NPM Token Setup

For automated releases, add `NPM_TOKEN` to GitHub repository secrets:

1. Go to npmjs.com → Access Tokens → Generate New Token
2. Select "Automation" token type
3. Copy the token
4. Add to GitHub: Settings → Secrets → Actions → New repository secret
   - Name: `NPM_TOKEN`
   - Value: (paste token)

### First Release

Before the first release, ensure all packages have correct `publishConfig`:

```json
{
  "publishConfig": {
    "access": "public"
  }
}
```

## Version Strategy

| Change Type | Bump | Example |
|-------------|------|---------|
| Bug fix | patch | 1.0.0 → 1.0.1 |
| New feature | minor | 1.0.0 → 1.1.0 |
| Breaking change | major | 1.0.0 → 2.0.0 |

### Pre-releases

For alpha/beta releases:

```bash
pnpm changeset pre enter alpha
# ... add changesets and version as normal ...
pnpm changeset pre exit
```
