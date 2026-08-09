# CodeBuddies — Guía de producción (Heroku)

Este documento describe cómo desplegar el monorepo a producción. No contiene
secretos — solo nombres de variables y comandos.

## 1. Arquitectura

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

- **apps/web** (Next.js): LMS/plataforma social — cursos, ejercicios, XP,
  certificados, premium, comunidad, perfiles, amigos, mensajes, rankings.
  Habla con `apps/api` por REST + SSE. No usa WebSocket.
- **apps/api** (NestJS): backend único. REST, SSE, Socket.IO, JWT, Prisma,
  PostgreSQL. Contiene el **Game Gateway** (servidor multijugador) en
  `apps/api/src/modules/game/game.gateway.ts` — no es un proceso aparte.
- **apps/game** (Next.js + React + Phaser): cliente del juego. Sin backend
  propio, sin Prisma, sin conexión directa a PostgreSQL. Habla con
  `apps/api` por REST, Socket.IO client y SSE.
- **PostgreSQL**: única base de datos, usada solo por `apps/api` (vía
  Prisma). Ni web ni game la tocan directamente.
- **Redis**: opcional. Dos usos independientes en `apps/api`: adapter de
  Socket.IO para escalar a más de un dyno, y cache de catálogo/rankings/
  dashboard admin. Sin `REDIS_URL`, todo sigue funcionando en un solo dyno.

Los tres procesos deben poder correr de forma completamente independiente
— este es el requisito que hace posible desplegarlos como 3 apps de Heroku
separadas desde el mismo repositorio.

## 2. Build y start — comandos reales

Cada app puede instalarse, construirse y arrancarse de forma independiente
usando `pnpm --filter`:

| App  | Build                          | Start                          | Puerto (dev) |
|------|---------------------------------|----------------------------------|--------------|
| web  | `pnpm --filter web build`       | `pnpm --filter web start`        | 3000 (respeta `$PORT`) |
| api  | `pnpm --filter api build`       | `pnpm --filter api start`        | 3001 (respeta `$PORT`) |
| game | `pnpm --filter game build`      | `pnpm --filter game start`       | 3002 (respeta `$PORT`) |

Las tres respetan `process.env.PORT` cuando está seteada (necesario para
Heroku, que asigna el puerto dinámicamente) y caen a su puerto de
desarrollo local (3000/3001/3002) cuando no lo está.

Atajos equivalentes desde la raíz: `pnpm build:web` / `build:api` /
`build:game` y `pnpm start:web` / `start:api` / `start:game`.

**No usar `pnpm -r start` en producción** — arranca las tres apps a la vez
en un mismo proceso/dyno, lo cual no tiene sentido para un despliegue de
Heroku (un dyno = un proceso).

### Nota sobre `apps/api`

`nest build` compila con `rootDir` restringido a `src/` (ver
`apps/api/tsconfig.build.json`) para que la salida quede en `dist/main.js`
exactamente donde `pnpm start` (`node dist/main`) la espera.
`prisma.config.ts` y `prisma/` quedan excluidos de ese build a propósito:
el CLI de Prisma los lee directamente desde el código fuente, no desde
`dist/`.

## 3. Prisma / migraciones

- Schema: `apps/api/prisma/schema.prisma` (única fuente de verdad, 138
  modelos).
- Generar el cliente: `pnpm --filter api run postinstall` corre
  automáticamente después de `pnpm install` (no requiere paso manual).
- Migrar en desarrollo: `pnpm prisma:migrate` (= `prisma migrate dev`).
  **No usar en producción.**
- Migrar en producción: `pnpm prisma:deploy` (= `prisma migrate deploy`,
  dentro de `apps/api`). Este es el comando que corre en el release phase
  de Heroku (ver Procfile) — aplica las migraciones pendientes sin generar
  ninguna nueva y sin pedir confirmación interactiva.

Validado en esta sesión contra una base de datos Postgres 15 vacía y
descartable (no la base de datos de desarrollo real): las 85 migraciones
existentes se aplicaron limpiamente de punta a punta con `prisma migrate
deploy`, y `apps/api` arrancó y sirvió tráfico contra esa misma base.

## 4. Variables de entorno

Ningún valor real acá — solo qué existe y para qué sirve. Ver
`apps/api/.env.example`, `apps/web/.env.example` y `apps/game/.env.example`
para la lista completa con comentarios.

### apps/api (Heroku app `codebuddies-api`)

