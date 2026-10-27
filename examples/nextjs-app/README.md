# Next.js App Router Example

This example shows how to use React AI Grounded Responses from a Next.js App Router application.

## Run locally

Build the library from the repository root first:

```bash
npm install
npm run build
```

Then install and run the example:

```bash
cd examples/nextjs-app
npm install
npm run dev
```

Open the local development URL printed by Next.js.

## What it demonstrates

- A Server Component creates the response ledger and passes its serializable snapshot to a Client Component.
- The client lets a user select the claim in the answer.
- The source panel highlights the exact evidence span for the selected claim.
- The evidence integrity status is shown separately from any semantic truth judgment.

The example uses deterministic local source data and requires no AI provider key or network request to generate the response.
