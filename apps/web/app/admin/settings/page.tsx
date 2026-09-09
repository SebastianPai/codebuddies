"use client";

import { useEffect, useState } from "react";
import { ShieldOff } from "lucide-react";

import { useTranslation } from "../../../src/i18n/useTranslation";
import { Switch } from "@/shared/ui";

const BYPASS_KEY = "cb:bypass-locks";

export default function AdminSettingsPage() {
  const t = useTranslation();
  const [bypassLocks, setBypassLocks] = useState(false);

  useEffect(() => {
    try {
      setBypassLocks(localStorage.getItem(BYPASS_KEY) === "1");
    } catch {
      /* noop */
    }
  }, []);

  const toggleBypass = (next: boolean) => {
    setBypassLocks(next);
    try {
      if (next) localStorage.setItem(BYPASS_KEY, "1");
      else localStorage.removeItem(BYPASS_KEY);
    } catch {
      /* noop */
    }
  };

  return (
    <div className="space-y-8 p-10 text-[rgb(var(--text))]">
      <div>
        <h1 className="text-3xl font-black text-[rgb(var(--primary))]">
          {t("site.settings")}
        </h1>
        <p className="mt-2 text-[rgb(var(--secondary-text))]">
          {t("site.platformSettings")}
        </p>
      </div>

      <div className="max-w-2xl rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--primary)/0.12)] text-[rgb(var(--primary))]">
              <ShieldOff size={18} />
            </span>
            <div>
              <p className="text-sm font-black">
                {t("admin.bypassLocksTitle")}
              </p>
              <p className="mt-1 text-sm font-semibold text-[rgb(var(--text))]">
                {t("admin.bypassLocksLabel")}
              </p>
              <p className="mt-1 max-w-md text-xs text-[rgb(var(--secondary-text))]">
                {t("admin.bypassLocksHint")}
              </p>
            </div>
          </div>
          <Switch
            checked={bypassLocks}
            onChange={(event) => toggleBypass(event.target.checked)}
          />
        </div>
      </div>
    </div>
  );
}
