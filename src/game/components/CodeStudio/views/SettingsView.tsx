"use client";

import { Company } from "../types";

export default function SettingsView({ company }: { company: Company }) {
  return (
    <section className="cs-panel">
      <h3>Configuracion de Live Ops</h3>
      <p className="cs-muted">CodeStudio avanza con los ticks del juego. Las opciones avanzadas se conectaran al motor en fases futuras.</p>
      <div className="cs-settings">
        <label><input type="checkbox" defaultChecked /> Notificaciones de eventos</label>
        <label><input type="checkbox" defaultChecked /> Animaciones de desarrollo</label>
        <label><input type="checkbox" defaultChecked /> Sincronizar al abrir la PC</label>
      </div>
      <pre>{JSON.stringify({ companyId: company.id, status: company.status }, null, 2)}</pre>
    </section>
  );
}
