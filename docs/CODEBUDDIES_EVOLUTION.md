# CodeBuddies — Sesión de evolución de producto (2026-08-09)

Este documento registra una sesión de trabajo autónomo sobre el pedido de convertir CodeBuddies en "una plataforma donde estoy jugando mientras aprendo programación" (e-learning + gamificación + progresión + mundo vivo + economía + comunidad). No es un informe de recomendaciones: describe auditoría real, decisiones tomadas, e implementación real y conectada extremo a extremo, verificada con typecheck + lint + build + tests.

## 1. Lo primero que se encontró: el punto de partida no era el esperado

El pedido de producto empezaba con "audita antes de tocar", asumiendo una plataforma con huecos grandes de seguridad, honestidad de datos y funcionalidades a medias. Existía una auditoría estática muy completa (`docs/AUDITORIA-SISTEMA-CURSOS-2026.md`, 2026-08-01, 147 modelos Prisma, 9 problemas críticos, roadmap de 4 fases) que describía exactamente ese escenario: guards de autenticación faltantes, fuga de PII en rankings, respuestas de quiz filtradas, datos mock en el dashboard, dos sistemas de gamificación en paralelo, learning paths inexistentes, sin CI.

**Verificación directa contra el código actual (no contra ese documento) mostró que casi todo eso ya estaba resuelto.** El historial de commits entre el 2026-08-06 y 2026-08-07 muestra sesiones previas ejecutando el propio roadmap de esa auditoría ("Close remaining Fase 2 gaps and add Fase 4 groundwork", "Fix broken exercise navigation, add live stats, close out Fase 3 deferred items", "Fix inconsistent level display, harden /translate, add dependency scanning") — la auditoría fue escrita, y luego su propio roadmap se ejecutó, pero el documento nunca se actualizó para reflejarlo.

Se verificaron con lectura directa de código (no por inferencia) los 9 problemas críticos y varios hallazgos "importantes" documentados:

| Hallazgo de la auditoría 2026-08-01 | Estado real verificado 2026-08-09 |
|---|---|
| C1 — `POST /progress` sin guard de auth | **Refutado** — `JwtAuthGuard` a nivel de controller, `userId` derivado del JWT, ownership check explícito |
| C2 — `GET /rankings` filtra email | **Refutado** — ningún `select` de rankings incluye `email` |
| C3 — Quiz devuelve `correct` siempre | **Refutado** — `correct` solo se expone si `Completion` real existe para ese usuario |
| C7 — Progreso sin `$transaction` | **Refutado** — `createProgress()` envuelve Completion+User+XPTransaction+CoinTransaction+Activity en una transacción |
| C8 — Dashboard con datos mock | **Refutado** — "continuar aprendiendo" y "top jugadores" son fetches reales a `/progress/continue-learning` y `/rankings` |
| D7 — Dos sistemas de gamificación en paralelo | **Obsoleto** — el modelo legado (`Achievement`/`UserAchievement`) ya no existe en el schema; solo queda el sistema `Mission`/`GamificationAchievement`, completamente wireado |
| Learning paths inexistentes | **Parcialmente refutado** — el modelo y las rutas ya existían, pero la UI era una lista plana sin mapa visual (ver §3) |

Esto cambió el plan de la sesión: en vez de "arreglar seguridad y conectar datos mock" (ya hecho), el trabajo real disponible era **construir las piezas del pedido de producto que genuinamente no existen todavía**, sin duplicar ni una sola funcionalidad ya construida. Tres agentes de exploración en paralelo (gamificación, sistema de contenido de cursos, y verificación de seguridad) confirmaron qué existe realmente antes de escribir una sola línea de código nuevo.

## 2. Qué se implementó esta sesión

Tres piezas, elegidas por ser: (a) gaps reales confirmados por auditoría directa, no supuestos; (b) completables de punta a punta en una sesión, con datos 100% reales — cero números inventados; (c) alineadas con las secciones del pedido de producto con mayor impacto visual/diferencial (mundo vivo, mapa de progresión, analítica real).

### 2.1 — "Mundo vivo": actividad global en tiempo real (secciones 10, 11, 17, 18 del pedido)

No existía ningún endpoint ni widget de actividad global — se verificó con grep que ningún archivo del repo mencionaba "Buddies online" ni un concepto de "world stats". Sí existía la infraestructura de datos necesaria (ledgers append-only, presencia SSE), solo no estaba expuesta.

