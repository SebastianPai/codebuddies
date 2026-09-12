// Escalas de profundidad del juego.
//
// Los objetos del mundo (muebles, avatares, mascota, mayordomo) se ordenan
// con la regla isométrica de iso/IsoDepth.ts:
//
//     depth = (tx + ty)·1000 + elevation·100 + (tx − ty)
//
// El techo de esa fórmula es (ancho + alto)·1000, así que WORLD_OVERLAY_DEPTH
// deja sitio a mapas de hasta ~490×490 tiles. Las salas actuales son de 20×20
// (techo ≈ 38.500), o sea más de un orden de magnitud de margen.
//
// Bug real que estas constantes reemplazaron: cada overlay tenía su propio
// número mágico (HUD 10000, resaltado 150, footprint 9), todos por debajo de
// la profundidad de un mueble en cuanto la sala tenía unas pocas filas, así
// que el resaltado y el HUD desaparecían detrás del mundo.

// Suelo pintado sobre la capa de tiles (texturas de tipo FLOOR): por encima
// del tilemap, por debajo de cualquier objeto del mundo.
export const FLOOR_SURFACE_DEPTH = 1;

// Resaltado de tile bajo el cursor y footprint de construcción: por encima
// de cualquier mueble/avatar real, pero debajo del ghost que se está
// colocando y del HUD.
export const WORLD_OVERLAY_DEPTH = 999_997;

// Ghost del mueble "en mano" durante la construcción.
export const BUILD_PREVIEW_DEPTH = 999_999;

// Texturas de pared: se dibujan por encima de todo el mundo porque tapan la
// sala desde fuera del área jugable.
export const WALL_SURFACE_DEPTH = 1_000_000;

// Nombre, chat e insignias del jugador: siempre por encima de absolutamente
// todo lo demás del mundo.
export const HUD_DEPTH = 2_000_000;

// Oscuridad ambiental (Editar Mundo -> Apariencia -> Iluminación, Premium):
// por encima de piso/muebles/avatares para que los atenúe a todos por igual,
// pero por debajo de HUD_DEPTH para que nombre/chat/insignias sean siempre
// legibles encima de la sala a oscuras.
export const AMBIENT_LIGHT_DEPTH = HUD_DEPTH - 10;
