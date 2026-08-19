# Commit message conventions

The feedback loop is commit-driven. Status files are keyed by commit SHA. `git log` is the audit trail. Good commit messages matter more here than in a typical dev workflow.

## Format

**[Conventional Commits](https://www.conventionalcommits.org/) with ABAP-aware scopes:**

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type | Meaning |
|---|---|
| `feat` | New functionality (a new method, class, view) |
| `fix` | Bug fix |
| `refactor` | No behavior change; structure/cleanup |
| `docs` | Doc-only change (abapDoc comments, README) |
| `test` | Adds or modifies unit tests |
| `perf` | Performance optimisation |
| `style` | Formatting / whitespace / renames |
| `chore` | Tooling, build, package moves |
| `revert` | Reverts a previous commit |

### Scope

**The lowercase object name the change is rooted at.** One commit = one scope when possible. For multi-object changes, use the package name or leave scope empty.

Good examples:
- `feat(zcl_greetings): add farewell method`
- `fix(zcl_billing_agent): handle null item list`
- `refactor(zpkg_demo): move utility classes to sub-package`

### Subject line

- ≤ 72 chars
- Imperative mood: "add", not "added" or "adds"
- No trailing period
- Start lowercase (after the `type(scope):` prefix)

### Body (optional)

Explain **why**, not what. The diff shows what.

```
fix(zcl_greetings): correct escape in Turkish greeting

The | pipe character inside a string template was not escaped,
causing syntax error on systems with utf-8 encoding enforcement.
Switched to concatenation operator (&&) for safety.

Task: CR-12345
```

### Footer

- `Task: <ticket-id>` — link to Jira / SNOW / internal tracker.
- `Breaking-Change: <description>` — if the change breaks callers.
- `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` — optional attribution.

## Rules for the Git-mediated loop

### 1. Atomic commits
**One logical change per commit.** The status file reports per-commit; if the commit has a failed refactor and a working feature, the whole commit reports as FAIL and both changes need to be re-pushed to retry.

Bad:
```
feat: add farewell method and refactor hello
```

Good:
```
feat(zcl_greetings): add farewell method
refactor(zcl_greetings): extract locale helper
```

### 2. Don't squash merge-commits into the bridge path
The bridge pulls by SHA. Rewriting history after the bridge has processed a commit leaves orphan status files. It's harmless (they just sit in `.abapgit-status/`), but noisy.

**Rule:** if you're iterating with the bridge active, keep a linear history on the dev branch. Squash/rebase only before merging into `main`.

### 3. Include the trigger
If the commit was prompted by a failing previous commit, mention it:

```
fix(zcl_greetings): fix syntax error from a235f18

a235f18 failed activation because the string template was unescaped.
Switched to && concatenation.

Fixes: a235f18
```

`Fixes:` isn't a standard Conventional Commits footer, but the bridge doesn't parse it — it's for humans reading `git log`.

### 4. No secrets, ever
Commit hook scans for `password`, `token`, `secret`, common API-key patterns. If you committed one by mistake — don't push. Reset, remove, re-commit. Once pushed, assume leaked.

### 5. One branch per feature
The bridge's branch policy lives in `.abapgit-ai.yaml`:

```yaml
auto_activate_branches: [dev/*, feature/*]
syntax_only_branches: [main, release/*]
```

- `dev/<your-name>` or `feature/<ticket>` — branches that auto-activate
- `main`, `release/*` — syntax check only; human activates

Push to the right branch for the behaviour you want.

## Claude-specific guidance

- When asked to "push the change," default to `feat(...)` / `fix(...)` based on context. Ask the user only if unclear.
- If the user gave a Jira ticket in the conversation, include it as `Task: <id>` in the footer.
- Keep subject lines tight. "refactor(zcl_foo): clean up" is better than "refactor(zcl_foo): refactored the foo method to be cleaner and more maintainable for future changes".
- If the commit is a retry of a previous failed commit, mention the previous SHA in the body — helps both humans and Claude trace the iteration chain.

## Example sequence

```
* feat(zcl_greetings): add farewell method           [fcb0632]
|
* fix(zcl_greetings): fix Turkish string escape      [a235f18]
| |
| Fixes: fcb0632
|
* test(zcl_greetings): add unit tests for farewell   [7a1b2c3]
```

Every line is a pull/check cycle for the SAP-side bridge. Three commits = three iterations.
