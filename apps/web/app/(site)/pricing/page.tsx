import { headers } from "next/headers";
import { PricingPageClient } from "../../../src/features/pricing/components/PricingPageClient";

const FAKE_COUNTRY_CODES = new Set(["OTHERS", "UNKNOWN", "XX", "ZZ", "T1"]);

export default async function PricingPage() {
  const headerList = await headers();
  // x-vercel-ip-country es el ejemplo estandar de header de geo-IP server-
  // side. Si no viene (por ejemplo, fuera de la red de Vercel), no se manda
  // ningun country code a Paddle.PricePreview() -- deja que Paddle
  // auto-detecte el pais del visitante en vez de asumir uno falso.
  const rawCountry = headerList.get("x-vercel-ip-country");
  const countryCode =
    rawCountry && !FAKE_COUNTRY_CODES.has(rawCountry.toUpperCase())
      ? rawCountry.toUpperCase()
      : undefined;

  return <PricingPageClient countryCode={countryCode} />;
}
