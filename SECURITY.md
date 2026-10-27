# Security Policy

## Supported versions

The library is in Alpha. Security and correctness fixes target the latest repository-supported version.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use GitHub's private vulnerability reporting for this repository, or contact the maintainer through the GitHub profile if private reporting is unavailable.

Include the affected version, reproduction steps, impact, and a suggested mitigation when possible. Do not include real secrets, customer data, or confidential source documents in reports.

## Security considerations

- AI output and provider-supplied citations are untrusted input.
- A valid structural status does not prove that the cited text entails the claim.
- Source fingerprints are non-cryptographic and must not be used for authentication or security decisions.
- Do not pass confidential text to a provider unless the application's data-handling rules allow it.
- Keep provider credentials out of source control, examples, errors, and logs.
- Validate source URLs before rendering or opening them in your application.
