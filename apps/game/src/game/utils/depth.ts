// Los objetos del mundo (muebles, avatares) se ordenan con la fórmula
// tileY*1000+tileX(+elevación*100) — ver RoomItemsManager.ts y
// LobbyScene.updateSceneDepths(). Todo lo que vive en las constantes de acá
// abajo debe quedar muy por encima de cualquier valor posible de esa
// fórmula, para no desaparecer detrás de un mueble o del propio jugador en
// filas alejadas del origen del mapa.
//
// Bug real que esto reemplaza: HUD_DEPTH era 10000 (menor que tileY*1000
// para cualquier fila >= 10), y el resaltado de tile / footprint de
// construcción tenían el mismo problema con valores de 150 y 9 — cada uno
// era una constante mágica independiente, fácil de desincronizar. Ahora hay
// una sola fuente de verdad.

// Resaltado de tile bajo el cursor y footprint de construcción: por encima
// de cualquier mueble/avatar real, pero debajo del HUD. Queda cerca del
// depth que ya usaba BuildSystem.preview (999999) para no invertir su orden.
export const WORLD_OVERLAY_DEPTH = 999_997;

// Nombre, chat e insignias del jugador: siempre por encima de absolutamente
// todo lo demás del mundo.
export const HUD_DEPTH = 2_000_000;

// Oscuridad ambiental (Editar Mundo -> Apariencia -> Iluminación, Premium):
// por encima de piso/muebles/avatares para que los atenúe a todos por igual,
// pero por debajo de HUD_DEPTH para que nombre/chat/insignias seas siempre
// legibles encima de la sala a oscuras.
export const AMBIENT_LIGHT_DEPTH = HUD_DEPTH - 10;
