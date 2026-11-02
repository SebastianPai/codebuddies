// Punto de aparición de la sala: ítem de categoría "spawn" (uno por sala,
// lo crea la API). Los jugadores aparecen sobre él; solo se ve en modo
// construcción, para poder moverlo.
export const SPAWN_CATEGORY = "spawn";

export const isSpawnItem = (item: any) => item?.category === SPAWN_CATEGORY;
