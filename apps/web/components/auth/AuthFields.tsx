"use client";

import { useId, useState } from "react";
import { AlertCircle, Check, Eye, EyeOff, Github, Chrome, Lock } from "lucide-react";
import { useTranslation } from "../../src/i18n/useTranslation";
import {
  passwordRules,
  passwordScore,
  type PasswordRule,
} from "../../src/shared/utils/auth-validation";

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  error?: string | null;
  hint?: React.ReactNode;
  trailing?: React.ReactNode;
};

// Campo de los formularios de login/registro (estilo brutalista existente),
// con mensaje de error accesible debajo.
export function AuthField({ icon: Icon, label, error, hint, trailing, id, ...props }: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = `${inputId}-message`;
  return (
    <div className="relative group">
      <label
        htmlFor={inputId}
        className="block text-[rgb(var(--primary))] text-xs font-black uppercase mb-2 ml-1"
      >
        {label}_
      </label>
      <div className="relative">
        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[rgb(var(--secondary-text))] group-focus-within:text-[rgb(var(--primary))] transition-colors">
          <Icon size={18} />
        </div>
        <input
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? messageId : undefined}
          {...props}
          className={`w-full bg-[rgb(var(--code-background))] border-2 p-4 pl-12 ${
            trailing ? "pr-12" : ""
          } text-[rgb(var(--text))] outline-none transition-all font-mono text-sm ${
            error
              ? "border-[rgb(var(--error))] focus:border-[rgb(var(--error))]"
              : "border-[rgb(var(--border))] focus:border-[rgb(var(--primary))]"
          }`}
        />
        {trailing && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</div>
        )}
      </div>
      {(error || hint) && (
        <div id={messageId} className="mt-1.5 ml-1 text-xs">
          {error ? (
            <p className="flex items-start gap-1.5 font-semibold text-[rgb(var(--error-text))]">
              <AlertCircle size={13} className="mt-px shrink-0" />
              {error}
            </p>
          ) : (
            hint
          )}
        </div>
      )}
    </div>
  );
}

// Campo de contraseña con mostrar/ocultar y aviso de Bloq Mayús.
export function PasswordField({
  label,
  error,
  hint,
  ...props
}: Omit<FieldProps, "icon" | "type" | "trailing">) {
  const t = useTranslation();
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const detectCaps = (event: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLock(event.getModifierState?.("CapsLock") ?? false);
  };

  return (
    <AuthField
      {...props}
      icon={Lock}
      label={label}
      type={visible ? "text" : "password"}
      error={error}
      onKeyUp={detectCaps}
      onKeyDown={(event) => {
        detectCaps(event);
        props.onKeyDown?.(event);
      }}
      hint={
        capsLock && !error ? (
          <p className="font-semibold text-[rgb(var(--warning-text))]">{t("auth.capsLockOn")}</p>
        ) : (
          hint
        )
      }
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t("auth.hidePasswordLabel") : t("auth.showPasswordLabel")}
          className="p-1 text-[rgb(var(--secondary-text))] hover:text-[rgb(var(--primary))]"
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      }
    />
  );
}

const RULE_KEYS: Record<PasswordRule, string> = {
  length: "auth.validation.passwordLength",
  lower: "auth.validation.passwordLower",
  upper: "auth.validation.passwordUpper",
  number: "auth.validation.passwordNumber",
  symbol: "auth.validation.passwordSymbol",
};

const SCORE_COLORS = [
  "bg-[rgb(var(--border))]",
  "bg-[rgb(var(--error))]",
  "bg-[rgb(var(--cb-warning))]",
  "bg-[rgb(var(--primary))]",
  "bg-[rgb(var(--success))]",
];

// Medidor + checklist en vivo para el registro.
export function PasswordStrength({
  password,
  context,
  showCommonWarning,
}: {
  password: string;
  context: { username?: string; email?: string };
  showCommonWarning: boolean;
}) {
  const t = useTranslation();
  const rules = passwordRules(password);
  const score = passwordScore(password, context);

  return (
    <div className="mt-2 space-y-2" aria-live="polite">
      <div className="flex items-center gap-2">
        <div className="grid flex-1 grid-cols-4 gap-1">
          {[1, 2, 3, 4].map((step) => (
            <span
              key={step}
              className={`h-1.5 transition-colors ${
                password && score >= step ? SCORE_COLORS[score] : "bg-[rgb(var(--border))]"
              }`}
            />
          ))}
        </div>
        <span className="w-20 text-right text-[11px] font-black uppercase text-[rgb(var(--secondary-text))]">
          {t(`auth.validation.strength${password ? score : 0}`)}
        </span>
      </div>
      <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {(Object.keys(RULE_KEYS) as PasswordRule[]).map((rule) => (
          <li
            key={rule}
            className={`flex items-center gap-1.5 text-[11px] font-semibold ${
              rules[rule] ? "text-[rgb(var(--success-text))]" : "text-[rgb(var(--secondary-text))]"
            }`}
          >
            <span
              className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
                rules[rule]
                  ? "border-[rgb(var(--success))] bg-[rgb(var(--success))] text-white"
                  : "border-[rgb(var(--border))]"
              }`}
            >
              {rules[rule] && <Check size={9} strokeWidth={4} />}
            </span>
            {t(RULE_KEYS[rule])}
          </li>
        ))}
      </ul>
      {showCommonWarning && (
        <p className="text-[11px] font-semibold text-[rgb(var(--warning-text))]">
          {t("auth.validation.passwordCommon")}
        </p>
      )}
    </div>
  );
}

// Google/GitHub todavía no tienen OAuth en el API: antes eran botones que
// no hacían nada al tocarlos. Quedan visibles pero deshabilitados.
export function SocialButtons() {
  const t = useTranslation();
  const soon = t("auth.socialComingSoon");
  return (
    <div className="flex gap-4">
      {[
        { label: "Google", icon: <Chrome size={16} /> },
        { label: "GitHub", icon: <Github size={16} /> },
      ].map((provider) => (
        <button
          key={provider.label}
          type="button"
          disabled
          title={soon}
          aria-label={`${provider.label} — ${soon}`}
          className="flex-1 cursor-not-allowed border-2 border-[rgb(var(--border))] py-3 text-[rgb(var(--secondary-text))] opacity-60 flex flex-col items-center justify-center gap-0.5 font-black text-xs uppercase italic sm:flex-row sm:gap-2"
        >
          <span className="flex items-center gap-2">
            {provider.icon} {provider.label}
          </span>
          <span className="text-[9px] not-italic tracking-wide">{soon}</span>
        </button>
      ))}
    </div>
  );
}
