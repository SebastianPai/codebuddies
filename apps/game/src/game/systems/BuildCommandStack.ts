// Pila de deshacer/rehacer del modo construcción. Reusa el contrato de
// sockets existente (room:item:move/rotate) en vez de inventar un concepto
// de undo en el servidor: el servidor ya re-valida cada acción igual que si
// viniera del flujo normal, así que deshacer/rehacer es simplemente "volver
// a emitir la acción con los valores de antes/después".
//
// Alcance deliberado: solo move y rotate. Colocar/eliminar quedan afuera a
// propósito — deshacer un "eliminar" implicaría re-crear el item y esperar
// a que el servidor le asigne un id NUEVO antes de poder deshacer una acción
// posterior sobre ese mismo item (correlación que hoy no existe en el
// contrato de sockets). Mover y rotar no tienen ese problema: el roomItemId
// nunca cambia, así que son seguros de deshacer/rehacer sin ambigüedad.
export type BuildCommand =
  | {
      type: "move";
      roomItemId: string;
      from: { x: number; y: number; rotation: number };
      to: { x: number; y: number; rotation: number };
    }
  | {
      type: "rotate";
      roomItemId: string;
    };

const MAX_DEPTH = 50;

// Nombre del evento que el panel de construcción (React, fuera de Phaser)
// escucha para saber si debe habilitar/deshabilitar sus botones de
// deshacer/rehacer — se dispara acá mismo, en el único lugar que conoce el
// estado real de las dos pilas, en vez de que LobbyScene tenga que
// recordarlo después de cada mutación.
export const BUILD_COMMAND_STACK_CHANGED_EVENT = "build:command:stackChanged";

export default class BuildCommandStack {
  private undoStack: BuildCommand[] = [];

  private redoStack: BuildCommand[] = [];

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  private emitChange() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent(BUILD_COMMAND_STACK_CHANGED_EVENT, {
        detail: { canUndo: this.canUndo(), canRedo: this.canRedo() },
      }),
    );
  }

  push(command: BuildCommand) {
    this.undoStack.push(command);
    if (this.undoStack.length > MAX_DEPTH) this.undoStack.shift();
    // Cualquier acción nueva invalida el "futuro" que se podía rehacer.
    this.redoStack = [];
    this.emitChange();
  }

  undo(): BuildCommand | undefined {
    const command = this.undoStack.pop();
    if (command) this.redoStack.push(command);
    this.emitChange();
    return command;
  }

  redo(): BuildCommand | undefined {
    const command = this.redoStack.pop();
    if (command) this.undoStack.push(command);
    this.emitChange();
    return command;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.emitChange();
  }
}
