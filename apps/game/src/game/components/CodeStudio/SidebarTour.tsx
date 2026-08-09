"use client";

import { Joyride, type Step } from "react-joyride";
import { useTranslation } from "../../../i18n/useTranslation";

type Props = {
  run: boolean;
  onFinish: () => void;
};

// A diferencia de CenteredJoyrideOverlay (un solo paso falso en el centro,
// usado para wizards/explicaciones a pantalla completa), esto SI usa Joyride
// para lo que esta hecho: una flecha real apuntando a cada boton de verdad
// de la barra lateral, en secuencia.
export default function SidebarTour({ run, onFinish }: Props) {
  const t = useTranslation();

  const steps: Step[] = [
    {
      target: "#cs-nav-backlog",
      placement: "right",
      title: t("codestudioMisc.sidebarTour.backlogTitle"),
      content: t("codestudioMisc.sidebarTour.backlogContent"),
      skipBeacon: true,
    },
    {
      target: "#cs-nav-employees",
      placement: "right",
      title: t("codestudioMisc.sidebarTour.employeesTitle"),
      content: t("codestudioMisc.sidebarTour.employeesContent"),
      skipBeacon: true,
    },
    {
      target: "#cs-nav-infrastructure",
      placement: "right",
      title: t("codestudioMisc.sidebarTour.infrastructureTitle"),
      content: t("codestudioMisc.sidebarTour.infrastructureContent"),
      skipBeacon: true,
    },
    {
      target: "#cs-nav-research",
      placement: "right",
      title: t("codestudioMisc.sidebarTour.researchTitle"),
      content: t("codestudioMisc.sidebarTour.researchContent"),
      skipBeacon: true,
    },
    {
      target: "#cs-nav-marketing",
      placement: "right",
      title: t("codestudioMisc.sidebarTour.marketingTitle"),
      content: t("codestudioMisc.sidebarTour.marketingContent"),
      skipBeacon: true,
    },
  ];

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      options={{
        primaryColor: "#facc15",
        backgroundColor: "#0f172a",
        textColor: "#e5f6ff",
        arrowColor: "#0f172a",
        overlayColor: "rgba(3, 7, 18, 0.72)",
        zIndex: 20000,
        showProgress: true,
        buttons: ["back", "skip", "primary"],
      }}
      locale={{
        back: t("codestudioMisc.sidebarTour.localeBack"),
        skip: t("codestudioMisc.sidebarTour.localeSkip"),
        next: t("codestudioMisc.sidebarTour.localeNext"),
        last: t("codestudioMisc.sidebarTour.localeLast"),
      }}
      styles={{
        tooltip: { borderRadius: 16 },
        tooltipTitle: { fontWeight: 900 },
      }}
      onEvent={(data) => {
        if (data.status === "finished" || data.status === "skipped") onFinish();
      }}
    />
  );
}
