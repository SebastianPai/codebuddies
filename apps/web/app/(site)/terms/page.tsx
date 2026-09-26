"use client";

import { LegalDocument } from "@/features/legal/LegalDocument";
import { TERMS } from "@/features/legal/terms";

export default function TermsPage() {
  return (
    <LegalDocument
      docs={TERMS}
      currentHref="/terms"
    />
  );
}
