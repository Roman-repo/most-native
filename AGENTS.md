# Agent Guidelines — Мост Native

## Git Workflow

### Branching Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready. Only stable code. Protected from direct push. |
| `dev` | Integration branch. Features are merged here before release. May break. |
| `feature/REQ-XX-short-desc` | Every feature / fix — separate branch from `dev`. |
| `hotfix/short-desc` | Urgent fix directly from `main`. |

### Commit Convention (Conventional Commits)

```
feat: добавил поиск по дате (REQ-42)
fix: исправил zIndex меню слэш-команд
refactor: вынес InlineSearch в отдельный компонент
[native] feat: добавил expo-document-picker
chore: обновил AGENTS.md
```

**Prefix `[native]` is mandatory** when any of these change:
- `app.json` / `eas.json`
- `package.json` (new native dependencies)
- `ios/` / `android/`
- Any file under `plugins/`

This signals: **EAS Build required**, OTA update is not enough.

### AI Agent Rules

1. **Before starting work** — check `git status`. If there are uncommitted changes, ask: "Commit current state as WIP?"
2. **After each completed feature** — `git add` + `git commit` with a meaningful message.
3. **Before complex refactoring** — make a checkpoint commit: `chore: checkpoint before header redesign`.
4. **If user says "rollback"** — use `git checkout` or `git revert`, never manual line-by-line rollback.
5. **No force-push** to `main` / `dev`.
6. **New features go on new branches:**
   - Each feature gets its own branch: `feat/{VERSION}-{short-desc}`.
   - Branch numbering follows release order (e.g., `feat/4.17.0-...`, `feat/4.17.1-...`, `feat/4.18.0-...`).
   - Create branch with `git checkout -b feat/X.Y.Z-description` before committing.
7. **When user says "закрывай фичу" (close the feature):**
   - Ensure you are on the feature branch.
   - Run `git add -A && git commit -m "feat: ..."` (or `fix:` / `refactor:` depending on the work).
   - Update `CHANGELOG.md` with a new entry describing what was done.
   - Commit message and CHANGELOG entry must reference any related REQ numbers.

### Rollback Policy

| Scenario | Command |
|----------|---------|
| Revert last commit | `git revert HEAD` |
| Rollback to stable state | `git checkout <commit-hash>` |
| See what changed | `git diff HEAD~1` |
| Restore specific file | `git checkout HEAD -- path/to/file` |

### Releases + EAS

- Release = tag `vX.Y.Z` on `main`.
- EAS Build is triggered only from tagged commits.
- JS-only fixes after release — via `expo-updates` (no new tag needed if no `[native]` changes).
