import { Cormorant_Garamond, EB_Garamond } from "next/font/google";
import type { PublicCertificate } from "./certificate-download-button";

// Estilo diploma clásico (tipo universidades británicas): papel marfil,
// tinta azul marino, filetes dorados y tipografía serif. Todo el tamaño se
// define en unidades del contenedor (cqw), así el certificado se escala
// como una imagen y se ve idéntico en móvil, tablet y PC.
const display = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600", "700"], style: ["normal", "italic"] });
const body = EB_Garamond({ subsets: ["latin"], weight: ["400", "500"], style: ["normal", "italic"] });

export const CERT_COLORS = {
  paper: "#fbf7ee",
  ink: "#1b2a4a",
  gold: "#a8832f",
  goldLight: "#d8b75f",
  muted: "#5b6478",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
}

function Corner({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`absolute h-[9cqw] w-[9cqw] ${className}`} aria-hidden>
      <path d="M4 60 V4 H60" fill="none" stroke={CERT_COLORS.gold} strokeWidth="2.2" />
      <path d="M12 44 V12 H44" fill="none" stroke={CERT_COLORS.gold} strokeWidth="1.2" />
      <circle cx="12" cy="12" r="4" fill={CERT_COLORS.gold} />
      <path d="M20 20 q14 2 16 16 q-14 -2 -16 -16z" fill={CERT_COLORS.goldLight} opacity="0.8" />
    </svg>
  );
}

