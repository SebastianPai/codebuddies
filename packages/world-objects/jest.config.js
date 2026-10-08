/**
 * Config de test del paquete. Se ejecuta con el Jest que ya existe en
 * apps/api — cero dependencias nuevas, igual que los specs de apps/game:
 *
 *   cd apps/api && npx jest --config ../../packages/world-objects/jest.config.js
 *   (o, desde este directorio: pnpm test)
 *
 * El tsconfig va INLINE en vez de apuntar a un archivo: cuando se le
 * sobreescribe el rootDir, ts-jest busca el tsconfig.json del rootDir nuevo y
 * al no encontrarlo cae a sus defaults (sin esModuleInterop). Eso es lo que
 * rompe el comando documentado en la cabecera de
 * apps/game/src/game/iso/NavGrid.spec.ts. Con la config acá el paquete se
 * testea siempre igual, desde donde sea que se lo invoque.
 */
module.exports = {
  rootDir: __dirname,
  testEnvironment: 'node',
  testRegex: '\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          target: 'ES2020',
          module: 'commonjs',
          moduleResolution: 'node',
          esModuleInterop: true,
          strict: true,
          isolatedModules: true,
        },
      },
    ],
  },
};
