"use client";

import { LegalDocument } from "@/features/legal/LegalDocument";
import { REFUND_POLICY } from "@/features/legal/refunds";

export default function RefundPolicyPage() {
  return (
    <LegalDocument
      docs={REFUND_POLICY}
      currentHref="/refund-policy"
    />
  );
}
