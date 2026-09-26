"use client";

import { LegalDocument } from "@/features/legal/LegalDocument";
import { COOKIE_POLICY } from "@/features/legal/cookies";

export default function CookiePolicyPage() {
  return (
    <LegalDocument
      docs={COOKIE_POLICY}
      currentHref="/cookies"
      showCookieSettings
    />
  );
}
