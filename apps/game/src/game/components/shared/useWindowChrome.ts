"use client";

import { useViewportMode } from "../../hooks/useViewportMode";

interface DraggableChromeProps {
  disabled?: boolean;
  bounds?: "parent";
}

export interface WindowChrome {
  isCoarsePointer: boolean;
  /** true en compact (teléfonos): la ventana pasa a ocupar toda la pantalla
   *  como una hoja fija, así que arrastrarla no tiene sentido. */
  isSheet: boolean;
  /** Props para pasarle directo a <Draggable {...draggableProps}>.
   *  - desktop: {} (comportamiento actual, sin límites, tal cual hoy)
   *  - tablet: bounds="parent" para que no se pueda arrastrar fuera del
   *    viewport (el nodo padre de estas ventanas ya es de tamaño completo:
   *    Modal.floatingLayer, RoomList.overlay, o .game-wrapper directamente)
   *  - compact: disabled, porque la ventana es una hoja fija */
  draggableProps: DraggableChromeProps;
}

// Punto único donde toda ventana arrastrable (Modal y las 5 que duplican su
// patrón) resuelve su comportamiento táctil/responsive, en vez de que cada
// una decida por su cuenta cuándo limitar el arrastre o volverse una hoja de
// pantalla completa.
export function useWindowChrome(): WindowChrome {
  const { layout, isCoarsePointer } = useViewportMode();

  if (layout === "compact") {
    return { isCoarsePointer, isSheet: true, draggableProps: { disabled: true } };
  }
  if (layout === "tablet") {
    return { isCoarsePointer, isSheet: false, draggableProps: { bounds: "parent" } };
  }
  return { isCoarsePointer, isSheet: false, draggableProps: {} };
}
