"use client";

import { useEffect, useRef, useState } from "react";
import { sileo } from "sileo";
import { Bomb } from "lucide-react";
import { Company } from "./types";
import { deleteCodeStudioCompany } from "../../network/codestudio";
import Modal from "../shared/Modal";
import Button from "../shared/Button";
import { useTranslation } from "../../../i18n/useTranslation";
import "./DeleteCompanyModal.css";

type Props = {
  company: Company;
  onClose: () => void;
  // Se llama recién DESPUÉS de que el borrado en el backend confirmó éxito
  // (no antes) — CodeStudio.tsx la usa para soltar la selección actual y
  // recargar, así el switcher de empresas nunca apunta a un id que ya no
  // existe.
  onDeleted: () => void;
};

const COUNTDOWN_START = 3;
const COUNTDOWN_STEP_MS = 700;

export default function DeleteCompanyModal({ company, onClose, onDeleted }: Props) {
  const t = useTranslation();
  const [input, setInput] = useState("");
  const [mismatchError, setMismatchError] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const matches = input.trim() === company.name;

  const startCountdown = () => {
    if (!matches) {
      setMismatchError(true);
      return;
    }
    setMismatchError(false);
    setCountdown(COUNTDOWN_START);
  };

  const performDelete = async () => {
    setDeleting(true);
    try {
      await deleteCodeStudioCompany(company.id);
      sileo.success({
        title: t("codestudioMisc.deleteCompany.toastTitle"),
        description: t("codestudioMisc.deleteCompany.toastDescription", { name: company.name }),
      });
      onDeleted();
    } catch (err) {
      sileo.error({
        title: t("codestudioMisc.deleteCompany.errorToastTitle"),
        description: err instanceof Error ? err.message : t("codestudioMisc.deleteCompany.errorToastDescription"),
      });
      setDeleting(false);
      setCountdown(null);
    }
  };

  // 3 -> 2 -> 1 -> (borra de verdad) -> ícono de bomba. Un solo efecto: si todavía queda
  // cuenta, agenda el siguiente decremento; al llegar a 0 dispara el borrado
  // real en vez de seguir contando.
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      void performDelete();
      return;
    }
    timerRef.current = setTimeout(() => {
      setCountdown((current) => (current !== null ? current - 1 : null));
    }, COUNTDOWN_STEP_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  const abortCountdown = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCountdown(null);
  };

  return (
    <Modal title={t("codestudioMisc.deleteCompany.title", { name: company.name })} onClose={onClose}>
      {countdown === null ? (
        <div className="cs-delete-body">
          <p className="cs-delete-warning">{t("codestudioMisc.deleteCompany.warning")}</p>
          <p className="cs-delete-instruction">
            {t("codestudioMisc.deleteCompany.instruction", { name: company.name })}
          </p>
          <input
            autoFocus
            className="cs-delete-input"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setMismatchError(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") startCountdown();
            }}
            placeholder={company.name}
          />
          {mismatchError && <p className="cs-delete-error">{t("codestudioMisc.deleteCompany.nameMismatch")}</p>}
          <div className="cs-delete-actions">
            <Button variant="secondary" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" onClick={startCountdown} disabled={!input.trim()}>
              {t("codestudioMisc.deleteCompany.confirmButton")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="cs-delete-countdown">
          <div key={countdown} className="cs-delete-countdown-number">
            {countdown > 0 ? countdown : <Bomb size={44} />}
          </div>
          <p>{deleting ? t("codestudioMisc.deleteCompany.deleting") : t("codestudioMisc.deleteCompany.countingDown")}</p>
          {countdown > 0 && (
            <button type="button" className="cs-delete-abort" onClick={abortCountdown}>
              {t("common.cancel")}
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}
