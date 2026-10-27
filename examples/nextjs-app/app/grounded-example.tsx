'use client';

import { useState } from "react";
import {
  ClaimIntegrity,
  EvidencePanel,
  GroundedResponse,
} from "react-ai-grounded-responses/react";
import type {
  GroundedResponseSnapshot,
  Source,
} from "react-ai-grounded-responses";

interface GroundedExampleProps {
  readonly source: Source;
  readonly snapshot: GroundedResponseSnapshot;
}

export function GroundedExample({ source, snapshot }: GroundedExampleProps) {
  const [selectedClaimId, setSelectedClaimId] = useState<string | undefined>(
    snapshot.claims[0]?.claim.id,
  );
  const selected = snapshot.claims.find(
    (record) => record.claim.id === selectedClaimId,
  );

  return (
    <section className="demo">
      <h2>AI response</h2>
      <GroundedResponse
        snapshot={snapshot}
        onClaimSelect={(claim) => setSelectedClaimId(claim.id)}
      />
      <div className="status-row">
        <span>Evidence integrity</span>
        <ClaimIntegrity status={selected?.validation.status ?? "pending"} />
      </div>
      <EvidencePanel
        source={source}
        evidence={selected?.claim.evidence ?? []}
      />
    </section>
  );
}
