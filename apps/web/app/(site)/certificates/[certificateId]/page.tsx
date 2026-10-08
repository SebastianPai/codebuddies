import Link from "next/link";
import QRCode from "qrcode";
import { Award, Linkedin, ShieldAlert, ShieldCheck } from "lucide-react";
import { getApiUrl } from "@/config/env";
import {
  CertificateDownloadButton,
  type PublicCertificate,
} from "@/features/certificates/components/certificate-download-button";
import { CertificateVerifiedTracker } from "@/features/certificates/components/certificate-verified-tracker";
import { CertificateSheet } from "@/features/certificates/components/certificate-sheet";

interface CertificatePageProps {
  params: Promise<{ certificateId: string }>;
}

async function fetchCertificate(id: string): Promise<PublicCertificate | null> {
  try {
    const res = await fetch(`${getApiUrl()}/certificates/verify/${id}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicCertificate;
  } catch {
    return null;
  }
}

function buildLinkedInAddToProfileUrl(certificate: PublicCertificate): string {
  const issued = new Date(certificate.issuedAt);
  const params = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: certificate.course,
    organizationName: certificate.academy,
    issueYear: String(issued.getUTCFullYear()),
    issueMonth: String(issued.getUTCMonth() + 1),
    certUrl: certificate.verificationUrl,
    certId: certificate.certificateNumber,
  });
  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function CertificateField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-widest text-[rgb(var(--secondary-text))]">{label}</dt>
      <dd className="mt-1 wrap-break-word font-bold">{value}</dd>
    </div>
  );
}

// FE2/SEO7: esta página era 100% client-side (fetch en useEffect), así que
// nombre/curso/fecha — el contenido que le da valor de indexación a una
// página de verificación pública — nunca llegaba en el HTML inicial. Ahora
// se fetchea server-side (el layout hermano hace el mismo fetch para
// generateMetadata/JSON-LD; Next dedupea ambos por URL) y hasta el QR se
// genera server-side con la misma librería `qrcode` (soporta Node, no solo
// browser). Lo único que queda client-side es el botón de descarga de PDF
// (jspdf necesita el navegador).
export default async function PublicCertificatePage({ params }: CertificatePageProps) {
  const { certificateId } = await params;
  const certificate = await fetchCertificate(certificateId);

  if (!certificate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--background))] px-4 text-center">
        <div className="max-w-lg border-4 border-red-500 bg-red-500/10 p-8">
          <h1 className="text-3xl font-black uppercase text-red-200">
            Certificado inválido
          </h1>
          <p className="mt-3 text-red-100">
            No pudimos verificar este certificado. Revisá el enlace e intentá de nuevo.
          </p>
        </div>
      </div>
    );
  }

  const qrDataUrl = await QRCode.toDataURL(certificate.verificationUrl, {
    margin: 1,
    width: 240,
  }).catch(() => null);

  return (
    <div className="mx-auto max-w-6xl py-6 sm:py-10 print:max-w-none print:p-0">
      <CertificateVerifiedTracker />

      <div className="mb-5 flex flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
        {certificate.revoked ? (
          <div className="flex items-start gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            <ShieldAlert size={20} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-black">Este certificado fue revocado</p>
              {certificate.revokedReason && <p className="mt-1 opacity-90">{certificate.revokedReason}</p>}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            <ShieldCheck size={20} className="shrink-0" />
            <p>
              <b>{certificate.valid ? "Certificado auténtico" : "Certificado inválido"}</b>
              <span className="opacity-80"> · emitido por CodeBuddies · N.º {certificate.certificateNumber}</span>
            </p>
          </div>
        )}
      </div>

      <CertificateSheet certificate={certificate} qrDataUrl={qrDataUrl} />

      <div className="mt-6 grid gap-3 print:hidden sm:flex sm:flex-wrap sm:justify-center">
        <CertificateDownloadButton certificate={certificate} qrDataUrl={qrDataUrl} />
        {!certificate.revoked && (
          <a
            href={buildLinkedInAddToProfileUrl(certificate)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0a66c2] px-6 py-3 text-sm font-bold text-white transition hover:brightness-110"
          >
            <Linkedin size={16} /> Agregar a LinkedIn
          </a>
        )}
        <Link
          href="/certificates"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[rgb(var(--border))] px-6 py-3 text-sm font-bold text-[rgb(var(--text))] transition hover:border-[rgb(var(--primary)/0.6)]"
        >
          <Award size={16} /> Mis certificados
        </Link>
      </div>

      <dl className="mx-auto mt-8 grid max-w-3xl gap-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 text-sm text-[rgb(var(--text))] print:hidden sm:grid-cols-2">
        <CertificateField label="Otorgado a" value={certificate.name} />
        <CertificateField label="Curso" value={certificate.course} />
        <CertificateField label="Fecha de emisión" value={formatDate(certificate.issuedAt)} />
        <CertificateField label="Código de verificación" value={certificate.verificationCode} />
      </dl>
    </div>
  );
}
