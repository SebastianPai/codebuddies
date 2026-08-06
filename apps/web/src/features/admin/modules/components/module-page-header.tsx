import { ArrowLeft, Layers } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";

interface ModulePageHeaderProps {
  title: string;
  description: string;
  onBack: () => void;
}

export function ModulePageHeader({
  title,
  description,
  onBack,
}: ModulePageHeaderProps) {
  const t = useTranslation();
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-yellow-400 flex items-center gap-3">
          <Layers size={28} />
          {title}
        </h1>
        <p className="text-zinc-400 mt-1">{description}</p>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition"
      >
        <ArrowLeft size={16} />
        {t("common.back")}
      </button>
    </div>
  );
}
