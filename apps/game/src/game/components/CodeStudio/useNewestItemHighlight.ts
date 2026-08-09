import { useEffect, useRef, useState } from "react";

// El propio `.cs-view` es el unico contenedor con scroll interno del
// simulador de PC — usar element.scrollIntoView() de forma directa hace que
// el navegador tambien mueva ancestros mas arriba (hasta la pagina que
// envuelve al PC entero), asi que en vez de eso calculamos el scroll a mano
// y lo aplicamos solo dentro de ese contenedor.
function scrollWithinPanel(card: HTMLElement | null) {
  if (!card) return;
  const container = card.closest<HTMLElement>(".cs-view") ?? card.parentElement;
  if (!container) return;
  const containerRect = container.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  const offset = cardRect.top - containerRect.top - container.clientHeight / 2 + cardRect.height / 2;
  container.scrollBy({ top: offset, behavior: "smooth" });
}

// Cuando un listado crece (se contrata un empleado, se instala infra), hace
// scroll automatico hasta la tarjeta nueva y la resalta un momento — sin
// esto el jugador se queda mirando la seccion de arriba sin notar que la
// accion ya tuvo efecto mas abajo en la pantalla.
export function useNewestItemHighlight(count: number) {
  const previousCountRef = useRef(count);
  const cardRefs = useRef<Array<HTMLElement | null>>([]);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);

  useEffect(() => {
    if (count > previousCountRef.current) {
      const newIndex = count - 1;
      setHighlightIndex(newIndex);
      scrollWithinPanel(cardRefs.current[newIndex]);
      const timer = window.setTimeout(() => setHighlightIndex(null), 2200);
      previousCountRef.current = count;
      return () => window.clearTimeout(timer);
    }
    previousCountRef.current = count;
  }, [count]);

  const registerRef = (index: number) => (el: HTMLElement | null) => {
    cardRefs.current[index] = el;
  };

  return { highlightIndex, registerRef };
}
