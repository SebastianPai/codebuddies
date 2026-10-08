import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Guardián de la migración del `behavior`.
 *
 * No necesita base de datos: comprueba sobre el SQL y sobre el schema que la
 * migración sea ADITIVA. La regla de compatibilidad del sistema entero es que
 * los objetos que ya existen no cambien en absoluto, y eso empieza por no
 * tocar ni una fila al migrar.
 *
 * Si alguien agrega un UPDATE, un DELETE o un DROP a este archivo de
 * migración, este test lo frena.
 *
 * (Vive en src/ y no junto a la migración porque el Jest de apps/api tiene
 * `rootDir: "src"` y no recogería un spec fuera de ahí.)
 */
const PRISMA_DIR = join(__dirname, '..', '..', '..', '..', 'prisma');
const MIGRATION_DIR = '20260919000000_add_world_item_behavior';

const migrationSql = readFileSync(
  join(PRISMA_DIR, 'migrations', MIGRATION_DIR, 'migration.sql'),
  'utf-8',
);

const schema = readFileSync(join(PRISMA_DIR, 'schema.prisma'), 'utf-8');

/**
 * SQL sin comentarios. La comprobación de "nada destructivo" tiene que mirar
 * sentencias reales: el encabezado de la migración documenta cómo revertirla
 * (un DROP COLUMN) y eso no es una operación que se ejecute.
 */
const executableSql = migrationSql
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n');

/**
 * Líneas útiles de un bloque del schema: recorta primero y quita el comentario
 * después.
 *
 * El orden importa: schema.prisma está guardado en CRLF y en un regex de JS
 * `.` no cruza el retorno de carro, así que `/\/\/.*$/` no llegaba al final de
 * la línea y los comentarios se colaban como si fueran valores del enum.
 */
function meaningfulLines(block: string): string[] {
  return block
    .split('\n')
    .map((line) => line.trim())
    .map((line) => (line.startsWith('//') ? '' : line))
    .filter(Boolean);
}

describe('migración add_world_item_behavior', () => {
  it('agrega la columna behavior como JSONB nullable', () => {
    expect(migrationSql).toMatch(
      /ALTER TABLE "WorldItemData"\s+ADD COLUMN\s+"behavior" JSONB;/,
    );
    // Sin NOT NULL y sin DEFAULT: NULL es un valor con significado propio
    // ("objeto de siempre"), no un hueco a rellenar.
    expect(migrationSql).not.toMatch(/"behavior"[^;]*NOT NULL/);
    expect(migrationSql).not.toMatch(/"behavior"[^;]*DEFAULT/);
  });

  it('agrega CLICK al enum de forma idempotente', () => {
    expect(migrationSql).toMatch(
      /ALTER TYPE "InteractionType" ADD VALUE IF NOT EXISTS 'CLICK';/,
    );
  });

  it('NO contiene ninguna operación destructiva', () => {
    for (const forbidden of [
      /\bDROP\s+TABLE\b/i,
      /\bDROP\s+COLUMN\b/i,
      /\bDROP\s+TYPE\b/i,
      /\bDELETE\s+FROM\b/i,
      /\bTRUNCATE\b/i,
      /\bUPDATE\s+"/i,
      /\bALTER\s+COLUMN\b/i,
      /\bRENAME\b/i,
    ]) {
      expect(executableSql).not.toMatch(forbidden);
    }
  });

  it('no toca ninguna tabla que no sea WorldItemData', () => {
    const touchedTables = [...executableSql.matchAll(/ALTER TABLE "(\w+)"/g)].map(
      (match) => match[1],
    );
    expect(touchedTables).toEqual(['WorldItemData']);
  });
});

describe('schema.prisma', () => {
  it('declara WorldItemData.behavior como Json opcional', () => {
    expect(schema).toMatch(/^\s*behavior Json\?\s*$/m);
  });

  it('declara CLICK en InteractionType conservando los valores previos', () => {
    const enumBlock = schema.match(/enum InteractionType \{([\s\S]*?)\}/)?.[1] ?? '';

    // TOGGLE y OPEN son el camino de los objetos que ya existen: si
    // desaparecieran, interactItem() dejaría de aceptar sus interacciones.
    expect(meaningfulLines(enumBlock)).toEqual([
      'SIT',
      'LIE',
      'DRINK',
      'OPEN',
      'TOGGLE',
      'TELEPORT',
      'CLICK',
    ]);
  });
});
