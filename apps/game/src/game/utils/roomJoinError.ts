// Por qué no se pudo entrar a una sala, en palabras: el servidor manda un
// código (room:join:error.reason) y antes se mostraba tal cual ("ROOM_FULL").
const KNOWN = ["ROOM_FULL", "INVITE_ONLY", "REQUEST", "ROOM_NOT_FOUND", "DESIGN_PRIVATE", "TIMEOUT"] as const;

export function roomJoinErrorMessage(t: (key: string) => string, reason?: string | null) {
  const code = String(reason ?? "");
  if ((KNOWN as readonly string[]).includes(code)) return t(`rooms.joinError_${code}`);
  return code && !/^[A-Z_]+$/.test(code) ? code : t("rooms.listJoinErrorMessage");
}
