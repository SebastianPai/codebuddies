"use client";

import ItemEditor from "../../../../components/item-editor/ItemEditor";
import { useTranslation } from "../../../../src/i18n/useTranslation";

type ItemFormProps = {
  initial?: any;
  onSubmit: (data: any) => Promise<void>;
};

export default function ItemForm({ initial, onSubmit }: ItemFormProps) {
  const t = useTranslation();
  return (
    <ItemEditor
      initial={initial}
      mode="admin"
      submitLabel={t("items.saveItemButton")}
      onSubmit={onSubmit}
    />
  );
}
