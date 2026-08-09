"use client";

import { Company } from "../types";

export default function AppTreeView({ company }: { company: Company }) {
  return (
    <div className="cs-panel">
      <h3>Arbol visual de producto</h3>
      <p className="cs-muted">Vista de dependencias y crecimiento. No modifica el motor: visualiza los modulos instalados.</p>
      <div className="cs-tree">
        {company.modules.map((entry, index) => (
          <div key={entry.module.id} className="cs-node-wrap">
            <div className="cs-node">
              <span>{index + 1}</span>
              <b>{entry.module.name}</b>
              <small>{entry.module.category}</small>
            </div>
            {index < company.modules.length - 1 && <i />}
          </div>
        ))}
      </div>
    </div>
  );
}
