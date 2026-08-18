# CodeBuddies — Sistema de cursos

Verificado contra código el 2026-08-09.

## 1. Jerarquía de dominio

```
Academy
 └── Module        (categoría — agrupa Cursos, NO lecciones. Ver nota de terminología)
      └── Course
           └── Lesson (type: TEXT | CODE | QUIZ | LIVE, status: DRAFT | PUBLISHED | ARCHIVED)
                └── Exercise (type: CODE | LIVE | QUIZ, status: DRAFT | PUBLISHED | ARCHIVED)
                     └── Completion (por userId, con attempts/score/timeSpentSeconds reales)
```

Además, ortogonal a esta jerarquía: `LearningPath` → `LearningPathCourse` (varios cursos, orden curado, cruza `Module`s), `CoursePrerequisite` (self-relation en `Course`), `CourseCategory` (tags, muchos-a-muchos), `CourseReview`, `CourseProject`/`CourseProjectSubmission`, `ContentComment`/`ContentReport`.

**Nota de terminología (no resuelta a propósito):** `Module` = categoría/agrupador de Cursos, lo opuesto a la convención de Udemy/Coursera (donde "módulo" es una subdivisión *dentro* de un curso). Renombrarlo es una migración de alto riesgo (toca todo el árbol) — evaluado en la auditoría de 2026-08-01 como "decisión de Fase 2, ejecución en Fase 3" y no se ha tocado. Cualquier persona nueva tropieza con esto — está documentado acá para no perder tiempo re-descubriéndolo, no para sugerir que hay que arreglarlo ya.

## 2. Forma real de `content` (el hallazgo más importante de este documento)

`Lesson.content`, `Exercise.content` y `Exercise.codes` son **`Json?` sin ninguna estructura validada a nivel de schema o DTO**. No existe un modelo `ContentBlock`. La única convención es del lado del frontend admin (`apps/web/app/admin/exercises/new/types.ts`), que tipea el JSON como `{ instructionElements?: InstructionElement[]; questions?: QuizQuestion[] }` — pero es una convención de UI, no un contrato validado por el backend. Nota: ese archivo referencia un tipo `"VIDEO_THEORY"` que **no existe** en el enum `ExerciseType` de Prisma (`CODE | LIVE | QUIZ`) — es código aspiracional/muerto, se rompería si se intentara persistir.

**Qué significa esto en la práctica**: una lección hoy es fundamentalmente "un blob de contenido + una lista de `Exercise` hijos", no una composición de bloques tipados (texto enriquecido, código, quiz, callout, imagen, comparación, etc. como entidades ordenadas independientes). El pedido de producto de tener un "sistema de bloques extensible" (`ContentBlock` con subtipos `RichText`/`Code`/`InteractiveCode`/`Quiz`/`Challenge`/`Terminal`/`BugFix`/`Hint`/`Image`/`Callout`/`Project`) **no existe todavía** y es la pieza de mayor esfuerzo pendiente de todo el pedido — ver propuesta en §5.

## 3. Tipos de ejercicio reales hoy

Solo dos experiencias de ejercicio distintas existen como componentes reales:

- **CODE** (`/learn/exercise/code/[id]`): Monaco tri-panel HTML/CSS/JS, preview en `<iframe sandbox="allow-scripts" srcDoc={...}>`, `assert()` client-side + revalidación server-side en `POST /exercises/:id/code/submit`.
- **QUIZ** (`/learn/exercise/quiz/[id]`): opción múltiple / multi-select (`QuizQuestion { options, correct, isMultiple }`). Las respuestas correctas (`correct`) solo se devuelven si el usuario autenticado ya completó el ejercicio — verificado server-side (`buildQuizQuestions()`, `exercise.service.ts`), no hay forma de obtenerlas inspeccionando la red antes de responder.
- **LIVE**: existe en el enum, sin página propia real.

No existen (y el pedido de producto los pide explícitamente): fill-in-the-blank, ordenar código, detectar bugs como tipo de ejercicio dedicado, predicción de output, comparación de código, escenario tipo "producción con logs". Estos son variantes de contenido, no de infraestructura — con un sistema de bloques (§5) se podrían modelar como subtipos de un bloque `Challenge`/`Quiz` en vez de como `ExerciseType` nuevos en Prisma.

## 4. Learning Paths — mapa visual (nuevo esta sesión)

