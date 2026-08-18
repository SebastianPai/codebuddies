# CodeBuddies — Arquitectura del sistema

Estado verificado el 2026-08-09 leyendo código directamente (no proyectado desde documentación anterior). Este documento es contexto persistente para reducir la necesidad de re-auditar el repo completo en cada sesión — antes de confiar en una afirmación de aquí sobre un archivo/función específica, verificar que sigue existiendo (`grep`/`Read`), porque el código avanza más rápido de lo que estos documentos se actualizan.

## 1. Los tres procesos

```
codebuddies.tech          game.codebuddies.tech
      │                          │
   apps/web                  apps/game
      │                          │
      └──────────┬───────────────┘
                  ▼
        api.codebuddies.tech
              apps/api
           (único backend)
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
   PostgreSQL         Redis (opcional)
```

- **apps/api** (NestJS 11 + Prisma + PostgreSQL): único backend. REST + SSE (`/realtime`) + Socket.IO (`GameGateway`, para `apps/game`). JWT (HS256, 1 día, sin refresh) emitido y verificado solo acá.
- **apps/web** (Next.js 16, App Router, `"use client"` casi en todo el árbol real): LMS/plataforma social — cursos, gamificación, certificados, premium, comunidad, perfiles, admin. Habla con `apps/api` por REST + SSE, nunca WebSocket directo.
- **apps/game** (Next.js + Phaser): cliente del mundo virtual multijugador. Sin Prisma, sin DB propia — todo vía `apps/api` (REST + Socket.IO + SSE). **No tocar salvo razón técnica real** (instrucción de producto vigente); toda mejora de e-learning/gamificación que pueda resolverse en `apps/web`/`apps/api` debe resolverse ahí.
- **PostgreSQL**: única base de datos, un schema Prisma (`apps/api/prisma/schema.prisma`, **147 modelos** a la fecha) compartido por el dominio de cursos y el dominio de mundo virtual/marketplace. Ver §5 sobre el riesgo de esto.
- **Redis**: opcional (`CacheModule`, `@Global`, degrada a "sin cache" si no está disponible — nunca tumba el boot). Dos usos independientes: adapter de Socket.IO multi-dyno, y `CacheService.getOrSet(key, ttlSeconds, loader)` para catálogo de cursos / rankings / dashboard admin / world-pulse.

Despliegue real (Heroku, 3 apps desde el mismo repo vía `DEPLOY_TARGET`): ver `docs/PRODUCTION.md`, que es la fuente de verdad operativa y se mantiene aparte de este documento.

## 2. apps/api — módulos de negocio (`app.module.ts`)

Lista completa de módulos registrados, en el orden del archivo — usar esto para ubicar dónde vive cada capacidad sin tener que grepear:

`PrismaModule`, `CacheModule`, `MetricsModule` (Prometheus vía interceptor global, `/metrics`), `IdentityModule` (auth + perfil + `/identity/me` como única fuente de nivel/XP/coins/streak), `ModuleModule` (ojo: `Module` en el dominio de cursos = categoría que agrupa Cursos, **no** lecciones — terminología invertida respecto a Udemy/Coursera, ver `docs/COURSE_SYSTEM.md`), `CourseModule`, `LessonModule`, `ExerciseModule`, `GameModule` (mundo virtual — avatares, salas, energy, achievements de CodeStudio, etc.), `ProgressModule` (XP/coins/completions, `$transaction` real), `TranslateModule` (proxy DeepL, solo ADMIN), `UploadsModule` (Cloudflare R2, valida contenido real del archivo no el MIME declarado), `AvatarModule`, `ItemsModule`, `AnimationsModule`, `ItemSpritesModule`, `LayoutsModule`, `WorldItemDataModule`, `AcademiesModule`, `CertificatesModule` (emisión atómica + verificación pública + `CertificateEligibilityService.isCourseCompleted` reutilizable — ver §4), `PaymentsModule`, `SubscriptionsModule`, `PricingModule`, `LearningPathsModule`, `CourseCategoriesModule`, `CourseReviewsModule`, `CourseProjectsModule`, `ContentDiscussionModule` (Q&A/comentarios + reportes de contenido), `PaddleWebhookModule` (Paddle real, código completo — inactivo solo por falta de credenciales reales, no por trabajo pendiente), `AdminModule`, `RankingsModule` (leaderboards all-time + `RankingSeasonsService` + world-pulse), `RealtimeModule` (presencia SSE — `RealtimeService.isOnline`/`getOnlineCount`), `NotificationsModule`, `ProfilesModule`, `FriendshipsModule`, `FriendChallengesModule`, `MessagesModule`, `EmailModule`, `CommunityModule`, `ReferralsModule`, `GamificationModule` (missions/achievements/badges/titles/reward-center), `MarketplaceModule`, `BadgesModule` (cosmético, `BadgeConfig` — distinto de `GamificationBadge`, sin colisión de rutas), `ThemeAssetsModule`, `CodeStudioModule`.

