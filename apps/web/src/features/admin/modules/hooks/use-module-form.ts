"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/../hooks/useAuth";
import { useTranslation } from "@/i18n/useTranslation";

import {
  INITIAL_MODULE_TRANSLATIONS,
  MODULE_REDIRECT_DELAY_MS,
  MODULES_ROUTE,
} from "../constants/modules";
import { modulesService } from "../services/modules-service";
import type { LearningModule, ModuleTranslation } from "../types/module";
import { getTranslationsValidationError } from "../validations/module-validation";

type ModuleFormMode = "create" | "edit";

interface UseModuleFormOptions {
  mode: ModuleFormMode;
  moduleId?: string;
}

export function useModuleForm({ mode, moduleId }: UseModuleFormOptions) {
  const t = useTranslation();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [module, setModule] = useState<LearningModule | null>(null);
  const [translations, setTranslations] = useState<ModuleTranslation[]>(
    INITIAL_MODULE_TRANSLATIONS,
  );
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (mode !== "edit" || !moduleId) return;

    const loadModule = async () => {
      try {
        const loadedModule = await modulesService.getModule(moduleId);
        setModule(loadedModule);
        setTranslations(loadedModule.translations);
      } catch {
        setError(t("admin.serverError"));
      } finally {
        setIsLoading(false);
      }
    };

    void loadModule();
  }, [mode, moduleId]);

  const goToModules = useCallback(() => {
    router.push(MODULES_ROUTE);
  }, [router]);

  const isSubmitDisabled =
    isSaving || Boolean(getTranslationsValidationError(translations));

  const saveModule = useCallback(async () => {
    if (mode === "create" && !isAuthenticated) {
      router.push("/login");
      return;
    }

    const validationError = getTranslationsValidationError(translations);
    if (validationError) {
      setError(t(validationError));
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (mode === "create") {
        await modulesService.createModule(translations);
      } else {
        if (!moduleId) return;
        await modulesService.updateModule(moduleId, translations);
      }

      setIsSuccess(true);
      window.setTimeout(goToModules, MODULE_REDIRECT_DELAY_MS);
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : mode === "create" ? t("admin.moduleCreateError") : t("admin.moduleUpdateError"),
      );
    } finally {
      setIsSaving(false);
    }
  }, [goToModules, isAuthenticated, mode, moduleId, router, translations]);

  return {
    module,
    translations,
    setTranslations,
    isLoading,
    isSaving,
    error,
    isSuccess,
    isSubmitDisabled,
    saveModule,
    goToModules,
  };
}
