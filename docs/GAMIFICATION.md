# CodeBuddies — Sistema de gamificación

Verificado contra código el 2026-08-09. La auditoría estática de 2026-08-01 describía este sistema como fragmentado (`Achievement`/`UserAchievement` legado conviviendo con `Mission`/`GamificationAchievement` nuevo, mayormente desconectado de la UI) — **eso ya no es así**. El modelo legado no existe más en el schema, y todo lo descrito abajo está conectado a rutas reales de `apps/web` que llaman a endpoints reales de `apps/api`, sin mocks.

## 1. Los cuatro contadores base (`User`)

`experience`, `coins`, `level`, `streak`, `bestStreak` viven directamente en la fila de `User` — son la fuente de verdad, no un valor derivado que se recalcula distinto en cada pantalla.

- **Nivel**: `level = floor(sqrt(xp / 100)) + 1`. Definido en `RewardService.calculateLevel()` (`apps/api/src/modules/game/reward/reward.service.ts:9-10`), usado por `game.service.ts`, `game-challenges.service.ts`, `progress.service.ts`. Replicado (misma fórmula) en `gamification.service.ts:683` — no es una función compartida todavía, pero al ser la misma fórmula no hay divergencia de valores mostrados al usuario.
- **Frontend nunca recalcula nivel/XP localmente**: `apps/web/utils/auth.ts#getCurrentUser()` siempre lee `/identity/me`; `RewardContext.showReward()` dispara `refreshUserStats()` tras cada recompensa, que vuelve a pedir `/identity/me` y emite `AUTH_CHANGED_EVENT` — así el pill de la navbar (`Navbar.tsx` → `StatsPill`) y el dashboard quedan sincronizados sin lógica duplicada.
- **Ledger append-only**: `XPTransaction`/`CoinTransaction` registran cada movimiento (no solo el contador mutable) — esto es lo que hace posible calcular "XP ganada hoy" o retención sin inventar nada (ver `RankingsService.getWorldPulse`).
- **Todas las escrituras de progreso están en una sola transacción**: `ProgressService.createProgress()` (`progress.service.ts:155-218`) envuelve `Completion` + update de `User` (xp/coins/level/streak) + `XPTransaction` + `CoinTransaction` + `Activity` en `prisma.$transaction`. No hay riesgo de XP otorgado sin ledger.

## 2. Misiones (`Mission` / `MissionCategory` / `UserMissionProgress`)

- `Mission.cadence`: `PERMANENT | DAILY | WEEKLY | MONTHLY`. `Mission.condition` + `requiredValue` se evalúan server-side contra tablas reales (`resolveConditionValue` en `gamification.service.ts:523-609` — ~25 condiciones: `GAIN_XP`, `LOGIN_DAYS`, `COMPLETE_COURSES`, etc.).
- **Reseteo periódico real**: `UserMissionProgress` tiene `@@unique([userId, missionId, periodKey])`; `periodKey` se genera con `getPeriodKey()` (`gamification.service.ts:624`) — un día distinto = una fila distinta, así las misiones `DAILY` vuelven a estar disponibles sin ningún cron job, solo por cómo se calcula la key en el momento de leer/escribir.
- **`completedAt` sobrevive el reclamo**: al pasar de `COMPLETED` a `CLAIMED` (`claimMission`, `gamification.service.ts:124-162`), `completedAt` no se limpia (`completedAt: existing?.completedAt ?? new Date()`) — cualquier métrica que cuente "misiones completadas en la fecha X" debe filtrar por `completedAt`, **no** por `status = COMPLETED`, o subestimará las que ya se reclamaron (ver `RankingsService.getWorldPulse`, que hace esto correctamente).
- **Misión diaria del dashboard**: no es sintética — `dashboardApi.getMissions()` trae `/missions` real y el dashboard elige la primera `DAILY` sin reclamar (`dashboard-service.ts:12-21`).
- Rutas: `GET /missions`, `POST /missions/:id/claim` — ambas bajo `JwtAuthGuard` (sin variante pública; tiene sentido, el progreso es por usuario).

## 3. Logros (`GamificationAchievement` / `UserGamificationAchievement`)

- `condition` + `requiredValue` evaluados server-side contra estado real (completions, amistades, referidos, coins gastadas, streak, etc.) — `getAchievementsForUser` (`gamification.service.ts:206-209`) calcula `percentage`/`unlocked`/`unlockedAt` en cada request, no son flags decorativos.
- Auto-desbloqueo: no requiere una acción explícita del usuario más allá de cumplir la condición (el endpoint de "unlock" existe para casos donde hace falta confirmar la entrega del reward, no para "hacer trampa" desbloqueando algo no ganado — la condición se revalida server-side).
- Rutas: `GET /achievements`, `PATCH /achievements/:id/unlock`.

## 4. Insignias y títulos (`GamificationBadge` / `GamificationTitle`)

