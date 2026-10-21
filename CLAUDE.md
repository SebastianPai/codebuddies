# CodeBuddies — reglas para cualquier sesión (personas o IA)

## ⚠️ DEPLOY A HEROKU: LEER ANTES DE HACER `git push` A HEROKU

Producción (las 3 apps de Heroku: `codebuddies-api`, `codebuddies-web` y
`codebuddies-game`) **NO corre `main`**. `main` está más de 80 commits atrás
y le faltan muchas migraciones de base de datos. Si se despliega `main`, o
cualquier rama vieja, se **borra trabajo de producción** y el código queda
desfasado de la base de datos.

### Regla obligatoria antes de desplegar

1. Ver qué commit corre producción:
   `heroku releases -n 1 --app codebuddies-api` (el texto `Deploy <sha>`).
2. Comprobar que ese commit esté DENTRO de lo que vas a subir:
   `git merge-base --is-ancestor <sha-de-produccion> <tu-rama>`
   Si el comando falla (exit code ≠ 0), **NO despliegues**: tu rama borraría
   commits de producción. Primero hay que integrarla sobre producción
   (rebase o cherry-pick) y resolver los conflictos.
3. Desplegar en orden: api → web → game (la API aplica las migraciones en la
   release phase y las otras dos dependen de ella).

### Ramas peligrosas (NO desplegar ni fusionar tal cual)

Estado al 2026-10-20: producción está a medio desplegar.
- `codebuddies-api` = `973e02a` (rama `feat/premium-colors-parallax`, con las
  migraciones `room_item_color` y `theme_asset_parallax_depth` ya aplicadas).
- `codebuddies-web` y `codebuddies-game` = `01bed6b` (rama
  `deploy/icons-on-codestudio-v2`). Falta desplegar `feat/premium-colors-parallax`
  en estas dos (los cambios de la API son compatibles con las versiones viejas).

La rama base para trabajo nuevo es `feat/premium-colors-parallax`. Lo que
sigue en la tabla vale para todas las ramas que no la contienen:

| Rama | Por qué es peligrosa |
|---|---|
| `main` | Está 83 commits atrás de producción. |
| `feat/codestudio-v2` | Le falta el commit de íconos (`01bed6b`) que ya está en producción. |
| `feat/academy-content-prefill` | Su último commit es un "snapshot del árbol de trabajo antes de formatear el equipo": 363 archivos sobre una base vieja. Desplegarla revierte 57 commits. Antes de usarla hay que revisar archivo por archivo qué trae que producción no tenga. |
| `feat/admin-configurable-icons` | Reemplazada por `deploy/icons-on-codestudio-v2`. Se basa en `main`, así que también está atrás. |
| `backup/game-zz-pc-previews` | Páginas de prueba (`zz-pc`). No desplegar. |
| `release/*`, `feat/*` y `dependabot/*` viejas | Todas están atrás de producción. |

La rama que corre producción es `deploy/icons-on-codestudio-v2`. Todo
trabajo nuevo debe salir de ella (o de un commit que la contenga).

Cuando una rama se despliega, actualizá esta tabla y la línea de "Estado".
