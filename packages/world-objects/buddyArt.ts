// Dibujo de Buddy (el robot del logo) en SVG, con una cara por ánimo. Es
// texto para poder usarlo igual en React (web), en el iframe de los
// ejercicios y en los videos (HTML). Cabeza blanca, pantalla oscura con la
// cara en verde menta, orejas y antena azules.
import type { BuddyMood } from './buddy';

const INK = '#1e2235';
const SCREEN = '#232741';
const SHELL = '#f7f5ef';
const SHADE = '#cfe0f5';
const BLUE = '#3b82f6';
const MINT = '#5fd3a6';

const stroke = (d: string, width = 7) =>
  `<path d="${d}" fill="none" stroke="${MINT}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
const dot = (x: number, y: number, r = 6.5) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${MINT}"/>`;

const FACES: Record<BuddyMood, string> = {
  normal: dot(80, 108) + dot(120, 108) + stroke('M86 128 Q100 138 114 128'),
  feliz: stroke('M70 113 Q80 99 90 113') + stroke('M110 113 Q120 99 130 113') + stroke('M83 126 Q100 143 117 126'),
  riendo:
    stroke('M70 111 Q80 98 90 111') +
    stroke('M110 111 Q120 98 130 111') +
    `<path d="M80 123 H120 Q118 148 100 148 Q82 148 80 123 Z" fill="${MINT}"/>` +
    `<path d="M88 140 Q100 134 112 140 Q106 147 100 147 Q94 147 88 140 Z" fill="#2f9e78"/>`,
  triste:
    dot(80, 112, 6) +
    dot(120, 112, 6) +
    stroke('M70 100 L88 96', 5) +
    stroke('M130 100 L112 96', 5) +
    stroke('M86 138 Q100 127 114 138'),
  dormido:
    stroke('M71 112 Q80 117 89 112', 6) +
    stroke('M111 112 Q120 117 129 112', 6) +
    `<circle cx="100" cy="134" r="5" fill="none" stroke="${MINT}" stroke-width="5"/>`,
  sorprendido:
    `<circle cx="80" cy="106" r="9" fill="none" stroke="${MINT}" stroke-width="6"/>` +
    `<circle cx="120" cy="106" r="9" fill="none" stroke="${MINT}" stroke-width="6"/>` +
    `<circle cx="100" cy="134" r="8" fill="${MINT}"/>`,
  cansado:
    stroke('M70 108 H90', 6) +
    dot(80, 114, 5) +
    stroke('M110 108 H130', 6) +
    dot(120, 114, 5) +
    stroke('M86 135 Q93 130 100 135 Q107 140 114 135', 6),
};

const ANTENNA: Record<BuddyMood, string> = {
  normal: BLUE,
  feliz: BLUE,
  riendo: '#facc15',
  triste: '#7c93b8',
  dormido: '#6b7280',
  sorprendido: '#f472b6',
  cansado: '#94a3b8',
};

/** SVG de Buddy. `size` en px; el viewBox es 200x200. */
export function buddySvg(mood: BuddyMood = 'normal', size = 200, className = ''): string {
  const face = FACES[mood] ?? FACES.normal;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${size}" height="${size}"${className ? ` class="${className}"` : ''} role="img" aria-label="Buddy">
  <g class="buddy-antenna">
    <path d="M100 42 V60" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>
    <path d="M100 44 V58" stroke="${BLUE}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="100" cy="30" r="13" fill="${ANTENNA[mood] ?? BLUE}" stroke="${INK}" stroke-width="6"/>
  </g>
  <rect x="14" y="90" width="28" height="50" rx="12" fill="${BLUE}" stroke="${INK}" stroke-width="6"/>
  <rect x="158" y="90" width="28" height="50" rx="12" fill="${BLUE}" stroke="${INK}" stroke-width="6"/>
  <rect x="32" y="58" width="136" height="114" rx="42" fill="${SHELL}" stroke="${INK}" stroke-width="7"/>
  <path d="M44 92 Q40 140 64 162 Q46 160 40 140 Q36 110 44 92 Z" fill="${SHADE}"/>
  <rect x="52" y="78" width="96" height="76" rx="26" fill="${SCREEN}" stroke="${INK}" stroke-width="4"/>
  <g class="buddy-face">${face}</g>
</svg>`;
}
