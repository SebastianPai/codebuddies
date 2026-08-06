import Link from "next/link";
import QRCode from "qrcode";
import { Award, Linkedin, ShieldAlert, ShieldCheck } from "lucide-react";
import { getApiUrl } from "@/config/env";
import {
  CertificateDownloadButton,
  type PublicCertificate,
} from "@/features/certificates/components/certificate-download-button";

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
      <dt className="font-mono text-xs uppercase tracking-widest text-gray-500">{label}</dt>
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
    <div className="min-h-screen bg-[#f5f1e8] px-4 py-8 text-black print:bg-white print:p-0">
      <main className="mx-auto max-w-5xl border-8 border-black bg-white p-8 shadow-2xl print:border-4 print:shadow-none">
        <div className="border-2 border-black p-8 md:p-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="font-mono text-sm uppercase tracking-[0.35em]">CodeBuddies</p>
              <h1 className="mt-4 text-4xl md:text-6xl font-black uppercase">Certificado</h1>
            </div>
            {certificate.revoked ? (
              <div className="inline-flex items-center gap-2 self-start border-2 border-red-700 bg-red-50 px-4 py-2 font-black uppercase text-red-700">
                <ShieldAlert size={18} /> Revocado
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 self-start border-2 border-green-700 bg-green-50 px-4 py-2 font-black uppercase text-green-700">
                <ShieldCheck size={18} /> {certificate.valid ? "Válido" : "Inválido"}
              </div>
            )}
          </div>

          {certificate.revoked && (
            <div className="mt-6 border-2 border-red-700 bg-red-50 p-4 text-red-800 print:hidden">
              <p className="font-black uppercase">Este certificado fue revocado</p>
              {certificate.revokedReason && (
                <p className="mt-1 text-sm">{certificate.revokedReason}</p>
              )}
            </div>
          )}

          <section className="my-12 text-center">
            <Award className="mx-auto mb-6" size={72} />
            <p className="font-mono uppercase tracking-widest text-gray-600">Otorgado a</p>
            <h2 className="mt-4 text-4xl md:text-7xl font-black">{certificate.name}</h2>
            <p className="mt-8 font-mono uppercase tracking-widest text-gray-600">
              Por completar exitosamente
            </p>
            <h3 className="mt-4 text-3xl md:text-5xl font-black">{certificate.course}</h3>
          </section>

          <div className="grid gap-4 border-t-2 border-b-2 border-black py-6 md:grid-cols-[1fr_auto] md:items-center">
            <dl className="grid gap-4 md:grid-cols-2">
              <CertificateField label="Academia" value={certificate.academy} />
              <CertificateField
                label="Fecha de emisión"
                value={formatDate(certificate.issuedAt)}
              />
              <CertificateField
                label="Número de certificado"
                value={certificate.certificateNumber}
              />
              <CertificateField label="Código de verificación" value={certificate.verificationCode} />
            </dl>
            {qrDataUrl && (
              <div className="mx-auto flex flex-col items-center gap-1 md:mx-0">
                {/* eslint-disable-next-line @next/next/no-img-element -- data URL, no aplica next/image */}
                <img src={qrDataUrl} alt="Código QR de verificación" className="h-24 w-24" />
                <p className="text-[10px] font-mono uppercase text-gray-500">Escaneá para verificar</p>
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-col gap-3 print:hidden sm:flex-row sm:justify-center">
            <CertificateDownloadButton certificate={certificate} qrDataUrl={qrDataUrl} />
            {!certificate.revoked && (
              <a
                href={buildLinkedInAddToProfileUrl(certificate)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 border-2 border-[#0a66c2] bg-[#0a66c2] px-6 py-3 font-black uppercase text-white"
              >
                Agregar a LinkedIn <Linkedin size={16} />
              </a>
            )}
            <Link
              href="/certificates"
              className="inline-flex items-center justify-center gap-2 border-2 border-black px-6 py-3 font-black uppercase"
            >
              Mis certificados
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
