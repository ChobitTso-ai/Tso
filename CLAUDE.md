# CLAUDE.md

This file documents the structure, conventions, and workflows for the **Tso** project. It is intended to guide AI assistants (Claude, Copilot, Codex, etc.) working in this repository.

---

## Project Overview

**Tso** is a project repository maintained by ChobitTso-ai. The repository was initialized to explore and test AI coding assistant capabilities (Codex, Copilot, Claude Code).

- **Remote:** `http://local_proxy@127.0.0.1:43585/git/ChobitTso-ai/Tso`
- **Primary language(s):** TBD as development progresses
- **Current state:** Early-stage / bootstrapped — no application code yet

---

## Repository Structure

```
Tso/
├── CLAUDE.md        # AI assistant guidance (this file)
└── README.md        # Project description
```

As the project grows, this section should be updated to reflect new directories and their purposes.

---

## Git Workflow

### Branches

| Branch | Purpose |
|--------|---------|
| `main` | Stable, production-ready code |
| `claude/<task>-<id>` | AI-generated feature/fix branches |

### Development Rules

1. **Never push directly to `main`** without an explicit user request.
2. AI assistants should always develop on the designated feature branch provided at session start.
3. Use `git push -u origin <branch-name>` when pushing a branch for the first time.
4. On push failure due to network errors, retry up to 4 times with exponential backoff (2s, 4s, 8s, 16s).
5. Do not create pull requests unless the user explicitly asks.

### Commit Messages

Write clear, imperative-style commit messages:

```
# Good
add user authentication module
fix null pointer in payment handler
refactor database connection pooling

# Bad
fixed stuff
WIP
updates
```

Include a blank line before any body text. Keep the subject line under 72 characters.

---

## Development Conventions

Since the codebase is just starting, these are the baseline conventions to follow when code is added:

### General

- Prefer editing existing files over creating new ones.
- Do not add features, comments, or abstractions beyond what is explicitly requested.
- Do not add error handling for scenarios that cannot occur.
- Never introduce security vulnerabilities (SQL injection, XSS, command injection, etc.).

### Code Style

- Follow the dominant style already present in each file.
- Do not reformat code unrelated to the task at hand.
- Add comments only where logic is non-obvious.

### Testing

- Add tests when introducing new functionality (if a test framework is present).
- Run existing tests before committing to verify nothing is broken.
- Do not remove or skip tests to make a build pass.

### Security

- Never commit secrets, credentials, API keys, or `.env` files.
- Validate all data at system boundaries (user input, external APIs).
- Trust internal framework guarantees; do not add redundant internal validation.

---

## Commands

> Update this section as build/test infrastructure is added.

Once a technology stack is established, document commands here:

```bash
# Install dependencies
# <command here>

# Run tests
# <command here>

# Lint / format
# <command here>

# Build
# <command here>
```

---

## AI Assistant Guidelines

### What to do

- Read files before editing them.
- Prefer the smallest change that satisfies the requirement.
- Ask for clarification when requirements are genuinely ambiguous.
- Confirm with the user before taking destructive or irreversible actions (force push, file deletion, dropping data, etc.).

### What NOT to do

- Do not push to `main` without explicit permission.
- Do not create pull requests unless asked.
- Do not refactor, reformat, or "clean up" code that was not part of the task.
- Do not add speculative features, helpers, or abstractions for hypothetical future use.
- Do not retry a denied tool call with the same parameters.
- Do not guess or generate URLs — only use URLs provided by the user or found in local files.

### Risky actions requiring user confirmation

Before executing any of the following, pause and confirm with the user:

- `git push --force` or `git reset --hard`
- Deleting files or directories
- Modifying CI/CD pipelines
- Any action visible to others (PR comments, issue replies, external service calls)
- Uploading content to third-party services

---

## Updating This File

When the project evolves (new stack, new tooling, new conventions), update this file to reflect the current state. Specifically keep these sections current:

- **Repository Structure** — add/remove directories as they appear
- **Commands** — fill in actual build/test/lint commands
- **Technology Stack** — document the chosen languages and frameworks

This file was last updated: 2026-04-09