| Variable | Obligatoria | Para qué |
|---|---|---|
| `NODE_ENV` | Sí (`production`) | Cookie `Secure`, `trust proxy`. Heroku NO la setea sola en runtime — hay que agregarla como config var. |
| `DATABASE_URL` | Sí | Conexión Postgres (Prisma). La inyecta el add-on de Postgres automáticamente. |
| `JWT_SECRET` | Sí | Firma/verifica JWT. La app falla al arrancar sin ella. |
| `CORS_ORIGINS` | Recomendada | `https://codebuddies.tech,https://game.codebuddies.tech` |
| `DEEPL_API_KEY` | **Sí** | `TranslateModule` está importado en `AppModule` y `TranslateService` lee esta variable en su constructor, lanzando si falta — se instancia al bootear, no al primer uso. Corregido: antes documentada acá como opcional, no lo es. |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | **Sí** | `UploadsModule` está importado en `AppModule`; `UploadsService` crea `new R2Storage()` como inicializador de campo (corre en el constructor), y el constructor de `R2Storage` lanza si falta cualquiera de las tres. Igual que arriba: se instancia al bootear, no es lazy. `R2_ACCOUNT_ID` se usa para armar el endpoint S3-compatible (`https://<account>.r2.cloudflarestorage.com`), sin hardcodear el account id. |
| `R2_BUCKET` / `R2_PUBLIC_URL` | Opcional | Se usan dentro de `R2Storage`/al armar URLs, pero no están guardadas por ningún throw — sin ellas el arranque no falla, aunque subir/servir archivos sí podría fallar en tiempo de uso. |
| `RESEND_API_KEY` / `EMAIL_FROM` | Opcional | Sin la key, solo loguea el email en vez de enviarlo |
| `REDIS_URL` | Opcional | Adapter Socket.IO multi-dyno + cache. Sin ella, degrada solo a un adapter en memoria |
| `PADDLE_*` | Opcional | Sin `PADDLE_API_KEY`, usa providers mock |
| `CERTIFICATE_PRICE_USD` / `CERTIFICATE_VERIFICATION_BASE_URL` | Opcional | Tienen default en código |
| `PORT` | La setea Heroku | No configurar a mano |

### apps/web (Heroku app `codebuddies-web`)

| Variable | Obligatoria | Para qué |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Sí | `https://api.codebuddies.tech` — se hornea en el build |
| `NEXT_PUBLIC_REALTIME_URL` | Opcional | Cae a `NEXT_PUBLIC_API_URL` |
| `NEXT_PUBLIC_GAME_URL` | Recomendada | `https://game.codebuddies.tech` — usada por el login para reconocer una redirección al juego |
| `NEXT_PUBLIC_ASSETS_URL` | Opcional | Base pública de los assets en Cloudflare R2 (`R2_PUBLIC_URL` del lado del cliente). Sin ella cae a string vacío — `next.config.ts` tampoco agrega el hostname a `images.remotePatterns` y las imágenes remotas de R2 no cargan vía `next/image`. |

### apps/game (Heroku app `codebuddies-game`)

| Variable | Obligatoria | Para qué |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Sí en producción | `https://api.codebuddies.tech` — sin ella, `getApiUrl()` lanza un error explícito en vez de degradar en silencio |
| `NEXT_PUBLIC_WEB_URL` | Recomendada | `https://codebuddies.tech` — a dónde volver si no hay sesión |
| `NEXT_PUBLIC_DISCORD_URL` | Opcional | Tiene default en código |
| `NEXT_PUBLIC_ASSETS_URL` | **Sí** | Base pública de los assets en Cloudflare R2 (`R2_PUBLIC_URL` del lado del cliente) — usada para el tileset del lobby (`LobbyScene.preload`) y el logo del sidebar. Sin ella esas imágenes no cargan (URL relativa vacía) y `next.config.ts` no agrega el hostname a `images.remotePatterns`. |

Las variables `NEXT_PUBLIC_*` se hornean en el bundle en **build time** —
hay que tenerlas seteadas como config vars de Heroku *antes* de que corra
el build, no solo en runtime.

### Cloudflare R2 (almacenamiento)

`apps/api` sube archivos (avatares/items del editor, vía `UploadsModule` →
`R2Storage`, `apps/api/src/modules/storage/r2.storage.ts`) a un bucket de
Cloudflare R2 usando el SDK de S3 (`@aws-sdk/client-s3`) contra el endpoint
S3-compatible de R2. No queda ninguna dependencia de DigitalOcean Spaces en
el código.

Pasos manuales en Cloudflare (no automatizados, ninguno hecho todavía):

1. Crear un bucket de R2 (nombre → `R2_BUCKET`).
2. Crear un API Token de R2 con permiso de lectura/escritura sobre ese
   bucket (R2 → Manage API Tokens) → `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`.
3. Anotar el Account ID de Cloudflare → `R2_ACCOUNT_ID`. El endpoint S3 se
   arma en código como `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`
   — no hay `R2_ENDPOINT` como variable separada.
