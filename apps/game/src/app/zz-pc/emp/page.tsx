"use client";
// TEMPORAL (no se commitea): carta de empleado abierta desde la oficina.
import { useEffect } from "react";
import OfficeEmployeeModal from "../../../game/components/CodeStudio/OfficeEmployeeModal";
import { getOfficeRoomEmployees } from "../../../game/network/codestudio";
export default function P() {
  useEffect(() => {
    const room = new URLSearchParams(window.location.search).get("room") ?? "";
    getOfficeRoomEmployees(room).then((office) => {
      window.dispatchEvent(new CustomEvent("codestudio:employee-selected", { detail: { employee: office.employees[0], companyName: office.company?.name ?? "" } }));
    });
  }, []);
  return <div style={{ background: "#333", minHeight: "100vh" }}><OfficeEmployeeModal /></div>;
}