Patrones consistentes a seguir al agregar módulos nuevos:
- Guard de auth a nivel de controller (`@UseGuards(JwtAuthGuard)` en la clase) cuando toda la ruta requiere sesión; `OptionalJwtAuthGuard` + `OptionallyAuthenticatedRequest` cuando el contenido varía si hay sesión pero también debe responder a anónimos (ej. `GET /exercises/:id`, `GET /learning-paths/:slugOrId`).
- `req.user.userId` (no `.id`) — así lo deja `JwtStrategy#validate()`.
- Cache de lectura cara/frecuente vía `CacheService.getOrSet` con TTL corto (15-30s), nunca invalidación por escritura punto a punto salvo que el dato cambie poco (ver comentarios en `rankings.service.ts`/`admin-dashboard.service.ts`).
- Reutilizar servicios de dominio ya existentes en vez de reimplementar cálculos (ej. `CertificateEligibilityService.isCourseCompleted` es ahora público y lo usa tanto `certificates` como `learning-paths`; antes de escribir "¿el usuario completó este curso?" por tercera vez, buscar ahí primero).

## 3. apps/web — organización del frontend

- `app/` — rutas Next.js App Router. `app/(site)/*` es el árbol público/autenticado real (cursos, dashboard, missions, achievements, badges, paths, rankings, community, friends, messages, premium, pricing, certificates, u/[username]). `app/admin/*` es el panel de administración. **`apps/web/src/app/` (dentro de `src/`, no confundir con el `app/` de la raíz) es un scaffold huérfano de `create-next-app` que Next.js nunca renderiza** — no editar ahí pensando que es una ruta real.
- `src/features/<dominio>/` — patrón por feature (`api.ts`/`dashboard-api.ts` para llamadas HTTP, `hooks/`, `components/`, `types/`, a veces `services/` para lógica de transformación). Ejemplos: `features/dashboard`, `features/courses`, `features/admin/{courses,modules,lessons}`, `features/world-pulse` (nuevo, ver `docs/CODEBUDDIES_EVOLUTION.md`).
- `src/shared/ui/` — sistema de componentes propio (`Button`, `Card`, `Skeleton`, `MarkdownEditor`, `DragReorderList`, `Dialog`, `useConfirm`, `Tooltip`, etc.) — usar esto antes de escribir un componente nuevo o un `window.confirm()`.
- `src/shared/api/client.ts` — único cliente HTTP (`api.get/post/put/patch/delete`), adjunta `Authorization: Bearer` desde `localStorage.token` automáticamente si existe, y `Accept-Language` desde `localStorage.lang`. `utils/api.ts` solo re-exporta esto — son el mismo cliente, no dos sistemas.
- `src/i18n/` — `LanguageContext` carga `dictionary[lang]`, que mergea ~15 namespaces (`admin`, `site`, `dashboard`, `gamification`, etc.) cada uno con `en.json`/`es.json`/`zh.json`. **Todos los namespaces están siempre disponibles en cualquier componente** vía `t("namespace.key", params)` — no hace falta "importar" un namespace por página. Placeholders con `{nombre}`, no `{{nombre}}`. Nota de calidad: `admin/es.json` tiene texto en **inglés** en varias claves preexistentes (deuda de traducción, no introducida por este documento) — las claves nuevas que se agreguen ahí deben traducirse de verdad, no copiar el inglés.
- Dependencias relevantes ya instaladas (usar esto antes de agregar una librería nueva): `framer-motion` (animación), `lucide-react` (iconos), `@monaco-editor/react` (editor de código), `react-markdown`/`remark-gfm`/`rehype-raw` (contenido), `swr` (data fetching — instalada pero subutilizada, ver HI5 en la auditoría; usarla para fetches nuevos en vez de `useState`+`useEffect` a mano), `react-resizable-panels`, `qrcode`, `jspdf`. **No hay librería de sandbox/ejecución tipo Sandpack/WebContainer/CodeMirror** — el editor de código interactivo sigue siendo Monaco + `iframe sandbox`.

