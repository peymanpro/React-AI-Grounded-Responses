# Release Process

## Automatic releases

The Release workflow is the automated publishing entry point. It runs type checking, unit tests, the package build, and npm package verification before a release is published.

Qualifying commits merged into `main` are analyzed by semantic-release:

- `feat:` creates a minor release.
- `fix:` and `perf:` create a patch release.
- A breaking change, such as `feat!:` or a `BREAKING CHANGE` footer, creates a major release.
- `docs:`, `test:`, `ci:`, `chore:`, and `refactor:` do not create releases by default.

The workflow updates `package.json` and `CHANGELOG.md`, creates the version tag and GitHub Release, and publishes to npm using OIDC Trusted Publishing. Use Conventional Commit titles for pull requests and commits so release intent is explicit. No long-lived npm write token is stored in GitHub Actions.

## Initial publication — completed

The initial public version, `react-ai-grounded-responses@0.1.0`, has been published to npm. The corresponding GitHub Release is [`v0.1.0`](https://github.com/peymanpro/React-AI-Grounded-Responses/releases/tag/v0.1.0).

The npm Trusted Publisher is configured for:

- Provider: GitHub Actions
- Owner: `peymanpro`
- Repository: `React-AI-Grounded-Responses`
- Workflow filename: `release.yml`
- Environment: none
- Allowed publishing action: direct `npm publish`

npm reports the Trusted Publisher status as **Valid**. The placeholder version `0.0.0` was used only to create the npm package and configure publishing. Do not run the `initial_release` path again; use the normal automated release workflow for future versions.

## Security and troubleshooting

Trusted Publishing uses short-lived OIDC credentials instead of a stored npm token. If a future release fails, verify the owner, repository, workflow filename, and allowed publishing action in npm, then inspect the Release workflow logs.

Never attempt to overwrite an already published version. Recover the release state or publish a new semantic version. Documentation-only commits normally do not trigger a package release; that behavior is expected.