- **Backend**: `RankingsService.getWorldPulse()` (`apps/api/src/modules/rankings/rankings.service.ts`), nuevo endpoint público `GET /rankings/world-pulse`. Devuelve `onlineNow` (conteo en vivo de sesiones SSE activas, `RealtimeService.getOnlineCount()` — método nuevo, trivial, sobre el `Map` en memoria que ya existía) y `today.*`: ejercicios completados, misiones completadas, certificados emitidos, XP y coins ganados — todo agregado de tablas append-only ya existentes (`Completion`, `UserMissionProgress`, `Certificate`, `XPTransaction`, `CoinTransaction`) filtradas por "desde medianoche UTC". Cacheado 15s vía el `CacheService` ya existente (mismo patrón que `rankings.service.ts` ya usaba, TTL más corto a propósito por ser la sección que más debe sentirse viva).
- **Frontend**: `apps/web/src/features/world-pulse/` (nuevo — `api.ts`, `use-world-pulse.ts` con `useSWR` y `refreshInterval` de 20s, `world-pulse-bar.tsx` con dos variantes visuales). Insertado en la landing pública (`app/(site)/page.tsx`, dentro de la sección ya existente de "community stats" — que es all-time, esto es "hoy/ahora") y en el dashboard autenticado (`dashboard-page.tsx`, entre el header y el layout de dos columnas).
- **Decisión de honestidad**: si la plataforma tiene poca actividad real, el widget muestra los números reales tal cual (incluyendo cero) — no hay mínimos artificiales ni relleno. Es exactamente el requisito explícito del pedido de producto ("no inventes estadísticas... si la plataforma todavía tiene pocos usuarios, muestra métricas honestas").
- **Limitación documentada en el propio código**: `onlineNow` es un contador en memoria del proceso de `apps/api` — con más de un dyno subestimaría el total real (mismo tipo de limitación que ya tenía el adapter de Socket.IO antes de tener Redis configurado). Aceptable mientras `apps/api` corra en un solo dyno (el plan de producción actual, según `docs/PRODUCTION.md`).

### 2.2 — Mapa de progresión visual real (secciones 6, 7 del pedido)

`/paths/[slug]` renderizaba una lista vertical numerada de cursos — sin bloqueo, sin recompensas visibles, sin cruce con prerrequisitos. El dato para hacerlo bien ya existía (orden de `LearningPathCourse`, modelo `CoursePrerequisite`) pero nunca se habían cruzado entre sí ni con el progreso real del usuario.

- **Backend**: `LearningPathsService.getPublicBySlugOrId()` ahora acepta `userId` opcional (`OptionalJwtAuthGuard` en el controller) y devuelve, por curso: `completed` (real — ver decisión de reuso abajo), `locked` (real: bloqueado si el curso anterior de la misma ruta no está completo **o** si tiene prerrequisitos propios sin cumplir), `xpReward`/`coinsReward` (suma real de las recompensas de sus ejercicios publicados), y `requires` (nombres legibles de qué falta). Sin sesión, se muestra la estructura completa con todo bloqueado salvo el primer curso — honesto, no hay progreso fantasma para visitantes anónimos.
- **Decisión de arquitectura — reuso, no reimplementación**: "¿este usuario completó este curso?" ya estaba resuelto (por tercera vez lo habría estado si lo reimplementaba) dentro de `CertificateEligibilityService.isCourseCompleted()`, privado. Se hizo público y se inyectó `CertificatesModule` en `LearningPathsModule` — cero lógica de completitud duplicada, un solo lugar si el criterio de "curso completo" cambia en el futuro.
- **Frontend**: `apps/web/app/(site)/paths/[slug]/page.tsx` reescrito — mapa vertical tipo sendero, línea central que se llena según el progreso real completado, nodos con tres estados visuales reales (completado = check, actual = anillo pulsante, bloqueado = candado + motivo legible), recompensa (`+XP · +coins`) visible por nodo, barra de progreso agregada arriba (`completedCount/totalCount`).
- **Limitación reconocida, no resuelta**: el mapa sigue siendo topológicamente lineal (una secuencia), no un grafo con ramas (el mockup del pedido mostraba HTML→CSS→{JavaScript, Web Design}). `LearningPathCourse` solo modela orden secuencial, no un grafo de dependencias entre nodos de una misma ruta. Ramificar de verdad requiere un modelo nuevo (tipo `LearningPathEdge`) — se documentó como decisión de modelado pendiente en `docs/COURSE_SYSTEM.md` §4 en vez de construirse especulativamente sin casos reales de contenido que lo necesiten.

