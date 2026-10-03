import Phaser from "phaser";
import PetSystem from "./PetSystem";
import ButlerSystem from "./ButlerSystem";
import EmployeeAvatarSystem from "./EmployeeAvatarSystem";
import type { AvatarSlot } from "../types/avatar";
import { getRoomPets } from "../network/pets";
import { getRoomButlers, type ButlerNpc } from "../network/butlers";
import { getOfficeRoomEmployees } from "../network/codestudio";

// Mascotas y mayordomos de OTRAS personas que están "sacados" en esta sala:
// los ve cualquiera que entre, no solo su dueño. Los propios los siguen
// manejando PetSystem/ButlerSystem en modo "mío" (LobbyScene). Cada cliente
// simula su comportamiento por su cuenta (es decorativo, no se sincroniza
// la posición exacta).

const REFRESH_MS = 30_000;
// Una charla entre empleados cada tanto; todos los que miran ven la misma
// (se elige por la hora) y cada frase sale un poco después de la anterior.
const TALK_EVERY_MS = 26_000;
const TALK_LINE_GAP_MS = 2800;

export default class RoomCompanions {
  private pets = new Map<string, PetSystem>();
  private butlers = new Map<string, ButlerSystem>();
  // Empleados de CodeStudio si esta sala es la oficina de una empresa.
  private employees = new Map<string, ButlerSystem | EmployeeAvatarSystem>();
  private sinceRefresh = 0;
  private conversations: Array<Array<{ employeeId: string; text: string }>> = [];
  private lastTalkSlot = -1;
  private talkTimers: Phaser.Time.TimerEvent[] = [];
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
        getOfficeRoomEmployees(roomId).catch(() => ({ company: null, employees: [], conversations: [] })),
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

      this.conversations = office.conversations ?? [];
      const employeeIds = new Set<string>();
      const visible = office.employees.filter((employee) => !!employee.npc?.spriteSheetUrl || !!employee.avatar);
      visible.forEach((employee, index) => {
        employeeIds.add(employee.id);
        const existing = this.employees.get(employee.id);
        const lines = employee.lines ?? employee.npc?.idleLines ?? [];
        // El de mejor rendimiento se queda con la primera silla, igual que
        // en el cálculo de puestos del servidor.
        const seat = () => this.officeChairs()[index] ?? null;
        const onSelect = () =>
          window.dispatchEvent(new CustomEvent("codestudio:employee-selected", { detail: { employee, companyName: office.company?.name ?? "" } }));
        if (existing) {
          if (existing instanceof EmployeeAvatarSystem) existing.setLines(lines);
          else existing.setLines(employee.npc?.greetingLines ?? [], lines);
          return;
        }
        // Por piezas (como un jugador) o con skin completa.
        if (!employee.npc && employee.avatar) {
          const system = new EmployeeAvatarSystem(this.scene, {
            id: employee.id,
            name: employee.name,
            subtitle: employee.roleName,
            avatar: { skinColor: employee.avatar.skinColor, slots: employee.avatar.slots as AvatarSlot[] },
            lines,
            greeting: lines[0] ?? null,
            wanderRadius: 240,
            seat,
            onSelect,
          });
          this.employees.set(employee.id, system);
          system.sync();
          return;
        }
        if (!employee.npc) return;
        const npc = { ...employee.npc, name: employee.name, animations: (employee.npc.animations ?? []) as ButlerNpc["animations"] } as ButlerNpc;
        const system = new ButlerSystem(
          this.scene,
          { id: employee.id, npcKey: npc.key, name: employee.name, activeRoomId: roomId, ownerUsername: "" },
          npc,
          {
            nameplate: { name: employee.name, subtitle: employee.roleName },
            wanderRadius: 240,
            colorSeed: employee.id,
            seat,
            onSelect,
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
    this.playConversation();
  }

  private playConversation(): void {
    if (this.conversations.length === 0 || this.employees.size < 2) return;
    const slot = Math.floor(Date.now() / TALK_EVERY_MS);
    if (slot === this.lastTalkSlot) return;
    const first = this.lastTalkSlot === -1;
    this.lastTalkSlot = slot;
    // Al entrar no arranca a mitad de una charla: espera a la siguiente.
    if (first) return;
    const conversation = this.conversations[slot % this.conversations.length];
    conversation.forEach((line, index) => {
      this.talkTimers.push(
        this.scene.time.delayedCall(index * TALK_LINE_GAP_MS, () => this.employees.get(line.employeeId)?.speak(line.text)),
      );
    });
    this.talkTimers = this.talkTimers.filter((timer) => timer.getOverallProgress() < 1);
  }

  destroy(): void {
    this.destroyed = true;
    for (const timer of this.talkTimers) timer.remove(false);
    this.talkTimers = [];
    for (const system of this.pets.values()) system.destroy();
    for (const system of this.butlers.values()) system.destroy();
    for (const system of this.employees.values()) system.destroy();
    this.pets.clear();
    this.butlers.clear();
    this.employees.clear();
  }
}
