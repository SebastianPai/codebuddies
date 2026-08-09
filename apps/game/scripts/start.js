#!/usr/bin/env node
// Heroku (y la mayoría de PaaS) asignan el puerto dinámicamente vía $PORT y
// solo enrutan tráfico externo a ese puerto. `next start -p <n>` no lee
// $PORT por sí solo si se le pasa -p explícito, así que este wrapper decide
// el puerto en Node (multiplataforma) en vez de depender de sintaxis de
// shell (${PORT:-3002}) que no funciona igual en Windows que en Linux.
//
// Sin $PORT (desarrollo local / `pnpm start` fuera de Heroku) sigue usando
// 3002, el mismo puerto que `next dev -p 3002`.
const { spawn } = require('node:child_process');

const port = process.env.PORT || '3002';

// Comando completo como un único string (en vez de shell:true + args[]) para
// evitar el deprecation warning DEP0190 de Node sobre argumentos sin escapar;
// `port` solo puede venir de $PORT (asignado por la plataforma), nunca de
// input de usuario.
const child = spawn(`next start -p ${port}`, {
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => process.exit(code ?? 0));
child.on('error', (err) => {
  console.error(err);
  process.exit(1);
});
