"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/shared/lib/toast";
import { useTranslation } from "@/i18n/useTranslation";

import { modulesService } from "../services/modules-service";
import type { LearningModule } from "../types/module";

export function useModules() {
  const t = useTranslation();
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [moduleIdToDelete, setModuleIdToDelete] = useState<string | null>(null);

  const loadModules = useCallback(async () => {
    try {
      setModules(await modulesService.getModules());
    } catch {
      setModules([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadModules();
  }, [loadModules]);

  const requestModuleDeletion = useCallback((moduleId: string) => {
    setModuleIdToDelete(moduleId);
  }, []);

  const cancelModuleDeletion = useCallback(() => {
    setModuleIdToDelete(null);
  }, []);

  const confirmModuleDeletion = useCallback(async () => {
    if (!moduleIdToDelete) return;

    try {
      await modulesService.deleteModule(moduleIdToDelete);
      setModuleIdToDelete(null);
      await loadModules();
    } catch {
      toast.error(t("admin.deleteModuleError"));
    }
  }, [loadModules, moduleIdToDelete]);

  return {
    modules,
    isLoading,
    moduleIdToDelete,
    requestModuleDeletion,
    cancelModuleDeletion,
    confirmModuleDeletion,
  };
}
