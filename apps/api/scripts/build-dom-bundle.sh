#!/usr/bin/env sh
# Regenera src/modules/exercise/dom-bundle.ts: linkedom (un DOM en JS puro)
# empaquetado en UN script que se evalúa DENTRO del contexto aislado del
# corrector (js-child.ts). Así ningún objeto del proceso anfitrión entra al
# contexto del alumno. No es una dependencia de producción: solo este texto.
#   sh apps/api/scripts/build-dom-bundle.sh
set -e
OUT="$(cd "$(dirname "$0")/.." && pwd)/src/modules/exercise/dom-bundle.ts"
TMP="$(mktemp -d)"
cd "$TMP"
npm init -y >/dev/null
npm i linkedom@0.18.9 esbuild@0.24.2 --silent
echo 'import { parseHTML } from "linkedom"; globalThis.__cbParseHTML = parseHTML;' > entry.mjs
# entities usa atob (o Buffer) para sus tablas: en el contexto no hay ninguno.
BANNER='if(typeof atob!=="function"){globalThis.atob=function(s){var c="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",o="",b=0,n=0;s=String(s).replace(/[^A-Za-z0-9+/]/g,"");for(var i=0;i<s.length;i++){b=(b<<6)|c.indexOf(s[i]);n+=6;if(n>=8){n-=8;o+=String.fromCharCode((b>>n)&255);}}return o;};}'
npx esbuild entry.mjs --bundle --format=iife --platform=neutral --main-fields=module,main --target=es2020 --minify --legal-comments=none --banner:js="$BANNER" --outfile=bundle.js
node -e '
const fs = require("fs");
const src = fs.readFileSync("bundle.js", "utf8");
fs.writeFileSync(process.argv[1], "/* eslint-disable */\n// GENERADO por scripts/build-dom-bundle.sh (linkedom 0.18.9, licencia ISC). No editar a mano.\nexport const DOM_BUNDLE: string = " + JSON.stringify(src) + ";\n");
' "$OUT"
echo "ok: $OUT"
