"use client";

import { useEffect, useState } from "react";
import Modal from "../shared/Modal";
import EmployeeCard from "./EmployeeCard";
import type { OfficeRoomEmployee } from "../../network/codestudio";
import type { CompanyView } from "./types";
import "./CodeStudio.css";

// Clic en un empleado dentro de la oficina de una empresa: abre su carta
// (la misma del equipo en CodeStudio, sin sueldo ni despedir).

type CardEmployee = CompanyView["employees"][number];

type Selected = { employee: OfficeRoomEmployee; companyName: string };

export default function OfficeEmployeeModal() {
  const [selected, setSelected] = useState<Selected | null>(null);

  useEffect(() => {
    const onSelect = (event: Event) => setSelected((event as CustomEvent<Selected>).detail);
    window.addEventListener("codestudio:employee-selected", onSelect);
    return () => window.removeEventListener("codestudio:employee-selected", onSelect);
  }, []);

  if (!selected) return null;
  const { employee, companyName } = selected;
  return (
    <Modal className="cs2-modal cs2-employee-modal" title={companyName || employee.name} onClose={() => setSelected(null)}>
      <div className="cs2-employee-modal-body">
        <EmployeeCard
          employee={{
            name: employee.name,
            roleSlug: employee.roleSlug,
            roleName: employee.roleName,
            performance: employee.performance,
            trait: (employee.trait ?? undefined) as CardEmployee["trait"],
            stats: employee.stats ?? undefined,
            card: employee.card ?? undefined,
            skin: employee.skin ?? undefined,
            avatar: employee.avatar ?? null,
          }}
        />
      </div>
    </Modal>
  );
}
