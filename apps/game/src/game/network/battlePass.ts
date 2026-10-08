// network/battlePass.ts — cliente REST de /battle-pass (ver apps/api BattlePassController)

import { apiPost } from "./http";

// Pase diario: cada día que se entra al juego desbloquea el siguiente. El
// servidor ignora las llamadas repetidas del mismo día.
export function checkInBattlePass(): Promise<void> {
  return apiPost<{ ok: boolean }>("/battle-pass/check-in", {}).then(
    () => undefined,
    () => undefined,
  );
}
