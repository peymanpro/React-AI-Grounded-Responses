# Contributing

Thank you for helping improve React AI Grounded Responses.

## Before opening a pull request

1. Keep each branch and pull request focused.
2. Prefer small commits with Conventional Commit messages.
3. Add or update tests for behavioral changes.
4. Update README.md or docs when public behavior changes.
5. Run npm run typecheck, npm test, npm run build, and npm run check:package.
6. Do not commit credentials, confidential source text, generated dist output, or local environment files.

## Design principles

- Keep the core independent from React, browser globals, model providers, and retrieval backends.
- Keep the React adapter optional and styling-agnostic.
- Do not treat model output or provider metadata as trusted until validated.
- Distinguish structural evidence integrity from semantic entailment.
- Make offset units explicit and reject invalid ranges instead of guessing.
- Preserve deterministic behavior and test streaming chunk boundaries.
- Keep React and Next.js compatibility claims backed by tests and runnable examples.

## Commit conventions

Use short imperative Conventional Commit messages, for example:

- feat(core): add source fingerprint checks
- fix(react): preserve hook order
- test(core): cover code-point offsets
- docs: explain Next.js server snapshots

A PR that changes behavior should include focused tests and a concise rationale.