Antes: `/paths/[slug]` renderizaba una lista vertical numerada plana, sin bloqueo, sin recompensas visibles, sin conexión con `CoursePrerequisite`. Ahora:

- `LearningPathsService.getPublicBySlugOrId(slugOrId, lang, userId?)` (`apps/api/src/modules/learning-paths/learning-paths.service.ts`) devuelve, por curso: `completed` (real, vía `CertificateEligibilityService.isCourseCompleted`), `locked` (real: bloqueado si el curso anterior de la misma ruta no está completo, **o** si tiene `CoursePrerequisite` no satisfechos — la primera señal ya existía como orden de `LearningPathCourse`, la segunda ya existía como modelo `CoursePrerequisite`, nunca se habían cruzado), `xpReward`/`coinsReward` (suma real de `experience`/`coins` de los ejercicios publicados del curso), `requires` (títulos legibles de qué falta).
- Sin sesión (`userId` ausente, `OptionalJwtAuthGuard`): se muestra la estructura completa (todo bloqueado salvo el primero), honesto — no hay progreso fantasma.
- Frontend: `apps/web/app/(site)/paths/[slug]/page.tsx` — mapa vertical tipo "sendero" con nodos (completado=check, actual=pulso animado, bloqueado=candado), línea central que se llena según progreso real, recompensa visible por nodo, motivo de bloqueo visible.
- **Sigue siendo topológicamente lineal** (una secuencia, no un grafo con ramas como HTML→{CSS, JS}→React del mockup del pedido de producto) porque `LearningPathCourse` solo tiene `order: Int`, no una relación de grafo. Ramificar de verdad (un curso con dos "siguientes" posibles) requeriría un modelo nuevo (`LearningPathEdge` o similar) — no se hizo esta sesión porque el dato no existía y crearlo es una decisión de modelado que vale la pena tomar con más cursos reales para ver qué formas de ruta hacen falta, no especulativamente.

`/paths/page.tsx` (listado de rutas disponibles) no se tocó — sigue siendo un catálogo de tarjetas, lo cual es razonable para "elegí una ruta", distinto del mapa de progreso dentro de una ruta.

## 5. Propuesta de sistema de bloques (evaluado, no implementado)

Para cuando se aborde esto como su propia fase de trabajo (varias semanas, no una extensión de esta sesión):

```
LessonBlock
  id, lessonId, order, type, data (Json tipado por type vía discriminated union en el DTO)
  type ∈ RICH_TEXT | CODE_SNIPPET | INTERACTIVE_CODE | QUIZ | CHALLENGE
       | TERMINAL | BUG_FIX | HINT | IMAGE | CALLOUT | PROJECT | CHECKPOINT
```

Decisiones recomendadas si se implementa:
- Tabla nueva (`LessonBlock`), no seguir creciendo el `Json` de `Lesson.content` — permite reordenar bloques con el mismo patrón de `DragReorderList` que ya existe, y versionar/migrar tipos de bloque uno por uno sin tocar una tabla ya poblada.
- Validación de forma por `type` a nivel de DTO (`class-validator` con discriminated union), no a nivel de Prisma (`Json` sigue siendo la columna, la estructura se garantiza en el borde de la API — mismo patrón que ya usa el resto del backend, ej. `class-validator` en course/module DTOs).
- Reusar `Exercise` para los tipos que ya funcionan bien como entidad independiente (CODE, QUIZ) en vez de duplicarlos como bloques — un bloque tipo `CHALLENGE` puede referenciar un `Exercise.id` existente en vez de reimplementar su lógica de submit/scoring.
- Migración incremental: lecciones existentes siguen funcionando con `content` tal cual (blob legado), lecciones nuevas usan `LessonBlock` — no forzar una migración masiva de contenido ya publicado como prerequisito para empezar.

## 6. Qué está genuinamente completo (para no reinventar)

Reviews, Q&A/comentarios, reportes de contenido, proyectos finales, editor Markdown con preview en vivo, drag-and-drop de reordenamiento (implementación HTML5 DnD nativa, sin librería — `apps/web/src/shared/ui/drag-reorder-list.tsx`), estados draft/published/archived, analítica de abandono por curso y ranking de ejercicios más fallidos (`AdminAnalyticsService`, `/admin/student-experience`) — todo esto ya existe, está conectado a endpoints reales, y no necesita reconstruirse.
