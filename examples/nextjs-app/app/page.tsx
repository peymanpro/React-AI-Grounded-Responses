import {
  createGroundedResponseLedger,
  fingerprintText,
  type Source,
} from "react-ai-grounded-responses";
import { GroundedExample } from "./grounded-example";

export default function Page() {
  const source: Source = {
    id: "refund-policy",
    title: "Refund policy",
    uri: "https://example.com/refunds",
    text: "Customers may request a refund within 14 days of purchase.",
    version: "example-v1",
  };
  const response = "Customers can request a refund within 14 days of purchase.";
  const claimText = "within 14 days";
  const responseStart = response.indexOf(claimText);
  const sourceStart = source.text.indexOf(claimText);

  const ledger = createGroundedResponseLedger({
    text: response,
    sources: [source],
  });
  ledger.upsertClaim({
    id: "refund-window",
    text: claimText,
    responseRange: {
      start: responseStart,
      end: responseStart + claimText.length,
    },
    evidence: [
      {
        sourceId: source.id,
        start: sourceStart,
        end: sourceStart + claimText.length,
        quote: claimText,
        sourceVersion: source.version,
        sourceFingerprint: fingerprintText(source.text),
      },
    ],
  });

  return (
    <main className="page">
      <p className="eyebrow">NEXT.JS APP ROUTER EXAMPLE</p>
      <h1>Make AI answers inspectable.</h1>
      <p className="intro">
        The server builds a serializable evidence snapshot. The client lets you
        select the claim and inspect its source.
      </p>
      <GroundedExample source={source} snapshot={ledger.snapshot()} />
    </main>
  );
}