4. Habilitar acceso público al bucket: conectar un dominio propio (p. ej.
   `assets.codebuddies.tech`, sin configurar todavía) o, mientras tanto,
   usar el subdominio público `r2.dev` que Cloudflare genera para el
   bucket → esa URL base es `R2_PUBLIC_URL` (server, `apps/api`) y
   `NEXT_PUBLIC_ASSETS_URL` (cliente, `apps/web` y `apps/game`) — ambas
   deben apuntar al mismo valor.
5. R2 no soporta ACLs por objeto (a diferencia de S3/Spaces) — la
   visibilidad pública se resuelve enteramente a nivel de bucket/dominio en
   el paso anterior, no en el código de subida.

El bucket todavía no existe — hasta crearlo, `apps/api` no arranca sin
`R2_ACCOUNT_ID`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY` configuradas (ver
tabla de arriba).

## 5. Heroku — una app de Heroku por app del monorepo

Las 3 apps se despliegan desde este mismo repositorio (rama `main`) a 3
apps de Heroku distintas, diferenciadas por una config var `DEPLOY_TARGET`
que cada una setea a su propio nombre de paquete pnpm (`web` | `api` |
`game`):

```
heroku config:set DEPLOY_TARGET=api  --app codebuddies-api
heroku config:set DEPLOY_TARGET=web  --app codebuddies-web
heroku config:set DEPLOY_TARGET=game --app codebuddies-game
```

El `Procfile` en la raíz (compartido por las 3) usa esa variable:

```
release: sh -c 'if [ "$DEPLOY_TARGET" = "api" ]; then pnpm --filter api run prisma:deploy; else echo "sin release phase para DEPLOY_TARGET=$DEPLOY_TARGET"; fi'
web: pnpm --filter "$DEPLOY_TARGET" run start
```

Y `package.json` (raíz) define `"heroku-postbuild": "pnpm --filter
\"$DEPLOY_TARGET\" run build"`, que Heroku corre automáticamente después de
`pnpm install`.

**Por qué no un buildpack de monorepo:** `apps/api` depende de
`@game/core` (`packages/core`) vía `workspace:*`. Los buildpacks que
"promueven" un subdirectorio a la raíz del build (ej. heroku-buildpack-
monorepo) complican esa resolución de workspace. Instalar el workspace
completo (`pnpm install` en la raíz, que Heroku ya hace por defecto) y
filtrar solo el build/start por app es más simple y ya viene resuelto por
pnpm nativamente — más lento de compilar que un build aislado, pero
suficiente para una primera producción.

Cada Heroku app necesita el buildpack estándar `heroku/nodejs` (uno solo,
sin extras) y, salvo `codebuddies-api`, no necesita ningún add-on.

`codebuddies-api` necesita:
- Add-on Heroku Postgres (setea `DATABASE_URL` automáticamente)
- Add-on de Redis (opcional, mientras corra en 1 solo dyno no hace falta)

### Reparto entre las 2 cuentas de Heroku (GitHub Student)

| Cuenta | Apps | Add-ons |
|---|---|---|
| Cuenta 1 | `codebuddies-api` | Postgres, Redis (opcional) |
| Cuenta 2 | `codebuddies-web`, `codebuddies-game` | ninguno |

Ni web ni game tocan la base de datos directamente, así que no hace falta
compartir `DATABASE_URL` entre cuentas — el reparto queda limpio.

## 6. Dominios

| Dominio | Apunta a |
|---|---|
| `codebuddies.tech` | Heroku app `codebuddies-web` |
| `api.codebuddies.tech` | Heroku app `codebuddies-api` |
| `game.codebuddies.tech` | Heroku app `codebuddies-game` |

Agregar cada dominio con `heroku domains:add <dominio> --app <app>` y
apuntar el DNS (CNAME/ALIAS) al target `*.herokudns.com` que entrega cada
app.

## 7. CORS

`apps/api` ya lee `CORS_ORIGINS` (lista separada por comas) tanto para
CORS HTTP como para el gateway de Socket.IO — no hay `origin: "*"` en
ningún lado con `credentials` habilitado. En producción:

```
CORS_ORIGINS=https://codebuddies.tech,https://game.codebuddies.tech
```

Sin esta variable, cae a `http://localhost:3000,http://localhost:3002`
(desarrollo) — no hace falta tocar código para pasar de un entorno a otro.

## 8. WebSocket

Un único gateway (`GameGateway`), sin cambios necesarios para el primer
despliegue:

- `pingInterval: 25000` / `pingTimeout: 60000` — ya por debajo del timeout
  de 55s del router de Heroku.
- Adapter Redis condicional (`RedisIoAdapter`): si `REDIS_URL` no está
  seteada, usa el adapter en memoria — correcto para 1 solo dyno de api.
