"use client";
// TEMPORAL (no se commitea): PC + CodeStudio real para revisar el celular.
import PCWindow from "../../game/components/PC/PCWindows";
export default function P() {
  const view = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("view") ?? "panel" : "panel";
  return <PCWindow onClose={() => {}} initialView={view} />;
}
