"use client";

import { useEffect } from "react";
import { captureCampaign } from "../../utils/campaign";

// Guarda el código de campaña (utm_*) de la primera visita. Ver utils/campaign.ts.
export function CampaignCapture() {
  useEffect(() => {
    captureCampaign(window.location.search);
  }, []);
  return null;
}
