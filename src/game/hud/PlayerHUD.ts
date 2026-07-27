import Phaser from "phaser";
import ModularPlayer from "../players/ModularPlayer";

export interface HUDConfig {
  scene: Phaser.Scene;
  playerSprite: ModularPlayer | null;
  username: string;
  level?: number;
  coins?: number;
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
  private levelText?: Phaser.GameObjects.Text;
  private coinsText?: Phaser.GameObjects.Text;
  private chatText?: Phaser.GameObjects.Text;

  constructor(config: HUDConfig) {
    this.scene = config.scene;
    this.sprite = config.playerSprite;
    const HUD_DEPTH = PlayerHUD.HUD_DEPTH;

    // Creamos los textos con posición temporal (0,0) y ocultos si no hay sprite
    this.usernameText = this.scene.add
      .text(0, 0, config.username, {
        fontSize: "14px",
        color: "#ffffff",
        fontStyle: "bold",
        backgroundColor: "rgba(0,0,0,0.5)",
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(HUD_DEPTH)
      .setVisible(!!this.sprite); // visible solo si ya hay sprite

    if (config.level !== undefined) {
      this.levelText = this.scene.add
        .text(0, 0, `Lvl ${config.level}`, {
          fontSize: "12px",
          color: "#00ff00",
        })
        .setOrigin(0.5)
        .setDepth(HUD_DEPTH)
        .setVisible(!!this.sprite);
    }

    if (config.coins !== undefined) {
      this.coinsText = this.scene.add
        .text(0, 0, `💰 ${config.coins}`, {
          fontSize: "12px",
          color: "#ffd700",
        })
        .setOrigin(0.5)
        .setDepth(HUD_DEPTH)
        .setVisible(!!this.sprite);
    }
  }

  update() {
    // Si no hay sprite → no hacemos nada (evita errores)
    if (!this.sprite) {
      return;
    }

    // Ahora sí sincronizamos posición
    this.usernameText.setPosition(this.sprite.x, this.sprite.y - 50);
    this.usernameText.setVisible(true);

    if (this.levelText) {
      this.levelText.setPosition(this.sprite.x, this.sprite.y - 70);
      this.levelText.setVisible(true);
    }

    if (this.coinsText) {
      this.coinsText.setPosition(this.sprite.x, this.sprite.y - 85);
      this.coinsText.setVisible(true);
    }

    if (this.chatText) {
      this.chatText.setPosition(this.sprite.x, this.sprite.y - 100);
      this.chatText.setDepth(PlayerHUD.HUD_DEPTH);
    }
  }

  // Objetos Phaser que componen el HUD, para que la escena pueda excluirlos
  // de otras cámaras (p. ej. el minimapa) sin depender de propiedades internas.
  getDisplayObjects(): Phaser.GameObjects.GameObject[] {
    return [this.usernameText, this.levelText, this.coinsText, this.chatText].filter(
      Boolean,
    ) as Phaser.GameObjects.GameObject[];
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
    this.levelText?.destroy();
    this.coinsText?.destroy();
    this.chatText?.destroy();
  }

  // Método para asignar el sprite después (lo llamas desde LobbyScene)
  setPlayerSprite(sprite: ModularPlayer) {
    this.sprite = sprite;
    // Forzamos una actualización inmediata para que aparezcan los textos
    this.update();
  }
}
