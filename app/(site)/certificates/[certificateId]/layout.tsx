import type { Metadata } from "next";
import { getApiUrl } from "@/config/env";

interface CertificateLayoutProps {
  children: React.ReactNode;
  params: Promise<{ certificateId: string }>;
}

interface CertificateMetadataPayload {
  certificateNumber?: string;
  verificationUrl?: string;
  name?: string;
  course?: string;
  academy?: string;
  issuedAt?: string;
  valid?: boolean;
  revoked?: boolean;
}

async function fetchCertificate(
  id: string,
): Promise<CertificateMetadataPayload | null> {
  try {
    const res = await fetch(`${getApiUrl()}/certificates/verify/${id}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as CertificateMetadataPayload;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: CertificateLayoutProps): Promise<Metadata> {
  const { certificateId } = await params;
  const certificate = await fetchCertificate(certificateId);

  if (!certificate?.valid || certificate.revoked) {
    return { title: "Verificación de certificado" };
  }

  const title = `Certificado verificado: ${certificate.name} — ${certificate.course}`;
  const description = `${certificate.name} completó "${certificate.course}" y recibió un certificado verificable emitido por ${certificate.academy ?? "CodeBuddies"}.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "profile" },
    twitter: { card: "summary", title, description },
  };
}

export default async function CertificateLayout({ children, params }: CertificateLayoutProps) {
  const { certificateId } = await params;
  const certificate = await fetchCertificate(certificateId);

  // JSON-LD renderizado server-side (SEO/rich results, NF36): un
  // EducationalOccupationalCredential solo cuando el certificado existe y
  // no fue revocado — no tiene sentido que un buscador indexe como legítimo
  // algo que la página misma va a mostrar como revocado.
  const jsonLd =
    certificate?.valid && !certificate.revoked
      ? {
          "@context": "https://schema.org",
          "@type": "EducationalOccupationalCredential",
          name: certificate.course,
          credentialCategory: "certificate",
          recognizedBy: {
            "@type": "Organization",
            name: certificate.academy ?? "CodeBuddies",
          },
          about: {
            "@type": "Person",
            name: certificate.name,
          },
          dateCreated: certificate.issuedAt,
          identifier: certificate.certificateNumber,
          url: certificate.verificationUrl,
        }
      : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger -- JSON.stringify de datos propios del backend, no HTML de usuario
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
