"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Check, Globe, Lock, MessageSquare, Sparkles, User } from "lucide-react";
import { getNameEffectCatalog } from "@codebuddies/visual-effects";

import Modal from "../shared/Modal";
import Button from "../shared/Button";
import UserBadges from "../shared/UserBadges";
import RarityText from "../shared/RarityText";
import { updateUsername } from "../../network/auth";
import { notifyBadgesChanged } from "../../hooks/useUserBadges";
import {
  getMyBadgeSettings,
  setSelectedBadges,
  type BadgeTypeKey,
  type MyBadgeSettings,
} from "../../network/badges";
import { CHAT_BUBBLE_THEMES } from "../../hud/nameplateStyles";
import { useChatBubbleTheme } from "../../hooks/useChatBubbleTheme";
import { useNameEffect } from "../../hooks/useNameEffect";
import { useTranslation } from "../../../i18n/useTranslation";
import { useLanguage, type Lang } from "../../../i18n/LanguageContext";
import styles from "./SettingsWindow.module.css";

const CHAT_THEME_LIST = Object.values(CHAT_BUBBLE_THEMES);
const NAME_EFFECT_LIST = getNameEffectCatalog();

function hexOf(color: number) {
  return `#${color.toString(16).padStart(6, "0")}`;
}

interface Props {
  username: string;
  onClose: () => void;
  onUsernameChanged: (username: string) => void;
}

const LANGUAGE_OPTIONS: { value: Lang; labelKey: string }[] = [
  { value: "es", labelKey: "settings.languageEs" },
  { value: "en-us", labelKey: "settings.languageEnUs" },
  { value: "de", labelKey: "settings.languageDe" },
];

