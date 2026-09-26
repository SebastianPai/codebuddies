"use client";

import { LegalDocument } from "@/features/legal/LegalDocument";
import { PRIVACY_POLICY } from "@/features/legal/privacy";

export default function PrivacyPage() {
  return (
    <LegalDocument
      docs={PRIVACY_POLICY}
      currentHref="/privacy"
    />
  );
}