### 2.3 — DAU/WAU/MAU y retención real (secciones 12, 13 del pedido)

El dashboard admin ya tenía un `activeUsers` de 30 días real, pero no desglose diario/semanal ni cohortes de retención — confirmado con lectura directa de `admin-dashboard.service.ts` y grep de "DAU/WAU/MAU/retention/cohort/funnel" en todo `apps/api/src` (sin resultados relevantes de producto, solo coincidencias léxicas en otros dominios).

- **Backend**: `AdminDashboardService` extendido con `engagement: { dau, wau, mau, retention: { d1, d7, d30 } }`. DAU/WAU/MAU reutilizan exactamente el mismo criterio de "actividad" que ya existía (`Activity` o `Completion` en la ventana) generalizado a un helper (`countActiveUsersSince(days)`), sin inventar una definición nueva de "usuario activo". Retención D1/D7/D30 es una cohorte real por fecha de registro: para cada usuario cuya cuenta ya tiene la antigüedad suficiente, se calcula si tuvo alguna `Activity`/`Completion` en el día objetivo relativo a **su propia** fecha de alta (no una fecha calendario compartida) — implementado con Prisma estándar (sin SQL crudo, para mantener el mismo nivel de verificabilidad por typecheck que el resto del código, dado que no hay una base de datos disponible en este entorno para probar SQL crudo contra datos reales).
- **Frontend**: `app/admin/page.tsx` — nueva sección "Engagement" con las tres métricas y sus tres ventanas de retención, mismo lenguaje visual que el resto del dashboard admin (sin gráficas nuevas innecesarias — el pedido de producto pide explícitamente no llenar la pantalla de gráficas si no ayudan; tres números con contexto son más legibles que un gráfico para una cohorte).

## 3. Nuevas piezas de arquitectura (para referencia rápida)

- **Endpoint nuevo**: `GET /rankings/world-pulse` (público).
- **Método nuevo**: `RealtimeService.getOnlineCount()`.
- **Método hecho público**: `CertificateEligibilityService.isCourseCompleted()` (antes privado) — ahora reutilizado por `LearningPathsService`.
- **Contrato extendido** (no breaking): `GET /learning-paths/:slugOrId` ahora acepta JWT opcional y devuelve `progress`, y cada curso trae `completed`/`locked`/`xpReward`/`coinsReward`/`requires`. `GET /admin/dashboard` ahora incluye `engagement`.
- **Feature nueva en frontend**: `apps/web/src/features/world-pulse/`.
- **Namespaces i18n extendidos** (en/es/zh, con traducciones reales al español, no copias del inglés): `admin` (engagement/retención) y `site` (world-pulse, mapa de rutas).
- **Documentación nueva**: `docs/ARCHITECTURE.md`, `docs/PRODUCT_MAP.md`, `docs/GAMIFICATION.md`, `docs/COURSE_SYSTEM.md`, este documento.

## 4. Verificación realizada

- `pnpm --filter api typecheck` — limpio.
- `pnpm --filter web typecheck` — limpio.
- `pnpm --filter api build` (`nest build`) — exitoso.
- `pnpm --filter web build` (`next build`, producción, 87 rutas) — exitoso.
- `eslint` sobre cada archivo tocado — limpio (se corrigieron con `--fix` issues de formato *solo* en los archivos modificados esta sesión; no se tocó el resto de la deuda de lint preexistente del repo — ~2300 issues documentados en `docs/PRODUCTION.md` como deuda conocida, fuera de alcance de esta sesión).
- `pnpm --filter api test` — 25/29 tests pasan; los 4 que fallan son specs preexistentes de `apps/api/src/modules/game/*` con dependencias de test incompletas, ya documentados en `docs/PRODUCTION.md` como excluidos del pipeline de CI y no relacionados con los cambios de esta sesión.

## 5. Riesgos y limitaciones conocidas de lo implementado

