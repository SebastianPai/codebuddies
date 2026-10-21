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

Estado al 2026-10-20: las 3 apps de Heroku corren `7e9a9fa`, la punta de la
rama `feat/premium-colors-parallax` (`feat/codestudio-v2` + íconos + colores
premium + parallax). Es la rama base para todo trabajo nuevo. Lo que sigue en
la tabla vale para cualquier rama que NO contenga `7e9a9fa`:

| Rama | Por qué es peligrosa |
|---|---|
| `main` | Está 83 commits atrás de producción. |
| `feat/codestudio-v2` y `deploy/icons-on-codestudio-v2` | Les faltan los commits de colores y parallax que ya están en producción (y sus migraciones). |
| `feat/academy-content-prefill` | "Snapshot antes de formatear el equipo" sobre una base vieja: desplegarla revierte muchos commits. Ya se revisó (2026-10-20): no trae trabajo que falte en producción, solo 2 scripts `scratch-*.mjs`. Se puede archivar. |
| `feat/admin-configurable-icons` | Reemplazada por `deploy/icons-on-codestudio-v2`. Se basa en `main`, así que también está atrás. |
| `backup/game-zz-pc-previews` | Páginas de prueba (`zz-pc`). No desplegar. |
| `release/*`, `feat/*` y `dependabot/*` viejas | Todas están atrás de producción. |


Cuando una rama se despliega, actualizá esta tabla y la línea de "Estado".
