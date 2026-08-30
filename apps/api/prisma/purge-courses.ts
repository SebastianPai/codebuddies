/**
 * Borra TODO el contenido de cursos/aprendizaje y sus dependencias.
 *
 * Alcance: Course + (por cascada de FK) Lesson, Exercise, ExerciseAttempt,
 * Enrollment, CourseReview, CoursePrerequisite, CourseTranslation,
 * CourseCategory(join), Certificate, CertificateOrder, CertificateAccess,
 * LearningPathCourse. Además borra los contenedores que NO cuelgan de Course
 * por FK: Module, LearningPath, CourseCategory.
 *
 * NO toca usuarios, coins, compras, salas, inventario, misiones, battle
 * pass ni nada del mundo del juego. Esto es un borrado dirigido, no un
 * reset de base.
 *
 * Uso:
 *   cd apps/api
 *   npx tsx prisma/purge-courses.ts            # dry-run: solo muestra conteos
 *   npx tsx prisma/purge-courses.ts --yes      # ejecuta el borrado
 *
 * En producción: hacé backup ANTES (pg_dump) y corré con DATABASE_URL de prod.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MODELS = [
  'course',
  'lesson',
  'exercise',
  'exerciseAttempt',
  'enrollment',
  'certificate',
  'certificateOrder',
  'module',
  'learningPath',
  'learningPathCourse',
  'courseCategory',
] as const;

async function counts() {
  const out: Record<string, number> = {};
  for (const m of MODELS) {
    out[m] = await (prisma as any)[m].count();
  }
  return out;
}

async function main() {
  const apply = process.argv.includes('--yes');

  const before = await counts();
  console.log('Conteos ANTES:', before);

  if (before.enrollment > 0 || before.certificate > 0) {
    console.warn(
      `ATENCION: hay ${before.enrollment} inscripcion(es) y ${before.certificate} certificado(s). Se borran en cascada.`,
    );
  }

  if (!apply) {
    console.log('\nDRY-RUN. Nada se borro. Volvé a correr con --yes para ejecutar.');
    return;
  }

  // course.deleteMany dispara la cascada de FK hacia lecciones, ejercicios,
  // intentos, inscripciones, reviews, prerrequisitos, traducciones,
  // certificados y ordenes de certificado.
  const deletedCourses = await prisma.course.deleteMany({});
  console.log(`Cursos borrados: ${deletedCourses.count}`);

  // Contenedores sin FK a course:
  const deletedPathCourses = await prisma.learningPathCourse.deleteMany({});
  const deletedPaths = await prisma.learningPath.deleteMany({});
  const deletedCategories = await prisma.courseCategory.deleteMany({});
  const deletedModules = await prisma.module.deleteMany({});
  console.log(
    `LearningPathCourse: ${deletedPathCourses.count} · LearningPath: ${deletedPaths.count} · CourseCategory: ${deletedCategories.count} · Module: ${deletedModules.count}`,
  );

  const after = await counts();
  console.log('\nConteos DESPUES:', after);

  const leftover = Object.entries(after).filter(([, n]) => n > 0);
  if (leftover.length) {
    console.warn('Quedaron filas (revisar FK):', Object.fromEntries(leftover));
  } else {
    console.log('Todo el contenido de cursos fue eliminado.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
