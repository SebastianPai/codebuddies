"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Check, User } from "lucide-react";

import Modal from "../shared/Modal";
import Button from "../shared/Button";
import UserBadges from "../shared/UserBadges";
import { updateUsername } from "../../network/auth";
import { notifyBadgesChanged } from "../../hooks/useUserBadges";
import {
  getMyBadgeSettings,
  setSelectedBadges,
  type BadgeTypeKey,
  type MyBadgeSettings,
} from "../../network/badges";
import styles from "./SettingsWindow.module.css";

interface Props {
  username: string;
  onClose: () => void;
  onUsernameChanged: (username: string) => void;
}

const BADGE_LABEL: Record<BadgeTypeKey, string> = {
  VERIFIED: "Verificado",
  CREATOR: "Creador",
};

export default function SettingsWindow({ username, onClose, onUsernameChanged }: Props) {
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

  const saveUsername = async () => {
    const trimmed = usernameInput.trim();
    setUsernameError("");
    setUsernameSaved(false);

    if (trimmed.length < 3) {
      setUsernameError("El nombre de usuario debe tener al menos 3 caracteres.");
      return;
    }
    if (trimmed === username) return;

    setSavingUsername(true);
    try {
      const result = await updateUsername(trimmed);
      onUsernameChanged(result.username);
      setUsernameSaved(true);
    } catch (err) {
      setUsernameError(err instanceof Error ? err.message : "No se pudo cambiar el nombre de usuario.");
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
      setSelectionError(err instanceof Error ? err.message : "No se pudo guardar.");
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
      title="Ajustes"
      onClose={onClose}
      style={{ width: "min(440px, calc(100vw - 24px))" }}
    >
      <div className={styles.sections}>
        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <span className={styles.sectionIcon}>
              <User size={15} />
            </span>
            <div>
              <h3 className={styles.sectionTitle}>Nombre de usuario</h3>
              <p className={styles.sectionHint}>No pueden existir dos jugadores con el mismo nombre.</p>
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
                placeholder="Tu nombre de usuario"
              />
              <Button
                variant="primary"
                size="sm"
                disabled={savingUsername || usernameInput.trim() === username || usernameInput.trim().length < 3}
                onClick={() => void saveUsername()}
              >
                {savingUsername ? "Guardando..." : "Guardar"}
              </Button>
            </div>
            {usernameError && <p className={styles.error}>{usernameError}</p>}
            {usernameSaved && (
              <p className={styles.success}>
                <Check size={13} /> Nombre actualizado
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
              <h3 className={styles.sectionTitle}>Insignias</h3>
              <p className={styles.sectionHint}>
                Elegí cuáles mostrar junto a tu nombre en todo el juego.
                {badgeSettings && (
                  <>
                    {" "}
                    Tu cuenta puede mostrar{" "}
                    <strong>
                      {badgeSettings.maxSelectable === 1
                        ? "1 insignia a la vez"
                        : `hasta ${badgeSettings.maxSelectable} a la vez`}
                    </strong>
                    .
                  </>
                )}
              </p>
            </div>
          </header>

          <div className={styles.sectionBody}>
            {!badgeSettings ? (
              <p className={styles.hint}>Cargando...</p>
            ) : badgeSettings.qualifying.length === 0 ? (
              <p className={styles.hint}>
                Todavía no tenés insignias — cuando consigas una (verificado o creador) vas a poder elegir si se
                muestra.
              </p>
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
                        {BADGE_LABEL[type]}
                      </label>
                    );
                  })}
                </div>

                {(selectionChanged || selectionError) && (
                  <div className={styles.row}>
                    <Button variant="primary" size="sm" disabled={savingSelection} onClick={() => void saveSelection()}>
                      {savingSelection ? "Guardando..." : "Guardar selección"}
                    </Button>
                  </div>
                )}
                {selectionError && <p className={styles.error}>{selectionError}</p>}
                {selectionSaved && !selectionChanged && (
                  <p className={styles.success}>
                    <Check size={13} /> Selección guardada
                  </p>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </Modal>
  );
}