- **A diferencia de misiones/logros, no tienen `condition`/`requiredValue` propio.** Se otorgan como `rewards` (JSON) referenciados desde una misión o logro (`grantRewards`, `gamification.service.ts:702-716`), y la propiedad queda registrada en `UserGamificationBadge`/`UserGamificationTitle` (ownership real, no un array en el perfil). Esto significa: el "criterio" de una insignia es indirecto — vive en la misión/logro que la referencia, no en la insignia misma. Si se necesita mostrar "cómo se gana esta insignia" de forma autocontenida, hay que buscar qué misión/logro la referencia en su campo `rewards`, no asumir que la insignia lo sabe de sí misma.
- Distinto de `BadgeConfig` (`BadgesModule`) — ese es un sistema de insignias **cosméticas de perfil** (`/badges/config`, `/badges/me`, `/badges/user/:username`), sin relación con logros/misiones. Dos sistemas con la palabra "badge" que no colisionan en rutas pero sí pueden confundir — al buscar "dónde se define una insignia", revisar cuál de los dos es.
- Rutas: `GET /badges`, `GET /titles` (gamificación); `GET /badges/*` (cosmético, módulo separado).

## 5. Rankings y temporadas

- `RankingsService` (`apps/api/src/modules/rankings/rankings.service.ts`): boards all-time (`topXp`, `topCoins`, `topStreaks`, `topCertificates`, `topCoinsSpent`), cacheados 30s. **No lee de la tabla `Ranking`** (que sí tiene `@@unique([userId, type, period])` + `@@index([type, period, score])` correctos) — calcula en vivo desde `User.experience/coins/streak` y `CoinTransaction`. La tabla `Ranking` existe en el schema pero hoy es peso muerto para este flujo; si se decide usarla, hay que decidir quién la escribe.
- `RankingSeasonsService`: temporadas con leaderboard en vivo calculado desde sumas de `XPTransaction`/`CoinTransaction` dentro de la ventana de la temporada, y snapshot congelado en `RankingSeasonEntry` al finalizar. Admin real en `/admin/rankings`.
- **Nuevo esta sesión — `getWorldPulse()`**: separado de `getCommunityStats()` (que es all-time: total de miembros, XP total histórico, top 3). `getWorldPulse()` es actividad de **hoy** + presencia **ahora mismo**:
  - `onlineNow`: `RealtimeService.getOnlineCount()` — tamaño del `Map` en memoria de sesiones SSE activas. **Limitación conocida**: en memoria del proceso; con más de un dyno de `apps/api` subestima el total real (mismo tipo de limitación que ya tenía el adapter de Socket.IO en memoria antes de tener Redis). Documentado en el propio código (`realtime.service.ts`).
  - `today.*`: `exercisesCompleted` (`Completion` con `exerciseId`), `missionsCompleted` (`UserMissionProgress.completedAt`, sin filtrar por status — ver §2), `certificatesEarned` (`Certificate.issuedAt`), `coinsEarned`/`xpEarned` (suma de transacciones positivas del ledger), `activeLearnersToday` (mismo criterio de "actividad" que ya usaba `activeUsers` del dashboard admin).
  - Cacheado 15s (más corto que el resto — es la sección que más debe sentirse "viva").
  - Endpoint público: `GET /rankings/world-pulse`. Consumido por `apps/web/src/features/world-pulse/` (widget en landing pública y en dashboard autenticado, refrescado cada 20s vía SWR).

## 6. Retos entre amigos (`FriendChallenge`)

Estado real: PENDING → ACCEPTED/DECLINED → COMPLETED/CANCELLED, con detección de ganador "on read" (`resolveIfDue`, compara timestamps de completion de cada participante). UI en `/friends/challenges` con accept/decline/progress reales.

## 7. Cómo se ve esto en `apps/web`

Todas las rutas siguientes hacen fetch real (verificado, sin arrays hardcodeados):

- `/missions`, `/achievements`, `/badges` — un `api.get()` cada una a su endpoint homónimo.
- `/friends/challenges` — múltiples fetches reales + mutaciones `PATCH`.
- `/rankings`, `/rankings/seasons`, `/rankings/seasons/[id]`.
- Navbar (`StatsPill`) y `/dashboard` — nivel/XP/coins/streak desde `useAuth()` → `/identity/me`.
- `/dashboard` sidebar — misión diaria real, top players real (slice de `/rankings`), y desde esta sesión, el `WorldPulseBar`.
- Landing pública (`/`) — `communityStats` (all-time) ya existía; `WorldPulseBar` (hoy/ahora) es nuevo.

## 8. Qué falta (gaps reales, no implementados a medias)

- Formula de nivel duplicada en dos archivos (mismo valor, no es un bug visible, sí es deuda — unificar en un helper compartido si se vuelve a tocar cualquiera de los dos).
- Insignias/títulos sin condición autocontenida (§4) — si el producto necesita mostrar "cómo desbloquear esta insignia" de forma genérica en una vitrina, hay que diseñar esa capa (hoy solo se sabe indirectamente).
- Tabla `Ranking` sin escritor activo — decidir si se elimina o se le da un propósito (¿histórico por período que no sea "temporada"?).
- Sin taxonomía de eventos de producto (`course_viewed`, `lesson_started`, etc.) — lo que existe (`Activity`, `Completion`, ledgers) alcanza para métricas agregadas (DAU/WAU/MAU, retención, world-pulse — todas ya reales, ver `docs/CODEBUDDIES_EVOLUTION.md`), pero no para funnels de conversión detallados por evento.