## 4. Convenciones de dominio a conocer antes de tocar código

- **Nivel/XP**: fórmula única `level = floor(sqrt(xp / 100)) + 1`, definida en `RewardService.calculateLevel()` (`apps/api/src/modules/game/reward/reward.service.ts`) y replicada (misma fórmula, no una función compartida — deuda menor pendiente) en `gamification.service.ts`. El frontend **no** debe recalcular nivel localmente: siempre leer de `GET /identity/me` (`apps/web/utils/auth.ts#getCurrentUser`/`refreshUserStats`).
- **Streak**: una sola definición de "día" activo, unificada (ya no hay divergencia UTC vs. local — era un hallazgo de la auditoría de 2026-08-01, corregido después).
- **"Completado un curso"**: única fuente de verdad es `CertificateEligibilityService.isCourseCompleted(userId, courseId)` (`apps/api/src/modules/certificates/services/certificate-eligibility.service.ts`, público desde esta sesión). Antes de reimplementar esta lógica en un módulo nuevo, inyectar `CertificatesModule` y reutilizarla.
- **Actividad real de usuario** para métricas (DAU/WAU/MAU, world-pulse, retención): unión de `Activity` (eventos discretos: `COMPLETED_LESSON`, `COMPLETED_EXERCISE`, `COMPLETED_COURSE`, `EARNED_CERTIFICATE`, `REACHED_LEVEL`, `STARTED_COURSE`, `EARNED_ACHIEVEMENT`, `CREATED_PROJECT`, `CREATED_POST`) y `Completion` (con `createdAt`). No existe todavía una taxonomía de eventos de producto más fina (`course_viewed`, `lesson_started`, etc.) — ver gap documentado en `CODEBUDDIES_EVOLUTION.md`.
- **Premium hoy no bloquea contenido de curso** — decisión de producto explícita y documentada en código (`gating real de contenido premium` fue evaluado y descartado: "el contenido de cursos es gratis para todos, solo los certificados son pagos"). No reintroducir gating de lecciones sin que sea, otra vez, una decisión de producto explícita.

## 5. Riesgos arquitectónicos conocidos (no resueltos, documentados a propósito)

- **Un solo schema Prisma para tres productos** (cursos/e-learning, mundo virtual multijugador, CodeStudio) — cualquier migración, incidente de carga o decisión de escalado afecta a los tres. Aceptable al tamaño actual; revisar si el volumen de usuarios crece un orden de magnitud (ver tabla de escalado en la auditoría de 2026-08-01, sección 23).
- **Terminología invertida**: `Module` = categoría de cursos, no "módulo dentro de un curso". Cualquier persona nueva (humana o agente) tropieza con esto — está documentado acá para no perder tiempo re-descubriéndolo.
- **`content`/`codes` de `Lesson`/`Exercise` siguen siendo `Json?` sin estructura tipada** — ver `docs/COURSE_SYSTEM.md` para el detalle y la propuesta de sistema de bloques.
