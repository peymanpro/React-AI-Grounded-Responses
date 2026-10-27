# Release Process

## Automatic releases

The Release workflow is the only automated publishing entry point. It runs type checking, unit tests, package build, and npm package verification before a release is created.

After the initial release, qualifying commits merged into main are analyzed by semantic-release:

- feat: creates a minor release.
- fix: and perf: create a patch release.
- A breaking change, such as feat!: or a BREAKING CHANGE footer, creates a major release.
- docs:, test:, ci:, chore:, and refactor: do not create releases by default.

The workflow updates package.json and CHANGELOG.md, creates the version tag and GitHub Release, and publishes to npm using OIDC Trusted Publishing. Use Conventional Commit titles for pull requests and commits so release intent is explicit.

## One-time initial npm publication

The repository is prepared for automated OIDC publishing, but an initial release cannot be completed by GitHub configuration alone. npm Trusted Publishing must be configured for an existing package, and package-name availability must be checked first.

### 1. Confirm package-name availability

Check the public npm registry for react-ai-grounded-responses and confirm that the name is available to your account. Do not run a placeholder tool against a package name already owned by someone else.

### 2. Create the temporary package placeholder

After confirming availability, authenticate to npm from your own machine and review the source of the trusted-publishing bootstrap utility before running it:

```bash
npx setup-npm-trusted-publish react-ai-grounded-responses
```

The tool's default behavior may publish a temporary 0.0.0 placeholder so the package settings page becomes available. This placeholder is not the library. Review the current utility documentation and confirm the exact effect before authorizing publication.

### 3. Configure npm Trusted Publishing

Open the package settings in npm and add a Trusted Publisher with these values:

- Provider: GitHub Actions
- Owner: peymanpro
- Repository: React-AI-Grounded-Responses
- Workflow filename: release.yml
- Environment: leave empty unless you intentionally configure the same GitHub environment
- Publishing action: direct npm publish, as supported by the current npm interface

Do not create a long-lived npm write token in GitHub Actions. The release workflow requests OIDC identity through the id-token permission.

### 4. Run the initial release

The first push of the Release workflow to main initializes a temporary v0.0.0 baseline tag and intentionally skips publishing. Once the npm package and Trusted Publisher are configured:

1. Open GitHub Actions on this repository.
2. Select the Release workflow and choose Run workflow on main.
3. Enable the initial_release input and run it once.
4. The workflow verifies the package, publishes version 0.1.0, creates tag v0.1.0 and a GitHub Release, and removes the temporary v0.0.0 tag.
5. Verify the published files and package provenance in npm.

The initial-release path is for the first real release only. Do not select it again after 0.1.0 exists.

### Security and troubleshooting

Trusted Publishing uses short-lived OIDC credentials instead of a stored npm token. If publishing fails, verify the exact owner, repository, and workflow filename in npm, then inspect the Release workflow logs. Never overwrite an already published version; recover release state or publish a new semantic version.

Documentation-only commits should not release a new package version. If no release is created after a docs-only change, that is expected.
