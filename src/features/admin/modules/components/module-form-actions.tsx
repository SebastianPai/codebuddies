import { Loader2, Save } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";

interface ModuleFormActionsProps {
  isSaving: boolean;
  isDisabled: boolean;
  submitLabel: string;
  onCancel: () => void;
}

export function ModuleFormActions({
  isSaving,
  isDisabled,
  submitLabel,
  onCancel,
}: ModuleFormActionsProps) {
  const t = useTranslation();
  return (
    <div className="flex items-center gap-4">
      <button
        type="submit"
        disabled={isDisabled}
        className="flex items-center gap-2 bg-yellow-400 text-black px-6 py-3 rounded-md font-medium hover:bg-yellow-300 transition disabled:opacity-40"
      >
        {isSaving ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            {t("common.loading")}
          </>
        ) : (
          <>
            <Save size={18} />
            {submitLabel}
          </>
        )}
      </button>

      <button
        type="button"
        onClick={onCancel}
        className="text-zinc-400 hover:text-white text-sm"
      >
        {t("common.cancel")}
      </button>
    </div>
  );
}
