"use client";
// TEMPORAL (no se commitea): dos pilas de globos juntas para ver que no se tapen.
import { useEffect, useRef } from "react";
import { BubbleStack, createBubbleElement } from "../../../game/hud/domHud";
import { resolveChatBubbleTheme } from "../../../game/hud/nameplateStyles";
export default function P() {
  const a = useRef<HTMLDivElement>(null);
  const b = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sa = new BubbleStack();
    const sb = new BubbleStack();
    a.current!.appendChild(sa.element);
    b.current!.appendChild(sb.element);
    const lines = ["¡Pan comido!", "Mateo, ¿te encargas de «Error 500 en horas pico»?", "Uf, este está difícil...", "¡Grande!", "Lo anoto en el tablero."];
    let i = 0;
    const say = () => {
      const stack = i % 2 === 0 ? sa : sb;
      stack.push(createBubbleElement({ message: lines[i % lines.length], theme: resolveChatBubbleTheme(i % 2 ? "midnight" : "gold"), name: i % 2 ? "Sofía" : "Mateo" }), performance.now(), 12000);
      i++;
    };
    const timer = setInterval(say, 700);
    let raf = 0;
    const loop = () => { sa.update(performance.now()); sb.update(performance.now()); raf = requestAnimationFrame(loop); };
    loop();
    setTimeout(() => clearInterval(timer), 700 * 5);
    return () => { clearInterval(timer); cancelAnimationFrame(raf); };
  }, []);
  return (
    <div style={{ background: "#2a3b2a", height: "100vh", position: "relative" }}>
      <div ref={a} style={{ position: "absolute", left: 300, top: 500, width: 0, height: 0 }} />
      <div ref={b} style={{ position: "absolute", left: 360, top: 510, width: 0, height: 0 }} />
    </div>
  );
}
