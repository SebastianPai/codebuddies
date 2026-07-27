import * as Phaser from "phaser";
import LobbyScene from "./scenes/LobbyScene";

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#222",
  parent: "game-container",
  scene: [LobbyScene],
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  input: {
    // Por defecto Phaser también escucha mousedown/mouseup en `window` (no
    // solo en el canvas) para poder soltar un drag que termina fuera del
    // juego. El efecto secundario: un click en CUALQUIER botón del HUD (que
    // vive fuera del canvas) también se procesa como click dentro del juego,
    // en esas mismas coordenadas de pantalla — como si el panel no existiera.
    // Desactivarlo hace que sólo los clicks que caen realmente sobre el
    // canvas lleguen al juego, respetando el stacking normal del DOM.
    windowEvents: false,
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};
