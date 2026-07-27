import Link from "next/link";
import { useTranslation } from "@/i18n/useTranslation";
import { classNames } from "../utils/class-names";
import { FOCUS_RING, PRESSABLE } from "./styles";

interface ResourceTableActionsProps {
  editHref: string;
  onDelete: () => void;
}

const actionButtonClasses = "rounded-lg px-3 py-1 text-xs font-bold transition";

export function ResourceTableActions({
  editHref,
  onDelete,
}: ResourceTableActionsProps) {
  const t = useTranslation();
  return (
    <div className="flex justify-end gap-2">
      <Link
        href={editHref}
        className={classNames(
          actionButtonClasses,
          "bg-[rgb(var(--button))] text-[rgb(var(--button-text))] hover:brightness-110 active:brightness-95",
          PRESSABLE,
          FOCUS_RING,
        )}
        title={t("common.edit")}
      >
        {t("common.edit")}
      </Link>
      <button
        type="button"
        onClick={onDelete}
        className={classNames(
          // text-black: --error stays a soft red across all themes; black text is the
          // only pairing that clears WCAG AA against it (see button.tsx danger variant).
          actionButtonClasses,
          "bg-[rgb(var(--error))] text-black hover:brightness-95 active:brightness-90",
          PRESSABLE,
          FOCUS_RING,
        )}
        title={t("common.delete")}
      >
        {t("common.delete")}
      </button>
    </div>
  );
}