function Seal() {
  const points = Array.from({ length: 24 }, (_, i) => {
    const angle = (i / 24) * Math.PI * 2;
    const r = i % 2 === 0 ? 50 : 44;
    return `${50 + r * Math.cos(angle)},${50 + r * Math.sin(angle)}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 100" className="h-[12cqw] w-[12cqw]" aria-hidden>
      <defs>
        <radialGradient id="seal-gold" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#f3dc93" />
          <stop offset="55%" stopColor={CERT_COLORS.goldLight} />
          <stop offset="100%" stopColor={CERT_COLORS.gold} />
        </radialGradient>
        <path id="seal-text" d="M50 50 m-30 0 a30 30 0 1 1 60 0 a30 30 0 1 1 -60 0" />
      </defs>
      <polygon points={points} fill="url(#seal-gold)" />
      <circle cx="50" cy="50" r="38" fill="none" stroke={CERT_COLORS.ink} strokeWidth="1" opacity="0.5" />
      <circle cx="50" cy="50" r="24" fill="none" stroke={CERT_COLORS.ink} strokeWidth="0.8" opacity="0.5" />
      <text fontSize="7.2" fill={CERT_COLORS.ink} letterSpacing="1.6" fontWeight="700">
        <textPath href="#seal-text">CODEBUDDIES · VERIFIED · CODEBUDDIES · VERIFIED ·</textPath>
      </text>
      <text x="50" y="55" textAnchor="middle" fontSize="15" fontWeight="700" fill={CERT_COLORS.ink}>
        CB
      </text>
    </svg>
  );
}

export function CertificateSheet({
  certificate,
  qrDataUrl,
}: {
  certificate: PublicCertificate;
  qrDataUrl: string | null;
}) {
  return (
    <div className="[container-type:inline-size]">
      <article
        className={`${body.className} relative aspect-[1.414/1] w-full overflow-hidden rounded-[0.6cqw] shadow-[0_30px_80px_rgba(15,23,42,0.35)]`}
        style={{ background: CERT_COLORS.paper, color: CERT_COLORS.ink }}
      >
        {/* textura de papel muy suave */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 15%, rgba(168,131,47,0.10), transparent 45%), radial-gradient(circle at 85% 90%, rgba(27,42,74,0.08), transparent 45%)",
          }}
        />
        {/* marco doble */}
        <div aria-hidden className="absolute inset-[2.2cqw] border-[0.35cqw]" style={{ borderColor: CERT_COLORS.ink }} />
        <div aria-hidden className="absolute inset-[3.1cqw] border-[0.12cqw]" style={{ borderColor: CERT_COLORS.gold }} />
        <Corner className="left-[2.2cqw] top-[2.2cqw]" />
        <Corner className="right-[2.2cqw] top-[2.2cqw] -scale-x-100" />
        <Corner className="bottom-[2.2cqw] left-[2.2cqw] -scale-y-100" />
        <Corner className="bottom-[2.2cqw] right-[2.2cqw] -scale-100" />

        {certificate.revoked && (
          <div aria-hidden className="absolute inset-0 z-20 flex items-center justify-center">
            <span className="-rotate-[18deg] border-[0.5cqw] border-red-700/70 px-[3cqw] py-[1cqw] text-[8cqw] font-black uppercase tracking-[0.2em] text-red-700/60">
              Revocado
            </span>
          </div>
        )}

        <div className="relative z-10 flex h-full flex-col items-center px-[9cqw] pb-[6cqw] pt-[6.5cqw] text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/robot-head.png" alt="" className="h-[5.2cqw] w-auto opacity-90" />
          <p className="mt-[1cqw] text-[1.25cqw] font-medium uppercase tracking-[0.5em]" style={{ color: CERT_COLORS.gold }}>
            CodeBuddies Academy
          </p>

          <h1 className={`${display.className} mt-[1.6cqw] text-[5.2cqw] font-semibold leading-none tracking-[0.04em]`}>
            Certificado de finalización
          </h1>
          <div aria-hidden className="mt-[1.2cqw] flex items-center gap-[1cqw]">
            <span className="h-px w-[10cqw]" style={{ background: CERT_COLORS.gold }} />
            <span className="h-[0.7cqw] w-[0.7cqw] rotate-45" style={{ background: CERT_COLORS.gold }} />
            <span className="h-px w-[10cqw]" style={{ background: CERT_COLORS.gold }} />
          </div>

          <p className="mt-[2.4cqw] text-[1.7cqw] italic" style={{ color: CERT_COLORS.muted }}>
            Se certifica que
          </p>
          <p className={`${display.className} mt-[0.6cqw] max-w-full truncate text-[6.4cqw] font-semibold italic leading-[1.1]`}>
            {certificate.name}
          </p>
          <span aria-hidden className="mt-[0.4cqw] h-px w-[46cqw]" style={{ background: CERT_COLORS.ink, opacity: 0.35 }} />
          <p className="mt-[1.8cqw] text-[1.7cqw] italic" style={{ color: CERT_COLORS.muted }}>
            ha completado satisfactoriamente el curso
          </p>
          <p className={`${display.className} mt-[0.6cqw] line-clamp-2 max-w-[70cqw] text-[3.6cqw] font-bold leading-[1.15]`}>
            {certificate.course}
          </p>

          <div className="mt-auto grid w-full grid-cols-3 items-end gap-[3cqw]">
            <div className="text-left">
              <p className={`${display.className} text-[2.4cqw] italic leading-none`}>CodeBuddies</p>
              <span aria-hidden className="mt-[0.6cqw] block h-px w-full" style={{ background: CERT_COLORS.ink }} />
              <p className="mt-[0.5cqw] text-[1.15cqw] uppercase tracking-[0.18em]" style={{ color: CERT_COLORS.muted }}>
                Dirección académica
              </p>
            </div>
            <div className="flex justify-center">
              <Seal />
            </div>
            <div className="flex items-end justify-end gap-[1.4cqw] text-right">
              <div>
                <p className="whitespace-nowrap text-[1.5cqw] font-medium">{formatDate(certificate.issuedAt)}</p>
                <span aria-hidden className="mt-[0.6cqw] block h-px w-full" style={{ background: CERT_COLORS.ink }} />
                <p className="mt-[0.5cqw] text-[1.15cqw] uppercase tracking-[0.18em]" style={{ color: CERT_COLORS.muted }}>
                  Fecha de emisión
                </p>
                <p className="mt-[0.8cqw] font-mono text-[1cqw]" style={{ color: CERT_COLORS.muted }}>
                  N.º {certificate.certificateNumber}
                </p>
              </div>
              {qrDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- data URL
                <img src={qrDataUrl} alt="Código QR de verificación" className="h-[8cqw] w-[8cqw]" />
              )}
            </div>
          </div>
          <p className="mt-[1.6cqw] text-[0.95cqw] tracking-wide" style={{ color: CERT_COLORS.muted }}>
            Verificable en {certificate.verificationUrl.replace(/^https?:\/\//, "")} · Código {certificate.verificationCode}
          </p>
        </div>
      </article>
    </div>
  );
}
