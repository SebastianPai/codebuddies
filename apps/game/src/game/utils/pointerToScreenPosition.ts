import Phaser from "phaser";

// pointer.x/y vienen en el espacio interno del canvas (que con Scale.RESIZE
// coincide con el tamaño real del contenedor, ver Game.tsx), no en
// coordenadas reales de la página — hace falta pasarlos por el bounding rect
// del canvas para que un overlay React posicionado con `position: fixed`
// caiga en el lugar correcto. Antes esto vivía duplicado como método privado
// de LobbyScene; se extrajo acá para que cualquier sistema (RoomItemsManager
// incluido) pueda anclar un popover al punto de clic sin repetir la cuenta.
export function pointerToScreenPosition(
  scene: Phaser.Scene,
  pointer: Phaser.Input.Pointer,
): { x: number; y: number } {
  const rect = scene.sys.game.canvas.getBoundingClientRect();
  const scaleX = rect.width / scene.scale.width;
  const scaleY = rect.height / scene.scale.height;

  return {
    x: rect.left + pointer.x * scaleX,
    y: rect.top + pointer.y * scaleY,
  };
}
