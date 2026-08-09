import { Player } from "../types/player";
import { OtherPlayer } from "../types/OtherPlayer";
import { LobbySceneType } from "../types/LobbySceneType";
import { audioManager } from "../audio/AudioManager";

export default class PlayerSocketSystem {
  private scene: LobbySceneType;

  private socket: any;

  constructor(scene: LobbySceneType, socket: any) {
    this.scene = scene;
    this.socket = socket;
  }

  private handleNewPlayer = (playerData: Player) => {
    if (playerData.id !== this.socket.id) {
      (this.scene as any).addOtherPlayer(playerData);
    }
  };

  private handlePlayerMoved = (playerData: any) => {
    (this.scene as any).otherPlayers.getChildren().forEach((child: any) => {
      const other = child as OtherPlayer;

      if (other.playerId !== playerData.id) return;

      other.move(playerData.x, playerData.y);

      if (playerData.isMoving && playerData.direction) {
        const dir = playerData.direction;

        if (!other.isMoving || other.currentDirection !== dir) {
          other.playAnimation(dir);
        }
      } else {
        other.playIdle();
      }
    });
  };

  private handlePlayerChat = (data: any) => {
    if (data.playerId === this.socket.id) {
      (this.scene as any).hud.showChat(data.message);

      return;
    }

    const other = (this.scene as any).otherPlayers
      .getChildren()
      .find((c: any) => c.playerId === data.playerId);

    other?.hud.showChat(data.message);
    audioManager.play("notify");
  };

  private handlePlayerReaction = (data: any) => {
    if (data.playerId === this.socket.id) {
      (this.scene as any).hud.showChat(data.reaction);

      return;
    }

    const other = (this.scene as any).otherPlayers
      .getChildren()
      .find((c: any) => c.playerId === data.playerId);

    other?.hud.showChat(data.reaction);
    audioManager.play("notify");
  };

  private handlePlayerDisconnected = (playerId: string) => {
    (this.scene as any).otherPlayers.getChildren().forEach((child: any) => {
      const other = child as OtherPlayer;

      if (other.playerId !== playerId) return;

      other.hud.destroy();
      other.destroy();
    });
  };

  private handlePlayerAvatarUpdated = (data: any) => {
    const slots = data.avatar.slots;

    const skinColor = data.avatar.skinColor;

    if (data.playerId === this.socket.id) {
      (this.scene as any).loadAvatarTextures(slots, () => {
        (this.scene as any).player.updateAvatar(slots, skinColor);

        (this.scene as any).player.playIdle();
      });

      return;
    }

    (this.scene as any).otherPlayers.getChildren().forEach((child: any) => {
      const other = child as OtherPlayer;

      if (other.playerId !== data.playerId) return;

      (this.scene as any).loadAvatarTextures(slots, () => {
        other.updateAvatar(slots, skinColor);

        other.playIdle();
      });
    });
  };

  initialize() {
    this.socket.on("newPlayer", this.handleNewPlayer);
    this.socket.on("playerMoved", this.handlePlayerMoved);
    this.socket.on("playerChat", this.handlePlayerChat);
    this.socket.on("playerReaction", this.handlePlayerReaction);
    this.socket.on("playerDisconnected", this.handlePlayerDisconnected);
    this.socket.on("playerAvatarUpdated", this.handlePlayerAvatarUpdated);
  }

  destroy() {
    this.socket.off("newPlayer", this.handleNewPlayer);
    this.socket.off("playerMoved", this.handlePlayerMoved);
    this.socket.off("playerChat", this.handlePlayerChat);
    this.socket.off("playerReaction", this.handlePlayerReaction);
    this.socket.off("playerDisconnected", this.handlePlayerDisconnected);
    this.socket.off("playerAvatarUpdated", this.handlePlayerAvatarUpdated);
  }
}
