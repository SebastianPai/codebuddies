import Phaser from "phaser";
import PetSystem from "./PetSystem";
import ButlerSystem from "./ButlerSystem";
import { getRoomPets } from "../network/pets";
import { getRoomButlers, type ButlerNpc } from "../network/butlers";
import { getOfficeRoomEmployees } from "../network/codestudio";

// Mascotas y mayordomos de OTRAS personas que están "sacados" en esta sala:
// los ve cualquiera que entre, no solo su dueño. Los propios los siguen
// manejando PetSystem/ButlerSystem en modo "mío" (LobbyScene). Cada cliente
// simula su comportamiento por su cuenta (es decorativo, no se sincroniza
// la posición exacta).

const REFRESH_MS = 30_000;

export default class RoomCompanions {
  private pets = new Map<string, PetSystem>();
  private butlers = new Map<string, ButlerSystem>();
  // Empleados de CodeStudio si esta sala es la oficina de una empresa.
  private employees = new Map<string, ButlerSystem>();
  private sinceRefresh = 0;
  private loading = false;
  private destroyed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly myUsername: string | null,
  ) {}

  async refresh(): Promise<void> {
    if (this.loading || this.destroyed) return;
    const roomId: string | null = (typeof window !== "undefined" && (window as any).currentRoomId) || null;
    if (!roomId) return;
    this.loading = true;
    try {
      const [pets, butlers, office] = await Promise.all([
        getRoomPets(roomId).catch(() => []),
        getRoomButlers(roomId).catch(() => []),
        getOfficeRoomEmployees(roomId).catch(() => ({ company: null, employees: [] })),
      ]);
      if (this.destroyed) return;
      const others = <T extends { ownerUsername: string }>(list: T[]) => list.filter((entry) => entry.ownerUsername !== this.myUsername);

      const petIds = new Set<string>();
      for (const pet of others(pets)) {
        petIds.add(pet.id);
        if (this.pets.has(pet.id)) continue;
        const system = new PetSystem(this.scene, pet);
        this.pets.set(pet.id, system);
        void system.sync();
      }
      for (const [id, system] of this.pets) {
        if (petIds.has(id)) continue;
        system.destroy();
        this.pets.delete(id);
      }

      const butlerIds = new Set<string>();
      for (const butler of others(butlers)) {
        butlerIds.add(butler.id);
        if (this.butlers.has(butler.id)) continue;
        const system = new ButlerSystem(this.scene, butler);
        this.butlers.set(butler.id, system);
        void system.sync();
      }
      for (const [id, system] of this.butlers) {
        if (butlerIds.has(id)) continue;
        system.destroy();
        this.butlers.delete(id);
      }

      const employeeIds = new Set<string>();
      const withSkin = office.employees.filter((employee) => !!employee.npc?.spriteSheetUrl);
      withSkin.forEach((employee, index) => {
        if (!employee.npc) return;
        employeeIds.add(employee.id);
        const existing = this.employees.get(employee.id);
        if (existing) {
          existing.setLines(employee.npc.greetingLines, employee.npc.idleLines);
          return;
        }
        const npc = { ...employee.npc, name: employee.name, animations: (employee.npc.animations ?? []) as ButlerNpc["animations"] } as ButlerNpc;
        const system = new ButlerSystem(
          this.scene,
          { id: employee.id, npcKey: npc.key, name: employee.name, activeRoomId: roomId, ownerUsername: "" },
          npc,
          {
            nameplate: { name: employee.name, subtitle: employee.roleName },
            wanderRadius: 240,
            colorSeed: employee.id,
            // El de mejor rendimiento se queda con la primera silla, igual
            // que en el cálculo de puestos del servidor.
            seat: () => this.officeChairs()[index] ?? null,
            onSelect: () =>
              window.dispatchEvent(
                new CustomEvent("codestudio:employee-selected", { detail: { employee, companyName: office.company?.name ?? "" } }),
              ),
          },
        );
        this.employees.set(employee.id, system);
        void system.sync();
      });
      for (const [id, system] of this.employees) {
        if (employeeIds.has(id)) continue;
        system.destroy();
        this.employees.delete(id);
      }
    } finally {
      this.loading = false;
    }
  }

  /** Sillas de oficina (tag office:chair) de la sala, en orden estable: punto donde se sienta cada uno. */
  private officeChairs(): Array<{ x: number; y: number }> {
    const scene = this.scene as any;
    const items: any[] = scene.roomItems?.getAll?.() ?? [];
    return items
      .filter((item) => Array.isArray(item.item?.tags) && item.item.tags.includes("office:chair"))
      .sort((a, b) => String(a.roomItemId).localeCompare(String(b.roomItemId)))
      .map((item) => scene.isoGrid?.groundCenter?.(item.tileX, item.tileY) ?? { x: item.sprite.x, y: item.sprite.y })
      .filter(Boolean);
  }

  update(delta: number): void {
    this.sinceRefresh += delta;
    if (this.sinceRefresh >= REFRESH_MS) {
      this.sinceRefresh = 0;
      void this.refresh();
    }
    for (const system of this.pets.values()) system.update(delta);
    for (const system of this.butlers.values()) system.update(delta);
    for (const system of this.employees.values()) system.update(delta);
  }

  destroy(): void {
    this.destroyed = true;
    for (const system of this.pets.values()) system.destroy();
    for (const system of this.butlers.values()) system.destroy();
    for (const system of this.employees.values()) system.destroy();
    this.pets.clear();
    this.butlers.clear();
    this.employees.clear();
  }
}
