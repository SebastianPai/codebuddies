# Procfile compartido por las 3 apps de Heroku (codebuddies-web,
# codebuddies-api, codebuddies-game), todas desplegadas desde este mismo
# repo/rama. Cada app de Heroku se diferencia por su propia config var
# DEPLOY_TARGET (web | api | game) — ver docs/PRODUCTION.md.
#
# El build en sí (qué app se compila) se decide en package.json → scripts →
# "heroku-postbuild", que también lee DEPLOY_TARGET.

release: sh -c 'if [ "$DEPLOY_TARGET" = "api" ]; then pnpm --filter api run prisma:deploy; else echo "sin release phase para DEPLOY_TARGET=$DEPLOY_TARGET"; fi'
web: pnpm --filter "$DEPLOY_TARGET" run start
