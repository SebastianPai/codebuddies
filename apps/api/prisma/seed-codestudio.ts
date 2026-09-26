import { PrismaClient } from '@prisma/client';
import { CodeStudioCatalogService } from '../src/modules/codestudio/codestudio-catalog.service';

// CodeStudio v2: el contenido (árbol de features, tipos de app, roles,
// hosting, canales) vive en src/modules/codestudio/content y la API lo
// sincroniza sola al arrancar. El seed solo fuerza esa misma sincronización
// para entornos de desarrollo recién creados.
export async function seedCodeStudio(prisma: PrismaClient) {
  console.log('Seed CodeStudio...');
  await new CodeStudioCatalogService(prisma as never).syncContent({ force: true });
  console.log('Seed CodeStudio completado.');
}
