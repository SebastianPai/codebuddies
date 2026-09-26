"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { useTranslation } from "../../../i18n/useTranslation";
import { trackToolAction } from "../../../../components/analytics/tool-tracking";

export interface PublicCertificate {
  certificateId: string;
  certificateNumber: string;
  verificationCode: string;
  verificationUrl: string;
  name: string;
  course: string;
  academy: string;
  issuedAt: string;
  valid: boolean;
  revoked: boolean;
  revokedAt: string | null;
  revokedReason: string | null;
}

async function imageToDataUrl(src: string): Promise<string | null> {
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Mismo diseño que <CertificateSheet>: diploma clásico en A4 horizontal con
// papel marfil, tinta azul marino, filetes dorados y tipografía serif.
async function downloadCertificatePdf(
  certificate: PublicCertificate,
  qrDataUrl: string | null,
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const INK: [number, number, number] = [27, 42, 74];
  const GOLD: [number, number, number] = [168, 131, 47];
  const MUTED: [number, number, number] = [91, 100, 120];
  const cx = W / 2;

  // papel
  doc.setFillColor(251, 247, 238);
  doc.rect(0, 0, W, H, "F");

  // marco doble + esquinas
  doc.setDrawColor(...INK);
  doc.setLineWidth(3);
  doc.rect(26, 26, W - 52, H - 52);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1);
  doc.rect(36, 36, W - 72, H - 72);
  const corner = (x: number, y: number, dx: number, dy: number) => {
    doc.setLineWidth(1.6);
    doc.line(x, y, x + 46 * dx, y);
    doc.line(x, y, x, y + 46 * dy);
    doc.setLineWidth(0.8);
    doc.line(x + 8 * dx, y + 8 * dy, x + 34 * dx, y + 8 * dy);
    doc.line(x + 8 * dx, y + 8 * dy, x + 8 * dx, y + 34 * dy);
    doc.setFillColor(...GOLD);
    doc.circle(x + 8 * dx, y + 8 * dy, 2.6, "F");
  };
  corner(44, 44, 1, 1);
  corner(W - 44, 44, -1, 1);
  corner(44, H - 44, 1, -1);
  corner(W - 44, H - 44, -1, -1);

  // logo
  const logo = await imageToDataUrl("/robot-head.png");
  if (logo) doc.addImage(logo, "PNG", cx - 22, 58, 44, 40);

  doc.setTextColor(...GOLD);
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.setCharSpace(4);
  doc.text("CODEBUDDIES ACADEMY", cx, 114, { align: "center" });
  doc.setCharSpace(0);

  doc.setTextColor(...INK);
  doc.setFont("times", "bold");
  doc.setFontSize(34);
  doc.text("Certificado de finalización", cx, 152, { align: "center" });

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.8);
  doc.line(cx - 110, 166, cx - 10, 166);
  doc.line(cx + 10, 166, cx + 110, 166);
  doc.setFillColor(...GOLD);
  doc.triangle(cx, 161, cx + 5, 166, cx, 171, "F");
  doc.triangle(cx, 161, cx - 5, 166, cx, 171, "F");

  doc.setTextColor(...MUTED);
  doc.setFont("times", "italic");
  doc.setFontSize(14);
  doc.text("Se certifica que", cx, 200, { align: "center" });

  doc.setTextColor(...INK);
  doc.setFont("times", "bolditalic");
  let nameSize = 42;
  doc.setFontSize(nameSize);
  while (doc.getTextWidth(certificate.name) > W - 220 && nameSize > 22) {
    nameSize -= 2;
    doc.setFontSize(nameSize);
  }
  doc.text(certificate.name, cx, 244, { align: "center" });
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.5);
  doc.line(cx - 190, 256, cx + 190, 256);

  doc.setTextColor(...MUTED);
  doc.setFont("times", "italic");
  doc.setFontSize(14);
  doc.text("ha completado satisfactoriamente el curso", cx, 284, { align: "center" });

  doc.setTextColor(...INK);
  doc.setFont("times", "bold");
  doc.setFontSize(24);
  const courseLines = doc.splitTextToSize(certificate.course, W - 260) as string[];
  doc.text(courseLines.slice(0, 2), cx, 316, { align: "center" });

  // pie: firma, sello, fecha + QR
  const baseY = H - 108;
  doc.setFont("times", "italic");
  doc.setFontSize(18);
  doc.text("CodeBuddies", 96, baseY - 6);
  doc.setLineWidth(0.6);
  doc.line(90, baseY, 280, baseY);
  doc.setTextColor(...MUTED);
  doc.setFont("times", "normal");
  doc.setFontSize(9);
  doc.setCharSpace(1.5);
  doc.text("DIRECCIÓN ACADÉMICA", 90, baseY + 14);
  doc.setCharSpace(0);

  // sello
  doc.setFillColor(216, 183, 95);
  doc.circle(cx, baseY - 10, 38, "F");
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(2);
  doc.circle(cx, baseY - 10, 38, "S");
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.6);
  doc.circle(cx, baseY - 10, 30, "S");
  doc.setTextColor(...INK);
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.text("CB", cx, baseY - 6, { align: "center" });
  doc.setFontSize(6.5);
  doc.setCharSpace(1.2);
  doc.text("VERIFIED", cx, baseY + 6, { align: "center" });
  doc.setCharSpace(0);

  const issued = new Intl.DateTimeFormat("es", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(certificate.issuedAt),
  );
  const rightX = qrDataUrl ? W - 190 : W - 90;
  doc.setTextColor(...INK);
  doc.setFont("times", "normal");
  doc.setFontSize(13);
  doc.text(issued, rightX, baseY - 6, { align: "right" });
  doc.line(rightX - 170, baseY, rightX, baseY);
  doc.setTextColor(...MUTED);
  doc.setFontSize(9);
  doc.setCharSpace(1.5);
  doc.text("FECHA DE EMISIÓN", rightX, baseY + 14, { align: "right" });
  doc.setCharSpace(0);
  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  doc.text(`N.º ${certificate.certificateNumber}`, rightX, baseY + 28, { align: "right" });

  if (qrDataUrl) doc.addImage(qrDataUrl, "PNG", W - 170, baseY - 62, 78, 78);

  doc.setFont("times", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(
    `Verificable en ${certificate.verificationUrl.replace(/^https?:\/\//, "")} · Código ${certificate.verificationCode}`,
    cx,
    H - 50,
    { align: "center" },
  );

  if (certificate.revoked) {
    doc.setTextColor(185, 28, 28);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(70);
    doc.text("REVOCADO", cx, H / 2 + 20, { align: "center", angle: 18 });
  }

  doc.save(`certificado-${certificate.certificateNumber}.pdf`);

  // Único punto de salida exitosa de esta función (si algo de lo de arriba
  // tira, esta línea nunca se alcanza) -- cubre los dos call sites de abajo
  // (botón manual y auto-descarga por ?print=1) sin duplicar el tracking.
  trackToolAction("certificates", "certification", "download_pdf");
}

interface CertificateDownloadButtonProps {
  certificate: PublicCertificate;
  qrDataUrl: string | null;
}

// Único bit realmente client-side de la página de certificado: jspdf y la
// generación del PDF necesitan el navegador. El resto (nombre, curso,
// fechas, QR) ya llega server-rendered desde page.tsx.
export function CertificateDownloadButton({
  certificate,
  qrDataUrl,
}: CertificateDownloadButtonProps) {
  const t = useTranslation();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const printTriggered = useRef(false);

  useEffect(() => {
    if (printTriggered.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("print") === "1") {
      printTriggered.current = true;
      void downloadCertificatePdf(certificate, qrDataUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <button
      onClick={async () => {
        setIsGeneratingPdf(true);
        try {
          await downloadCertificatePdf(certificate, qrDataUrl);
        } finally {
          setIsGeneratingPdf(false);
        }
      }}
      disabled={isGeneratingPdf}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[rgb(var(--button))] px-6 py-3 text-sm font-bold text-[rgb(var(--button-text))] transition hover:brightness-110 disabled:opacity-50"
    >
      {isGeneratingPdf ? t("common.loading") : t("site.downloadPdf")} <Download size={16} />
    </button>
  );
}