- `onlineNow` subestima con más de un dyno de `apps/api` (documentado en código y en §2.1).
- El mapa de rutas es lineal, no un grafo ramificado (documentado en §2.2 y en `COURSE_SYSTEM.md`).
- La retención D1/D7/D30 tiene sentido estadístico limitado mientras la base de usuarios sea pequeña (cohortes de pocos usuarios generan porcentajes ruidosos) — es correcta, no es engañosa, pero hay que leerla con ese contexto hasta que haya más volumen.
- No se agregaron tests unitarios nuevos para la lógica agregada (`getWorldPulse`, `retentionForOffset`, el nuevo cálculo de bloqueo de `learning-paths.service.ts`) — el repo ya tenía cobertura de tests baja de partida (documentado en la auditoría de 2026-08-01 y no resuelto desde entonces); se priorizó completar tres features reales de punta a punta con verificación por typecheck+build+lint sobre escribir tests parciales de una sola pieza. Queda como pendiente explícito, no como omisión silenciosa.

## 6. Lo que se evaluó y se decidió NO implementar esta sesión (y por qué)

- **Sistema de bloques de contenido (`LessonBlock`)**: gap real y confirmado (`Lesson.content`/`Exercise.content` siguen siendo `Json?` sin estructura), pero es un cambio de varias semanas que toca el modelo de datos de contenido ya publicado, el editor admin, y cada renderer de lección. Implementarlo parcialmente en el tiempo restante de esta sesión habría dejado una migración a medias — exactamente lo que el pedido de producto pide evitar explícitamente ("no dejes implementaciones a medias"). Propuesta de diseño completa dejada en `docs/COURSE_SYSTEM.md` §5 para cuando se aborde como su propia fase.
- **Nuevos tipos de ejercicio** (fill-in-blank, reorder, debugging, predicción de output): dependen del sistema de bloques de arriba para no quedar como componentes aislados sin lugar consistente donde vivir dentro de una lección.
- **Sandbox tipo Sandpack/WebContainers para "construir una app"**: se verificó que hoy solo existe Monaco + iframe (sin Sandpack/WebContainer/CodeMirror instalados). Evaluación rápida: Sandpack (de CodeSandbox) es la opción más liviana y con mejor integración a React para HTML/CSS/JS en vivo sin ejecutar código arbitrario en el servidor; WebContainers (StackBlitz) da un Node.js real en el navegador pero es más pesado y su licencia comercial amerita una decisión de producto explícita antes de adoptarlo, no una decisión técnica unilateral en medio de otra tarea. No se instaló ninguna dependencia nueva esta sesión — decisión deliberada de no agregar una librería "porque existe" sin que haya una feature concreta lista para consumirla.
- **Taxonomía de eventos de producto** (`course_viewed`, `lesson_started`, etc.) para funnels de conversión detallados: DAU/WAU/MAU y retención (lo que sí se implementó) ya se pueden calcular con los datos append-only existentes sin esta taxonomía. Construir eventos de producto específicos es una pieza más grande, mejor abordada cuando haya un caso de uso concreto de funnel (ej. onboarding) que la necesite, no de forma especulativa.

## 7. Próximos pasos recomendados (orden sugerido, no obligatorio)

1. **Sistema de bloques de contenido** (`docs/COURSE_SYSTEM.md` §5) — es la base para casi todo el resto del pedido de producto sobre contenido de lecciones (misiones narrativas tipo "Code Audit #014", nuevos tipos de ejercicio, checkpoints).
2. **Aplicar el mismo patrón de misión narrativa/investigativa** a la presentación de ejercicios existentes (contexto, evidencia, criterios de éxito, pistas escalonadas) — es principalmente trabajo de UI/contenido sobre el modelo `Exercise` ya existente, no requiere el sistema de bloques para un primer avance.
3. **Ramificación real del mapa de rutas** (modelo de grafo) una vez haya suficiente contenido curado para necesitar rutas no lineales.
4. Añadir tests unitarios para la lógica nueva de esta sesión (retención, world-pulse, bloqueo de rutas) antes de seguir extendiendo esos archivos.
5. Evaluar Sandpack de forma dedicada (spike técnico corto) si el negocio confirma que quiere una experiencia tipo "construí una app" más allá de ejercicios puntuales.
