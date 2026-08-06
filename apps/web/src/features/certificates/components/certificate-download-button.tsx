"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { useTranslation } from "../../../i18n/useTranslation";

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

async function downloadCertificatePdf(
  certificate: PublicCertificate,
  qrDataUrl: string | null,
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setDrawColor(0);
  doc.setLineWidth(3);
  doc.rect(24, 24, pageWidth - 48, pageHeight - 48);
  doc.setLineWidth(1);
  doc.rect(40, 40, pageWidth - 80, pageHeight - 80);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("CODEBUDDIES CERTIFICATE", pageWidth / 2, 90, { align: "center" });

  doc.setFontSize(30);
  doc.text("CERTIFICADO", pageWidth / 2, 130, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("SE OTORGA A", pageWidth / 2, 180, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text(certificate.name, pageWidth / 2, 215, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("POR COMPLETAR SATISFACTORIAMENTE", pageWidth / 2, 255, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(certificate.course, pageWidth / 2, 285, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const issued = new Intl.DateTimeFormat("es", { day: "2-digit", month: "long", year: "numeric" }).format(
    new Date(certificate.issuedAt),
  );
  doc.text(`Academia: ${certificate.academy}`, 70, pageHeight - 90);
  doc.text(`Fecha de emisión: ${issued}`, 70, pageHeight - 74);
  doc.text(`Certificado N°: ${certificate.certificateNumber}`, 70, pageHeight - 58);
  doc.text(`Código de verificación: ${certificate.verificationCode}`, 70, pageHeight - 42);

  if (qrDataUrl) {
    doc.addImage(qrDataUrl, "PNG", pageWidth - 150, pageHeight - 150, 90, 90);
    doc.setFontSize(8);
    doc.text("Verificar en línea", pageWidth - 105, pageHeight - 52, { align: "center" });
  }

  doc.save(`certificado-${certificate.certificateNumber}.pdf`);
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
      className="inline-flex items-center justify-center gap-2 bg-black px-6 py-3 font-black uppercase text-white disabled:opacity-50"
    >
      {isGeneratingPdf ? t("common.loading") : t("site.downloadPdf")} <Download size={16} />
    </button>
  );
}
