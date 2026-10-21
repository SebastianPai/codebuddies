/**
 * Recorta UNA imagen sprite sheet (cuadrícula de filas × columnas) en los
 * cuadros sueltos que espera `POST /uploads/frames`.
 *
 * Por qué en el navegador y no un endpoint nuevo: el backend ya valida y
 * compone el atlas a partir de cuadros sueltos (formato real, dimensiones
 * idénticas, límites, píxeles clickeables). Recortando acá, una hoja completa
 * pasa por exactamente ese mismo camino y no hay una segunda implementación
 * de las reglas del atlas que se pueda desalinear.
 *
 * Convención de la hoja = la del atlas (ver frame-atlas.ts en la API):
 * cada FILA es una dirección (vista) y cada COLUMNA un cuadro de la
 * animación. Los cuadros se devuelven fila por fila, que es el orden en que
 * el backend los ubica (`frames[direction * framesCount + frame]`).
 */

export type SheetGrid = { cols: number; rows: number };

/**
 * Cuadrícula probable de una hoja: `rows` lo dicta la animación (una fila
 * por dirección) y las columnas se deducen suponiendo cuadros cuadrados,
 * que es lo más común en pixel art isométrico. El admin la puede corregir.
 */
export function guessSheetGrid(width: number, height: number, rows: number): SheetGrid {
  const safeRows = Math.max(1, Math.trunc(rows) || 1);
  const cellHeight = height / safeRows;
  const cols = cellHeight > 0 ? Math.max(1, Math.round(width / cellHeight)) : 1;
  return { cols, rows: safeRows };
}

/** ¿La hoja se divide en celdas enteras con esa cuadrícula? */
export function gridFits(width: number, height: number, grid: SheetGrid): boolean {
  return (
    grid.cols >= 1 &&
    grid.rows >= 1 &&
    width % grid.cols === 0 &&
    height % grid.rows === 0
  );
}

/** Nombre con relleno de ceros: el ordenamiento por nombre conserva el orden. */
export function frameFileName(index: number): string {
  return `frame_${String(index).padStart(4, "0")}.png`;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen"));
    };
    img.src = url;
  });
}

export async function readSheetSize(file: File): Promise<{ width: number; height: number }> {
  const img = await loadImage(file);
  return { width: img.naturalWidth, height: img.naturalHeight };
}

/** Corta la hoja en `rows × cols` PNG, en orden fila por fila. */
export async function sliceSheet(file: File, grid: SheetGrid): Promise<File[]> {
  const img = await loadImage(file);
  const width = img.naturalWidth;
  const height = img.naturalHeight;
  if (!gridFits(width, height, grid)) {
    throw new Error(
      `La imagen (${width}×${height}) no se divide exacto en ${grid.cols} columnas × ${grid.rows} filas.`,
    );
  }

  const cellWidth = width / grid.cols;
  const cellHeight = height / grid.rows;
  const canvas = document.createElement("canvas");
  canvas.width = cellWidth;
  canvas.height = cellHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("El navegador no permite recortar imágenes");
  ctx.imageSmoothingEnabled = false;

  const files: File[] = [];
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      ctx.clearRect(0, 0, cellWidth, cellHeight);
      ctx.drawImage(img, col * cellWidth, row * cellHeight, cellWidth, cellHeight, 0, 0, cellWidth, cellHeight);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("No se pudo recortar la imagen");
      files.push(new File([blob], frameFileName(row * grid.cols + col), { type: "image/png" }));
    }
  }
  return files;
}
