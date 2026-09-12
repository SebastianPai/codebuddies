import Phaser from "phaser";
import IsoGrid from "./IsoGrid";
import { depthFromGroundPoint } from "./IsoDepth";
import { HUD_DEPTH } from "../utils/depth";

/**
 * Overlay de depuración espacial. Apagado por defecto; se alterna con F9 o
 * poniendo `window.__isoDebug = true` desde la consola.
 *
 * Existe porque toda la calibración geométrica de este juego se había hecho
 * "a ojo", y verificar a ojo es exactamente lo que produjo tres espacios de
 * coordenadas incompatibles. Dibuja, en coordenadas de mundo reales:
 *
 *   cian      rombo de suelo DERIVADO del tile bajo el cursor + su ancla
 *   verde     punto de apoyo del jugador (pies medidos) y de cada NPC
 *   magenta   origen del Container del jugador (para ver footOffsetY)
 *   naranja   tiles del footprint del mueble bajo el cursor + su ancla
 *
 * Si el rombo cian no coincide con el rombo dibujado del tileset, la
 * geometría está mal; no hay que interpretar nada más.
 */
type DebugTarget = {
  label: string;
  groundX: number;
  groundY: number;
  originY?: number;
  /** Texto libre extra (p. ej. el desglose de la medición de los pies). */
  detail?: string;
};

// Interruptor accesible desde la consola del navegador sin recargar.
type DebugWindow = Window & { __isoDebug?: boolean };

function debugWindow(): DebugWindow {
  return window as DebugWindow;
}

export default class IsoDebugOverlay {
  private scene: Phaser.Scene;
  private grid?: IsoGrid;
  private gfx?: Phaser.GameObjects.Graphics;
  private text?: Phaser.GameObjects.Text;
  private enabled = false;
  private keyHandler?: (event: KeyboardEvent) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.keyHandler = (event: KeyboardEvent) => {
      if (event.key === "F9") {
        event.preventDefault();
        this.setEnabled(!this.enabled);
      }
    };
    window.addEventListener("keydown", this.keyHandler);

    if (typeof window !== "undefined" && debugWindow().__isoDebug) {
      this.setEnabled(true);
    }
  }

  setGrid(grid: IsoGrid | undefined) {
    this.grid = grid;
  }

  isEnabled() {
    return this.enabled;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    debugWindow().__isoDebug = enabled;

    if (!enabled) {
      this.gfx?.destroy();
      this.text?.destroy();
      this.gfx = undefined;
      this.text = undefined;
      return;
    }

    this.gfx = this.scene.add.graphics().setDepth(HUD_DEPTH + 100);
    this.text = this.scene.add
      .text(8, 8, "", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#eaeaea",
        backgroundColor: "#000000cc",
        padding: { x: 6, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH + 101);
  }

  /**
   * @param targets  actores a marcar (jugador, NPC), con su punto de apoyo.
   * @param footprintTiles  tiles ocupados por el mueble bajo el cursor.
   */
  update(
    pointer: Phaser.Input.Pointer,
    targets: DebugTarget[],
    footprintTiles?: { x: number; y: number }[],
  ) {
    if (!this.enabled || !this.gfx || !this.text || !this.grid) return;

    const grid = this.grid;
    const gfx = this.gfx;
    gfx.clear();

    const lines: string[] = [grid.describe()];

    // ── tile bajo el cursor ────────────────────────────────────────────
    const world = grid.pointerToWorld(this.scene.cameras.main, pointer);
    const tile = grid.worldToTileFloored(world.x, world.y);

    if (tile) {
      const diamond = grid.groundDiamond(tile.x, tile.y);
      const anchor = grid.groundAnchor(tile.x, tile.y);

      if (diamond && anchor) {
        gfx.lineStyle(1.5, 0x22d3ee, 1);
        gfx.strokePoints(
          diamond.map((p) => new Phaser.Geom.Point(p.x, p.y)),
          true,
        );
        gfx.fillStyle(0x22d3ee, 1);
        gfx.fillCircle(anchor.x, anchor.y, 3);

        lines.push(
          `cursor  mundo (${world.x.toFixed(0)}, ${world.y.toFixed(0)})  tile (${tile.x}, ${tile.y})`,
          `        ancla de suelo (${anchor.x.toFixed(0)}, ${anchor.y.toFixed(0)})  suelo dibujado=${grid.hasGroundTile(tile.x, tile.y)}`,
        );
      }
    } else {
      lines.push(`cursor  mundo (${world.x.toFixed(0)}, ${world.y.toFixed(0)})  fuera del mapa`);
    }

    // ── footprint del mueble bajo el cursor ────────────────────────────
    if (footprintTiles?.length) {
      gfx.lineStyle(1.5, 0xf59e0b, 1);
      for (const t of footprintTiles) {
        const d = grid.groundDiamond(t.x, t.y);
        if (!d) continue;
        gfx.strokePoints(
          d.map((p) => new Phaser.Geom.Point(p.x, p.y)),
          true,
        );
      }
      const fa = grid.footprintAnchor(footprintTiles);
      if (fa) {
        gfx.fillStyle(0xf59e0b, 1);
        gfx.fillCircle(fa.x, fa.y, 4);
        lines.push(
          `mueble  ${footprintTiles.length} tiles  ancla (${fa.x.toFixed(0)}, ${fa.y.toFixed(0)})  frontal (${fa.frontTile.x}, ${fa.frontTile.y})`,
        );
      }
    }

    // ── actores ────────────────────────────────────────────────────────
    for (const target of targets) {
      gfx.fillStyle(0x4ade80, 1);
      gfx.fillCircle(target.groundX, target.groundY, 4);
      gfx.lineStyle(1, 0x4ade80, 0.7);
      gfx.strokeEllipse(
        target.groundX,
        target.groundY,
        grid.tileWidth * 0.6,
        grid.tileHeight * 0.5,
      );

      if (target.originY !== undefined) {
        gfx.fillStyle(0xf472b6, 1);
        gfx.fillCircle(target.groundX, target.originY, 3);
        gfx.lineStyle(1, 0xf472b6, 0.6);
        gfx.lineBetween(
          target.groundX,
          target.originY,
          target.groundX,
          target.groundY,
        );
      }

      const gt = grid.worldToGroundTile(target.groundX, target.groundY);
      const depth = depthFromGroundPoint(grid, target.groundX, target.groundY);
      const foot =
        target.originY !== undefined
          ? `  footOffsetY=${(target.groundY - target.originY).toFixed(0)}`
          : "";

      lines.push(
        `${target.label.padEnd(7)} apoyo (${target.groundX.toFixed(0)}, ${target.groundY.toFixed(0)})  tile (${gt ? gt.x.toFixed(2) : "?"}, ${gt ? gt.y.toFixed(2) : "?"})  depth ${depth.toFixed(0)}${foot}`,
      );

      if (target.detail) {
        lines.push(`        ${target.detail}`);
      }
    }

    this.text.setText(lines.join("\n"));
  }

  destroy() {
    if (this.keyHandler) {
      window.removeEventListener("keydown", this.keyHandler);
      this.keyHandler = undefined;
    }
    this.gfx?.destroy();
    this.text?.destroy();
    this.gfx = undefined;
    this.text = undefined;
    this.grid = undefined;
  }
}
