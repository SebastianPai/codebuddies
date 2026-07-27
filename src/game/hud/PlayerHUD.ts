import Phaser from "phaser";
import ModularPlayer from "../players/ModularPlayer";

export interface HUDConfig {
  scene: Phaser.Scene;
  playerSprite: ModularPlayer | null;
  username: string;
  level?: number;
}

export default class PlayerHUD {
  // Sin esto, el nametag quedaba con depth por defecto (0) y los muebles
  // (depth ~ y*1000, ver FurnitureSocketSystem) lo tapaban por completo.
  // Mismo valor que usa chatText, para que el nametag siempre flote por
  // encima de cualquier objeto del mundo.
  private static readonly HUD_DEPTH = 10000;

  private scene: Phaser.Scene;
  private sprite: ModularPlayer | null;
  private usernameText: Phaser.GameObjects.Text;
  private chatText?: Phaser.GameObjects.Text;

  constructor(config: HUDConfig) {
    this.scene = config.scene;
    this.sprite = config.playerSprite;
    const HUD_DEPTH = PlayerHUD.HUD_DEPTH;

    // Nombre y nivel en un solo texto/pill en vez de dos líneas flotantes con
    // estilos distintos (blanco+fondo vs. verde suelto): quedaba desprolijo
    // y no se leía como una sola etiqueta de jugador.
    const label =
      config.level !== undefined ? `${config.username}  ·  Lv.${config.level}` : config.username;

    // Ocultos si no hay sprite todavía; update() los posiciona y muestra.
    this.usernameText = this.scene.add
      .text(0, 0, label, {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        color: "#f8fafc",
        fontStyle: "bold",
        backgroundColor: "rgba(10, 12, 16, 0.72)",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(HUD_DEPTH)
      .setVisible(!!this.sprite);
  }

  update() {
    // Si no hay sprite → no hacemos nada (evita errores)
    if (!this.sprite) {
      return;
    }

    // Ahora sí sincronizamos posición
    this.usernameText.setPosition(this.sprite.x, this.sprite.y - 50);
    this.usernameText.setVisible(true);

    if (this.chatText) {
      this.chatText.setPosition(this.sprite.x, this.sprite.y - 100);
      this.chatText.setDepth(PlayerHUD.HUD_DEPTH);
    }
  }

  // Objetos Phaser que componen el HUD, para que la escena pueda excluirlos
  // de otras cámaras (p. ej. el minimapa) sin depender de propiedades internas.
  getDisplayObjects(): Phaser.GameObjects.GameObject[] {
    return [this.usernameText, this.chatText].filter(Boolean) as Phaser.GameObjects.GameObject[];
  }

  showChat(message: string, duration = 3000) {
    if (this.chatText) this.chatText.destroy();

    // Creamos el chat solo si ya hay sprite (para evitar null)
    if (!this.sprite) {
      console.warn("[PlayerHUD] No se puede mostrar chat: sprite es null");
      return;
    }

    this.chatText = this.scene.add
      .text(this.sprite.x, this.sprite.y - 100, message, {
        fontSize: "14px",
        color: "#ffff00",
        backgroundColor: "rgba(0,0,0,0.8)",
        padding: { x: 8, y: 6 },
        wordWrap: { width: 200 },
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(PlayerHUD.HUD_DEPTH);

    this.scene.time.delayedCall(duration, () => {
      this.chatText?.destroy();
      this.chatText = undefined;
    });
  }

  destroy() {
    this.usernameText.destroy();
    this.chatText?.destroy();
  }

  // Método para asignar el sprite después (lo llamas desde LobbyScene)
  setPlayerSprite(sprite: ModularPlayer) {
    this.sprite = sprite;
    // Forzamos una actualización inmediata para que aparezcan los textos
    this.update();
  }
}
