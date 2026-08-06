import { Loader2 } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";

import { classNames } from "../utils/class-names";

interface LoaderProps {
  label?: string;
  size?: number;
  className?: string;
}

export function Loader({ label = "Cargando...", size = 18, className }: LoaderProps) {
  const t = useTranslation();
  return (
    <div
      className={classNames("flex items-center gap-2 text-[rgb(var(--secondary-text))]", className)}
      role="status"
    >
      <Loader2 className="animate-spin" size={size} />
      {label && <span>{label === "Cargando..." ? t("common.loading") : label}</span>}
    </div>
  );
}
