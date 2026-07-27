"use client";

import { Catalog } from "../types";
import { secondsLabel } from "../utils";

export default function ModuleLibrary({
  groupedModules,
  expanded,
  setExpanded,
  moduleSearch,
  setModuleSearch,
  onDevelop,
}: {
  groupedModules: Record<string, Catalog["modules"]>;
  expanded: Record<string, boolean>;
  setExpanded: (value: Record<string, boolean>) => void;
  moduleSearch: string;
  setModuleSearch: (value: string) => void;
  onDevelop: (moduleId: string) => void;
}) {
  return (
    <section className="cs-panel cs-module-library">
      <div className="cs-panel-header">
        <div>
          <h3>Biblioteca de features</h3>
          <p>120+ modulos agrupados por categoria. Busca, expande y decide que desarrollar.</p>
        </div>
        <input value={moduleSearch} onChange={(event) => setModuleSearch(event.target.value)} placeholder="Buscar modulo..." />
      </div>
      <div className="cs-module-groups">
        {Object.entries(groupedModules).map(([category, modules]) => {
          const isOpen = expanded[category] ?? Object.keys(expanded).length === 0;
          return (
            <article key={category}>
              <button onClick={() => setExpanded({ ...expanded, [category]: !isOpen })}>
                <b>{category}</b>
                <small>{modules.length} features</small>
              </button>
              {isOpen && (
                <div>
                  {modules.slice(0, 12).map((module) => (
                    <button key={module.id} onClick={() => void onDevelop(module.id)}>
                      <span>{module.name}</span>
                      <small>${module.cost} · {secondsLabel(module.developmentSeconds)}</small>
                    </button>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
