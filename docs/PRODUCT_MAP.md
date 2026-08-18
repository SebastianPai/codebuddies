# CodeBuddies — Mapa de producto

Inventario de qué existe hoy, verificado contra código el 2026-08-09 (no contra documentación anterior, que estaba desactualizada — ver `docs/CODEBUDDIES_EVOLUTION.md`). Objetivo: que la próxima persona/agente que trabaje acá sepa qué ya está construido y conectado antes de proponer "nuevas" funcionalidades que en realidad ya existen.

Leyenda: ✅ real y conectado extremo a extremo · 🟡 existe pero incompleto/parcial · ⛔ no existe.

## Aprendizaje

| Área | Estado | Dónde |
|---|---|---|
| Catálogo de cursos, búsqueda, filtros | ✅ | `/courses` |
| Detalle de curso (lecciones, ejercicios, prerequisitos informativos) | ✅ | `/courses/[id]` |
| Ejercicios de código (Monaco + iframe sandbox, verificación server-side) | ✅ | `/learn/exercise/code/[id]` |
| Quiz (opción múltiple / multi-select) | ✅ | `/learn/exercise/quiz/[id]` |
| Otros tipos de quiz (fill-in-blank, reorder, debugging, predicción de output) | ⛔ | Solo existe MCQ; ver `docs/COURSE_SYSTEM.md` |
| Sistema de bloques de contenido por lección (texto+código+quiz+callout mezclados) | ⛔ | `Lesson.content`/`Exercise.content` siguen siendo `Json?` sin estructura — ver `docs/COURSE_SYSTEM.md` |
| Ejercicio tipo LIVE | 🟡 | Enum existe, sin página dedicada real |
| Learning Paths (rutas curadas de cursos) | ✅ | `/paths`, `/paths/[slug]` — **mapa visual real con nodos/bloqueo/recompensas desde esta sesión**, antes era una lista plana |
| Prerrequisitos entre cursos | ✅ | `CoursePrerequisite`, mostrados en `/courses/[id]` y ahora también gatean el mapa de rutas |
| Progreso resumible ("continuar aprendiendo") | ✅ | `GET /progress/continue-learning`, dashboard |
| Reseñas de curso | ✅ | `CourseReview`, `/courses/[id]` |
| Q&A / comentarios por lección | ✅ | `ContentComment`, componente `content-discussion.tsx` |
| Reporte de contenido con error | ✅ | `ContentReport` + panel admin `/admin/content-reports` |
| Proyectos finales de curso (entrega evaluada) | ✅ | `CourseProject`/`CourseProjectSubmission` |
| Certificados (emisión, verificación pública, QR/PDF/LinkedIn) | ✅ | `/certificates`, `/verify/[code]` |
| Recomendador de cursos ("para ti") | ✅ | `CourseRecommendationsService`, reglas (no ML), usa prerequisitos + categorías + dificultad |

## Gamificación

Ver `docs/GAMIFICATION.md` para el detalle completo. Resumen de estado:

| Mecánica | Estado | Dónde |
|---|---|---|
| XP / nivel / coins / streak | ✅ | En `User`, fórmula única, `/identity/me` |
| Misiones (permanentes/diarias/semanales/mensuales) | ✅ | `/missions`, `Mission`/`UserMissionProgress` |
| Logros (achievements) con condición evaluada server-side | ✅ | `/achievements`, `GamificationAchievement` |
| Insignias (badges) cosméticas ganables | ✅ | `/badges`, `GamificationBadge` (distinto del `BadgeConfig` de perfil) |
| Títulos desbloqueables | ✅ | `GamificationTitle`, expuesto en `/badges`/perfil |
| Rankings all-time + temporadas | ✅ | `/rankings`, `/rankings/seasons` |
| Retos entre amigos ligados a curso | ✅ | `/friends/challenges`, `FriendChallenge` |
| Actividad global / "mundo vivo" (hoy, en vivo) | ✅ | **Nuevo esta sesión** — `GET /rankings/world-pulse`, widget en landing + dashboard |
| Estadísticas comunitarias all-time (miembros, XP total, top learners) | ✅ | `GET /rankings/community-stats`, landing |

## Monetización

| Área | Estado | Dónde |
|---|---|---|
| Premium (checkout, webhook Paddle) | ✅ (código completo, inactivo solo por falta de credenciales reales) | `/premium`, `PaddleWebhookModule` |
| Certificados pagos | ✅ | `/certificates/buy/[courseId]` |
| Gating de contenido por premium | 🟡 deliberadamente desactivado | Decisión de producto: cursos gratis, solo certificados son pagos |
| Planes configurables desde admin | ✅ | `/admin/pricing` |

## Comunidad / social

| Área | Estado |
|---|---|
| Amigos, mensajes, notificaciones | ✅ |
| Perfiles públicos (`/u/[username]`) | ✅ |
| Referidos (código, recompensas, temporadas) | ✅ |
| Marketplace de items (mundo virtual) | ✅ (fuera del alcance de e-learning) |

## Admin

| Área | Estado |
|---|---|
| Dashboard con KPIs + gráficos reales | ✅, extendido esta sesión con DAU/WAU/MAU + retención D1/D7/D30 |
| CRUD de cursos/módulos/lecciones/ejercicios con editor Markdown + drag&drop | ✅ |
| Draft/Published/Archived por contenido | ✅ (`ContentStatus`) |
| Analítica de abandono de curso + ejercicios más fallidos | ✅ | `/admin/student-experience` |
| Auditoría de acciones administrativas | ✅ | `/admin/audit-log` |
| Gestión de gamificación (misiones, logros, categorías, rewards, temporadas) | ✅ | `/admin/gamification/*` |
| Reportes de contenido, moderación | ✅ | `/admin/content-reports` |
| Analítica de producto (funnels de conversión visitor→signup→...→premium) | ⛔ | No existe taxonomía de eventos; ver `CODEBUDDIES_EVOLUTION.md` |

## Contenido interactivo / sandbox

| Área | Estado |
|---|---|
| Editor Monaco HTML/CSS/JS + preview en iframe sandboxed | ✅ |
| Verificación server-side de la solución | ✅ |
| Sandbox tipo "construir una app" (calculadora, formulario, API) reusable fuera de un ejercicio puntual | ⛔ | Ver evaluación en `CODEBUDDIES_EVOLUTION.md` (Sandpack vs. WebContainers vs. mantener Monaco) |
| Ejecución de código backend en sandbox aislado | ⛔ | No implementado — correcto no implementarlo sin aislamiento real (ver sección de seguridad del pedido de producto) |