export default function SettingsWindow({ username, onClose, onUsernameChanged }: Props) {
  const t = useTranslation();
  const { lang, changeLanguage } = useLanguage();

  const [usernameInput, setUsernameInput] = useState(username);
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [usernameSaved, setUsernameSaved] = useState(false);

  const [badgeSettings, setBadgeSettings] = useState<MyBadgeSettings | null>(null);
  const [draftSelection, setDraftSelection] = useState<BadgeTypeKey[]>([]);
  const [savingSelection, setSavingSelection] = useState(false);
  const [selectionError, setSelectionError] = useState("");
  const [selectionSaved, setSelectionSaved] = useState(false);

  useEffect(() => {
    void getMyBadgeSettings().then((result) => {
      setBadgeSettings(result);
      setDraftSelection(result.selected);
    });
  }, []);

  const {
    themeId: chatThemeId,
    isPremium,
    saving: savingTheme,
    error: chatThemeErrorCode,
    selectTheme: selectChatTheme,
  } = useChatBubbleTheme();
  const themeError =
    chatThemeErrorCode === "PREMIUM_REQUIRED"
      ? t("settings.chatThemePremiumRequired")
      : chatThemeErrorCode === "SAVE_ERROR"
        ? t("settings.chatThemeSaveError")
        : "";

  const {
    effectId: nameEffectId,
    unlockedEffectIds,
    saving: savingNameEffect,
    error: nameEffectErrorCode,
    selectEffect,
  } = useNameEffect();
  const nameEffectError =
    nameEffectErrorCode === "NOT_UNLOCKED"
      ? t("settings.nameEffectPremiumRequired")
      : nameEffectErrorCode === "SAVE_ERROR"
        ? t("settings.nameEffectSaveError")
        : "";

  const saveUsername = async () => {
    const trimmed = usernameInput.trim();
    setUsernameError("");
    setUsernameSaved(false);

    if (trimmed.length < 3) {
      setUsernameError(t("settings.usernameTooShort"));
      return;
    }
    if (trimmed === username) return;

    setSavingUsername(true);
    try {
      const result = await updateUsername(trimmed);
      onUsernameChanged(result.username);
      setUsernameSaved(true);
    } catch (err) {
      setUsernameError(err instanceof Error ? err.message : t("settings.usernameGenericError"));
    } finally {
      setSavingUsername(false);
    }
  };

  const toggleDraft = (type: BadgeTypeKey) => {
    setSelectionError("");
    setSelectionSaved(false);
    setDraftSelection((current) => {
      if (current.includes(type)) return current.filter((entry) => entry !== type);
      if (badgeSettings && current.length >= badgeSettings.maxSelectable) return current;
      return [...current, type];
    });
  };

  const saveSelection = async () => {
    setSavingSelection(true);
    setSelectionError("");
    try {
      const result = await setSelectedBadges(draftSelection);
      setBadgeSettings(result);
      setDraftSelection(result.selected);
      setSelectionSaved(true);
      // Sin esto, el resto del juego (sidebar, perfil, chat...) seguía
      // mostrando la selección vieja hasta refrescar la página.
      notifyBadgesChanged(username);
    } catch (err) {
      setSelectionError(err instanceof Error ? err.message : t("settings.badgesSaveError"));
    } finally {
      setSavingSelection(false);
    }
  };

  const selectionChanged =
    !!badgeSettings &&
    (draftSelection.length !== badgeSettings.selected.length ||
      draftSelection.some((type) => !badgeSettings.selected.includes(type)));

  return (
    <Modal
      variant="floating"
      title={t("settings.title")}
      onClose={onClose}
      style={{ width: "min(720px, calc(100vw - 24px))" }}
    >
      <div className={styles.sections}>
        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <span className={styles.sectionIcon}>
              <User size={15} />
            </span>
            <div>
              <h3 className={styles.sectionTitle}>{t("settings.usernameSectionTitle")}</h3>
              <p className={styles.sectionHint}>{t("settings.usernameSectionHint")}</p>
            </div>
          </header>

          <div className={styles.sectionBody}>
            <div className={styles.row}>
              <input
                className={styles.input}
                value={usernameInput}
                onChange={(event) => {
                  setUsernameInput(event.target.value);
                  setUsernameError("");
                  setUsernameSaved(false);
                }}
                maxLength={20}
                placeholder={t("settings.usernamePlaceholder")}
              />
              <Button
                variant="primary"
                size="sm"
                disabled={savingUsername || usernameInput.trim() === username || usernameInput.trim().length < 3}
                onClick={() => void saveUsername()}
              >
                {savingUsername ? t("common.saving") : t("common.save")}
              </Button>
            </div>
            {usernameError && <p className={styles.error}>{usernameError}</p>}
            {usernameSaved && (
              <p className={styles.success}>
                <Check size={13} /> {t("settings.usernameUpdated")}
              </p>
            )}
          </div>
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <span className={styles.sectionIcon}>
              <BadgeCheck size={15} />
            </span>
            <div>
              <h3 className={styles.sectionTitle}>{t("settings.badgesSectionTitle")}</h3>
              <p className={styles.sectionHint}>
                {t("settings.badgesSectionHint")}
                {badgeSettings && (
                  <>
                    {" "}
                    {t("settings.badgesAccountCanShow")}{" "}
                    <strong>
                      {badgeSettings.maxSelectable === 1
                        ? t("settings.badgesLimitOne")
                        : t("settings.badgesLimitMany", { count: badgeSettings.maxSelectable })}
                    </strong>
                    .
                  </>
                )}
              </p>
            </div>
          </header>

          <div className={styles.sectionBody}>
            {!badgeSettings ? (
              <p className={styles.hint}>{t("common.loading")}</p>
            ) : badgeSettings.qualifying.length === 0 ? (
              <p className={styles.hint}>{t("settings.badgesNoneYet")}</p>
            ) : (
              <>
                <div className={styles.badgeList}>
                  {badgeSettings.qualifying.map((type) => {
                    const checked = draftSelection.includes(type);
                    const disabled = !checked && draftSelection.length >= badgeSettings.maxSelectable;
                    return (
                      <label
                        key={type}
                        className={`${styles.badgeOption} ${checked ? styles.badgeOptionChecked : ""} ${
                          disabled ? styles.badgeOptionDisabled : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggleDraft(type)}
                        />
                        <UserBadges
                          verified={type === "VERIFIED"}
                          isCreator={type === "CREATOR"}
                          size={18}
                        />
                        {t(type === "VERIFIED" ? "settings.badgeLabelVerified" : "settings.badgeLabelCreator")}
                      </label>
                    );
                  })}
                </div>

                {(selectionChanged || selectionError) && (
                  <div className={styles.row}>
                    <Button variant="primary" size="sm" disabled={savingSelection} onClick={() => void saveSelection()}>
                      {savingSelection ? t("common.saving") : t("settings.badgesSaveSelection")}
                    </Button>
                  </div>
                )}
                {selectionError && <p className={styles.error}>{selectionError}</p>}
                {selectionSaved && !selectionChanged && (
                  <p className={styles.success}>
                    <Check size={13} /> {t("settings.badgesSelectionSaved")}
                  </p>
                )}
              </>
            )}
          </div>
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <span className={styles.sectionIcon}>
              <MessageSquare size={15} />
            </span>
            <div>
              <h3 className={styles.sectionTitle}>{t("settings.chatThemeSectionTitle")}</h3>
              <p className={styles.sectionHint}>{t("settings.chatThemeSectionHint")}</p>
            </div>
          </header>

          <div className={styles.sectionBody}>
            <div className={styles.themeSwatchGrid}>
              {CHAT_THEME_LIST.map((theme) => {
                const locked = theme.tier === "premium" && !isPremium;
                const selected = chatThemeId === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    className={`${styles.themeSwatch} ${selected ? styles.themeSwatchSelected : ""} ${
                      locked ? styles.themeSwatchLocked : ""
                    }`}
                    disabled={savingTheme}
                    onClick={() => void selectChatTheme(theme.id, theme.tier)}
                    style={{
                      background: hexOf(theme.backgroundColor),
                      borderColor: hexOf(theme.borderColor),
                      color: theme.textColor,
                    }}
                  >
                    {locked && <Lock size={11} className={styles.themeSwatchLockIcon} />}
                    <span style={{ color: theme.nameColor }}>{theme.label}</span>
                    {selected && <Check size={13} className={styles.themeSwatchCheck} />}
                  </button>
                );
              })}
            </div>
            {themeError && <p className={styles.error}>{themeError}</p>}
          </div>
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <span className={styles.sectionIcon}>
              <Sparkles size={15} />
            </span>
            <div>
              <h3 className={styles.sectionTitle}>{t("settings.nameEffectSectionTitle")}</h3>
              <p className={styles.sectionHint}>{t("settings.nameEffectSectionHint")}</p>
            </div>
          </header>

          <div className={styles.sectionBody}>
            <div className={styles.nameEffectGrid}>
              {NAME_EFFECT_LIST.map((effect) => {
                const locked = !unlockedEffectIds.includes(effect.id);
                const selected = nameEffectId === effect.id;
                const lockHint =
                  effect.unlockRule === "premium"
                    ? t("settings.nameEffectLockedPremiumHint")
                    : effect.unlockRule === "ownable"
                      ? t("settings.nameEffectLockedOwnableHint")
                      : undefined;
                return (
                  <button
                    key={effect.id}
                    type="button"
                    className={`${styles.nameEffectOption} ${
                      selected ? styles.nameEffectOptionSelected : ""
                    } ${locked ? styles.nameEffectOptionLocked : ""}`}
                    disabled={savingNameEffect}
                    title={locked ? lockHint : undefined}
                    onClick={() => void selectEffect(effect.id)}
                  >
                    {locked ? (
                      <Lock size={12} />
                    ) : selected ? (
                      <Check size={12} />
                    ) : null}
                    <RarityText effect={effect.id}>{username}</RarityText>
                  </button>
                );
              })}
            </div>
            {nameEffectError && <p className={styles.error}>{nameEffectError}</p>}
          </div>
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <span className={styles.sectionIcon}>
              <Globe size={15} />
            </span>
            <div>
              <h3 className={styles.sectionTitle}>{t("settings.languageSectionTitle")}</h3>
              <p className={styles.sectionHint}>{t("settings.languageSectionHint")}</p>
            </div>
          </header>

          <div className={styles.sectionBody}>
            <div className={styles.badgeList}>
              {LANGUAGE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`${styles.badgeOption} ${lang === option.value ? styles.badgeOptionChecked : ""}`}
                >
                  <input
                    type="radio"
                    name="language"
                    checked={lang === option.value}
                    onChange={() => changeLanguage(option.value)}
                  />
                  {t(option.labelKey)}
                </label>
              ))}
            </div>
          </div>
        </section>
      </div>
    </Modal>
  );
}