- Auth del handshake: JWT manual vía `socket.handshake.auth.token` o
  cookie, verificado con `jwtService.verify()`.
- Sesiones "sticky" entre dynos no están garantizadas por el router de
  Heroku, pero mientras `codebuddies-api` corra en **1 solo dyno** (el plan
  para esta primera producción) esto no es un problema real.

## 9. Autenticación web → game

- `apps/api` es el único emisor/verificador de JWT (HS256, 1 día de
  expiración, sin refresh token).
- Login: `apps/api` setea una cookie `access_token` (httpOnly, `secure`
  solo si `NODE_ENV=production`, `sameSite: lax`, sin `domain` explícito —
  host-only a propósito, no se amplía el alcance sin necesidad) y devuelve
  el mismo token en el body de la respuesta.
- `apps/web` guarda el token en `localStorage` y lo manda como `Authorization:
  Bearer` en cada request (más `credentials:"include"` para la cookie).
- **Handoff al juego**: al loguearse, si el destino (`?redirect=`) es el
  origen de `apps/game` (comparado contra `NEXT_PUBLIC_GAME_URL`, no
  hardcodeado a `localhost` — corregido en esta sesión), `apps/web`
  redirige el navegador a esa URL con el JWT en el hash
  (`#codebuddies_token=...`). `apps/game` lo lee, lo guarda, y siempre
  valida contra `apps/api` (`GET /identity/me`) — nunca verifica el JWT
  por su cuenta.
- Si no hay sesión válida, `apps/game` redirige de vuelta a
  `{NEXT_PUBLIC_WEB_URL}/login?redirect=<url-del-juego>`.
- Socket.IO usa el mismo token vía el campo `auth` del handshake,
  releído en cada intento de conexión/reconexión.

**Requisito operativo:** `NEXT_PUBLIC_GAME_URL` debe estar seteada en
`codebuddies-web` con el dominio real (`https://game.codebuddies.tech`)
para que este flujo funcione en producción.

## 10. Checklist de producción

- [x] `apps/game` versionado en el repo principal (antes excluido vía `.gitignore`)
- [x] `apps/api` y `apps/game` respetan `process.env.PORT`
- [x] `apps/web` ya respetaba `$PORT` — sin cambios
- [x] Script `prisma:deploy` disponible en `apps/api` (y en la raíz)
- [x] `prisma generate` corre automáticamente en `postinstall`
- [x] `engines.node: "20.x"` fijado en los 4 `package.json`
- [x] Redirección login→juego reconoce el dominio real vía `NEXT_PUBLIC_GAME_URL`
- [x] `NEXT_PUBLIC_API_URL` unificado y obligatorio en producción en `apps/game`
- [x] `Procfile` + `heroku-postbuild` + `DEPLOY_TARGET` para desplegar las 3 apps desde un repo
- [x] `dist/main.js` se genera en la ruta correcta (bug real encontrado y corregido)
- [x] Build de las 3 apps verificado con variables de entorno de producción
- [x] Arranque de las 3 apps verificado (incluye conexión real a Postgres y `prisma migrate deploy` de punta a punta contra una base vacía)
- [x] Migración de almacenamiento de DigitalOcean Spaces a Cloudflare R2 (código listo, sin dependencia funcional de DigitalOcean)
- [ ] Bucket de Cloudflare R2 creado + API token + dominio/subdominio público configurado (paso manual, ver sección "Cloudflare R2" arriba)
- [ ] Config vars reales cargadas en cada app de Heroku (paso manual, próxima sesión) — incluye las nuevas `R2_*` / `NEXT_PUBLIC_ASSETS_URL`
- [ ] Dominios y DNS configurados (paso manual, próxima sesión)
- [ ] Primer `git push heroku main` (no realizado a propósito en esta sesión)

## 11. Riesgos conocidos que quedan fuera de esta preparación

- **~2100 hallazgos de lint preexistentes en `apps/api`** (mayormente
  formateo prettier) y **~215 en `apps/game`** (mayormente `no-explicit-
  any`) — ya tratados como informational/no bloqueantes en el CI existente
  antes de esta sesión. No se tocaron: son deuda técnica preexistente, sin
  relación con el trabajo de esta sesión, y arreglarlos habría significado
  un diff masivo fuera de alcance.
- **4 specs de `apps/api/src/modules/game/*`** fallan (dependencias de test
  incompletas) — ya excluidos explícitamente por el pipeline de CI
  existente (`--testPathIgnorePatterns=".../modules/game/"`), no es una
  regresión de esta sesión.
- **No hay endpoint de logout server-side** — el logout es 100% client-side
  (borra `localStorage`); la cookie `access_token` sigue siendo válida en
  el navegador hasta su expiración natural (24h). Preexistente, no
  modificado.
