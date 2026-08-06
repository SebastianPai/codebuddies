"use client";

import { conditionCatalog, conditionGroupLabelKeys, conditionGroups, findCondition } from "./condition-catalog";
import { useTranslation } from "../../../../src/i18n/useTranslation";

export default function ConditionSelector({
  value,
  onChange,
  onDefaultValue,
}: {
  value: string;
  onChange: (value: string) => void;
  onDefaultValue: (value: number) => void;
}) {
  const t = useTranslation();
  const selected = findCondition(value);
  const groupConditions = conditionCatalog.filter((condition) => condition.group === selected.group);

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <label className="block">
        <span className="mb-2 block text-sm text-zinc-400">{t("gamification.conditionType")}</span>
        <select
          value={selected.group}
          onChange={(event) => {
            const first = conditionCatalog.find((condition) => condition.group === event.target.value);
            if (first) {
              onChange(first.key);
              onDefaultValue(first.defaultValue);
            }
          }}
          className="w-full rounded-md border border-zinc-800 bg-black px-3 py-3"
        >
          {conditionGroups.map((group) => (
            <option key={group} value={group}>
              {t(conditionGroupLabelKeys[group])}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-2 block text-sm text-zinc-400">{t("gamification.condition")}</span>
        <select
          value={value}
          onChange={(event) => {
            const next = findCondition(event.target.value);
            onChange(next.key);
            onDefaultValue(next.defaultValue);
          }}
          className="w-full rounded-md border border-zinc-800 bg-black px-3 py-3"
        >
          {groupConditions.map((condition) => (
            <option key={condition.key} value={condition.key}>
              {t(condition.labelKey)}
            </option>
          ))}
        </select>
      </label>

      <div className="rounded-md border border-zinc-800 bg-black p-4 md:col-span-2">
        <p className="font-black text-yellow-400">{t(selected.labelKey)}</p>
        <p className="mt-1 text-sm text-zinc-400">{t(selected.descriptionKey)}</p>
        <p className="mt-2 text-xs font-bold uppercase text-zinc-500">
          {t("gamification.progressExample")}: {selected.example}
        </p>
      </div>
    </div>
  );
}
