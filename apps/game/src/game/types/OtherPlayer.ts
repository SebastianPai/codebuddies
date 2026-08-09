import ModularPlayer from "../players/ModularPlayer";
import PlayerHUD from "../hud/PlayerHUD";

export interface OtherPlayer extends ModularPlayer {
  playerId: string;
  hud: PlayerHUD;
}
