# 🚀 How to release

Releases are cut via the `/release` slash command in Claude Code.

## Prerequisites

- Clean working tree on `master`.
- Local `master` up to date with `origin/master` (`git fetch && git pull`).
- You know the next semver version number (`X.Y.Z`).

## Flow

1. Open Claude Code in the project directory.
2. Run the slash command:

   ```
   /release 1.2.3
   ```

3. Claude reads the commits since the last `v*` tag and drafts a `CHANGELOG.md` entry in user-facing English, grouped into **Added**, **Changed**, **Fixed**, and **Under the hood**.
4. Review the draft in the chat. Ask Claude to reword, merge, or move bullets until it reads the way you want.
5. Approve the draft. Claude then:
   - Writes (or appends to) `CHANGELOG.md`
   - Runs `node scripts/version-bump.js X.Y.Z` to bump `manifest.json`, `versions.json`, `package.json`, and `package-lock.json`
   - Commits the changes as `Release X.Y.Z`
   - Tags `vX.Y.Z` and pushes `master` and the tag (two separate commands — legacy non-`v` tags are intentionally not pushed)

6. GitHub Actions takes over:
   - Runs quality checks (lint, typecheck, tests)
   - Builds the plugin
   - Extracts the new version's section from `CHANGELOG.md`
   - Publishes a non-draft GitHub release with that section as the body and `main.js` + `manifest.json` as assets

## Recovery

If the workflow fails because the extraction returned nothing (e.g., `CHANGELOG.md` didn't get updated), the tag is still pushed. To retry:

```
git push --delete origin vX.Y.Z
git tag --delete vX.Y.Z
```

Fix `CHANGELOG.md`, then re-run `/release X.Y.Z`.

## Key files

- `.claude/commands/release.md` — the slash command prompt that drives the flow
- `scripts/extract-release-notes.awk` — awk program that extracts one version's body from `CHANGELOG.md`
- `scripts/version-bump.js` — updates the four version files
- `.github/workflows/release.yml` — CI release workflow
