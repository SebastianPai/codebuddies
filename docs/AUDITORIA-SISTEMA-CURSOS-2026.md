# Auditoría integral del sistema de aprendizaje — CodeBuddies

**Alcance:** `apps/api`, `apps/web`, `prisma`, código compartido, y todo lo relacionado con cursos, módulos, lecciones, ejercicios, progreso, certificados, academias y premium.
**Fuera de alcance (por instrucción explícita):** `apps/game` y todo lo estrictamente ligado al mundo virtual multijugador (avatares, rooms, items, marketplace, animaciones, code-studio). Donde ese sistema comparte infraestructura con cursos (base de datos, monorepo, API), se menciona solo como hallazgo de arquitectura, sin auditar su lógica interna.
**Método:** lectura directa de `prisma/schema.prisma` (134 modelos), `app.module.ts`, `main.ts`, configuración raíz, y dos auditorías profundas dirigidas sobre el backend de cursos (endpoints, DTOs, guards, servicios) y el frontend de aprendizaje (páginas, componentes, hooks, UX).
**Notación de prioridad:** Impacto y Complejidad se puntúan de ⭐ (mínimo) a ⭐⭐⭐⭐⭐ (máximo). "Complejidad" alta significa más esfuerzo/riesgo, no que deba evitarse.

---

## 1. Resumen ejecutivo

CodeBuddies tiene un modelo de datos ambicioso (134 modelos Prisma) y ya resuelve, al menos parcialmente, varias piezas difíciles de una plataforma e-learning: certificados verificables públicamente, multi-idioma con soporte RTL, sistema de XP/monedas/streak, leaderboards, y un editor de código en vivo con Monaco razonablemente sofisticado. Hay evidencia de trabajo de calidad puntual: el flujo de emisión de certificados usa transacciones atómicas y maneja condiciones de carrera correctamente; el sistema de subida de archivos valida el contenido real de la imagen en vez de confiar en el MIME declarado; hay comentarios de código que documentan decisiones de contraste WCAG AA.

Pero el sistema de cursos, tomado como producto, está muy lejos de poder competir con Udemy/Coursera/Codecademy hoy mismo, y no por falta de funcionalidades exóticas sino porque **partes del flujo principal (comprar premium, comprar un certificado, continuar donde quedaste) están literalmente sin conectar**: son pantallas placeholder o datos mock que no leen del backend. A esto se suma un hallazgo de seguridad severo (el módulo de progreso no tiene ningún guard de autenticación: cualquiera puede otorgar XP a cualquier usuario o leer su historial completo) y una fuga de PII pública (emails de los usuarios top del ranking, visibles sin login).

La causa raíz común a la mayoría de los hallazgos es **crecimiento no planificado sin red de seguridad**: no hay CI/CD, la cobertura de tests es mínima (9 specs fuera del módulo de juego, sobre 134 modelos y ~20 módulos de negocio), no hay documentación de API (sin Swagger), y no existe una capa de tipos/contratos compartida entre `apps/api` y `apps/web` — cada endpoint nuevo se integra "a mano" en el frontend, lo que explica por qué hay dos implementaciones distintas del mismo quiz, dos sistemas de gamificación en paralelo (`Achievement` legado vs. `Mission`/`GamificationAchievement` nuevo) y dos arquitecturas de administración conviviendo (`src/features/admin/*` moderna vs. páginas legadas en `app/admin/exercises`).

Esta auditoría documenta 9 problemas críticos, 30 importantes, 25 menores, y más de 180 recomendaciones de mejora concretas, organizadas por disciplina y priorizadas. La sección 23 propone un roadmap de 4 fases: la Fase 1 no añade ni una sola funcionalidad nueva — cierra las brechas de seguridad y conecta lo que ya existe pero está desenchufado.

---

## 2. Fortalezas

| # | Fortaleza | Evidencia |
|---|---|---|
| F1 | Emisión de certificados atómica y segura ante condiciones de carrera | `certificates.service.ts:issueCertificate` usa `$transaction`, maneja `P2002` devolviendo el certificado existente en vez de fallar |
| F2 | Verificación pública de certificados ya implementada | `GET /certificates/verify/:verificationCode` público, página de verificación con diseño de diploma, badge válido/inválido |
| F3 | Modelo de datos i18n sólido, con soporte RTL desde el diseño | `Language.direction`, tablas `*Translation` para Course/Lesson/Exercise/Module/Achievement |
| F4 | Editor de código en vivo relativamente completo | Monaco, tri-panel HTML/CSS/JS redimensionable, iframe sandboxed, markdown con syntax highlighting |
| F5 | Validación de archivos por contenido real, no por MIME declarado | `uploads.service.ts` usa detección de firma de imagen (`detectImage`), no confía en `Content-Type` del cliente |
| F6 | Ledger de transacciones para XP y monedas | `XPTransaction`/`CoinTransaction` existen como tablas append-only, no solo un contador mutable |
| F7 | Cabeceras de seguridad y manejo global de errores centralizados | `helmet()` + `AllExceptionsFilter` global aplicados de forma consistente en todo `main.ts` |
| F8 | Auto-traducción integrada en el panel admin | `TranslationsForm` con botón "traducir automáticamente desde español" vía DeepL — ahorra trabajo real a un editor de contenido |
| F9 | Rate limiting global ya presente (no partía de cero) | `ThrottlerModule` con 120 req/min/IP aplicado como guard global |
| F10 | Infraestructura de gamificación e email marketing ya modelada | Tablas `Mission`, `GamificationAchievement`, `RewardLedgerEntry`, `EmailTemplate/Campaign/Log`, `ReferralProfile/Program` — no hay que diseñar desde cero, hay que *conectar* |
| F11 | Diseño consciente de contraste de color | Comentarios explícitos en `globals.css` justificando decisiones AA (ej. por qué se evita `green-600` en texto pequeño) |
| F12 | Panel admin con KPIs reales | `app/admin/page.tsx` muestra usuarios, cursos, certificados emitidos, suscriptores premium y gráficos de series temporales alimentados por datos reales |
| F13 | Buen patrón de ownership check donde se aplica | `payments.service.ts` verifica `order.userId !== userId` correctamente — el patrón correcto existe en el código, solo falta aplicarlo consistentemente |
| F14 | UX de descubrimiento de cursos con toques cuidados | Buscador tipo "terminal" con atajo `Ctrl/Cmd+K`, filtros de dificultad con `aria-pressed`, animaciones Framer Motion en las cards |

---

## 3. Debilidades

| # | Debilidad | Por qué importa |
|---|---|---|
| D1 | El monolito mezcla 3 productos distintos en una sola API y un solo schema | Cursos/e-learning, mundo virtual multijugador, y un simulador tipo "Code Studio" comparten `schema.prisma` y `app.module.ts` — cualquier migración de BD, cualquier incidente de carga, y cualquier decisión de escalado afecta a los tres a la vez |
| D2 | Cero capa de contratos compartidos entre API y web | Sin OpenAPI, sin tipos generados, sin paquete `shared` real — cada tipo de respuesta se re-declara a mano en el frontend, con deriva garantizada en el tiempo |
| D3 | El flujo de monetización no está conectado de punta a punta | `/premium`, `/certificates/buy/[courseId]` son placeholders; los proveedores de pago son mocks; los métodos de checkout existen en el backend pero ningún controlador los expone |
| D4 | Terminología del dominio invertida respecto al estándar del sector | `Module` agrupa *Cursos*, no lecciones dentro de un curso — lo opuesto a Udemy/Coursera, fuente de confusión para todo nuevo desarrollador o admin |
| D5 | Cero pruebas automatizadas de peso, cero CI/CD | 9 archivos `.spec.ts` fuera del módulo de juego, sin pipeline en `.github`, todo el control de calidad es manual |
| D6 | Endpoints críticos sin autenticación | Ver problema crítico C1 — no es un detalle, es el hallazgo más grave de la auditoría |
| D7 | Dos sistemas de gamificación en paralelo, sin claridad de cuál es la fuente de verdad | `Achievement`/`UserAchievement` (legado, atado 1:1 a curso) vs. `Mission`/`GamificationAchievement`/`RewardBundle`/`GamificationBadge` (nuevo) |
| D8 | Datos simulados en producción en la pantalla más visitada (dashboard) | "Continuar aprendiendo", "Top jugadores" y el reto diario son arrays hardcodeados, no datos reales |
| D9 | Sin gobernanza de contenido | No existe estado borrador/publicado en curso/módulo/lección/ejercicio: todo lo que se guarda queda visible de inmediato, sin vista previa ni aprobación |
| D10 | SEO inexistente en el árbol de rutas activo | El único `export const metadata` del repo vive en un `layout.tsx` huérfano que Next.js nunca renderiza |

---

## 4. Problemas críticos

Estos hallazgos deben resolverse antes de cualquier lanzamiento serio o campaña de adquisición de usuarios.

| ID | Problema | Impacto | Complejidad | Tiempo | Beneficio esperado |
|---|---|---|---|---|---|
| **C1** | `POST /progress` y `GET /progress/user/:userId` **no tienen ningún guard de autenticación**. Cualquiera puede otorgar XP/monedas/racha a cualquier `userId` arbitrario, o leer el historial de progreso completo de cualquier usuario, sin login. | ⭐⭐⭐⭐⭐ | ⭐⭐ | 1-2 días | Cierra el vector de abuso más grave del sistema (farming de XP, manipulación de rankings/certificados, fuga de datos personales) |
| **C2** | `GET /rankings` (sin guard) filtra el **email** de los top-10 usuarios en 5 categorías distintas a cualquier visitante anónimo. | ⭐⭐⭐⭐⭐ | ⭐ | Horas | Elimina una fuga de PII pública trivialmente explotable (scraping de emails para spam/phishing dirigido) |
| **C3** | `GET /exercises/:id` y `GET /exercises/lesson/:lessonId` devuelven siempre las **respuestas correctas de los quizzes** (`correct: [...]`) en el payload, sin importar si el usuario completó el ejercicio o está autenticado. | ⭐⭐⭐⭐⭐ | ⭐⭐ | 2-3 días | Evita que cualquier estudiante inspeccione la red del navegador y obtenga todas las respuestas antes de intentarlo — rompe la validez pedagógica del quiz |
| **C4** | Todo el flujo de compra (premium y certificados pagos) es inalcanzable: `/premium` y `/certificates/buy/[courseId]` son páginas placeholder; `createCheckoutForOrder`/`createPremiumCheckout` existen en el backend pero **ningún controlador los llama**. | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 3-4 semanas | Sin esto no hay negocio: hoy la única forma de dar premium a alguien es que un admin lo otorgue manualmente uno por uno |
| **C5** | Los proveedores de pago/suscripción son **mocks literales** (`mock-payment.provider.ts`, `mock-subscription.provider.ts`) sin integración real a Stripe/PayPal/MercadoPago, y no existe ningún endpoint de webhook en todo el repo. | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 3-4 semanas (junto a C4) | Requisito no negociable para monetizar; sin webhook no hay forma de confirmar pagos asíncronos de ningún proveedor real |
| **C6** | Cambios de rol de administrador (`GRANT_ADMIN`) y de premium/certificados no dejan **ningún registro de auditoría** de quién los ejecutó ni cuándo. | ⭐⭐⭐⭐ | ⭐⭐ | 3-5 días | Una escalación de privilegios indebida hoy es indetectable e irrastreable — riesgo legal y de seguridad grave |
| **C7** | Ninguna escritura múltiple relacionada con progreso (`completion` + XP + monedas + `XPTransaction` + `CoinTransaction` + `Activity`) está envuelta en `$transaction`. | ⭐⭐⭐⭐ | ⭐⭐ | 3-5 días | Sin esto, una caída a mitad de proceso deja XP otorgado sin ledger, o completions sin recompensa — inconsistencia de datos silenciosa y difícil de auditar después |
| **C8** | El "Continuar aprendiendo" del dashboard, el "racha" en la página de curso, y el widget "Top jugadores" del dashboard son **datos hardcodeados**, no reales. | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 1-2 semanas | Es la función de retención más visible del producto y hoy no hace nada — cualquier usuario que la use dos veces notará que no cambia |
| **C9** | Contenido de curso/lección/ejercicio (`content`, `codes`) se acepta y persiste como `any` sin validación de forma ni límite de tamaño, y no hay ningún control de sanitización antes de re-renderizarlo. | ⭐⭐⭐⭐ | ⭐⭐⭐ | 1-2 semanas | Riesgo de XSS almacenado si en algún punto el frontend renderiza ese contenido como HTML/markdown sin sanitizar; hoy no hay ninguna barrera de contención en el backend |

---

## 5. Problemas importantes

| ID | Problema | Impacto | Complejidad | Tiempo |
|---|---|---|---|---|
| I1 | `CreateCourseDto`, `UpdateCourseDto`, `CreateModuleDto`, `CreateLessonDto`, `CreateExerciseDto` no tienen **ningún decorador `class-validator`** — la validación global no hace nada sobre ellos porque además los controladores tipan el body como `any` | ⭐⭐⭐⭐ | ⭐⭐ | 1 semana |
| I2 | Ningún endpoint de listado (`GET /courses`, `/modules`, `/lessons`, `/exercises/admin`, `/admin/users`, `/admin/certificate-access`) implementa paginación real por cursor/offset | ⭐⭐⭐⭐ | ⭐⭐⭐ | 1-2 semanas |
| I3 | `GET /courses` y `GET /modules` devuelven el árbol completo anidado (curso → lecciones → ejercicios → traducciones) sin límite — cada carga de la página de cursos trae *todo* el catálogo completo | ⭐⭐⭐⭐ | ⭐⭐ | 3-5 días |
| I4 | Patrón N+1 idéntico duplicado en `course.service.ts`, `module.service.ts` y `exercise.service.ts`: por cada traducción, `findUnique` de idioma + `update`/`create` en un `for` secuencial | ⭐⭐⭐ | ⭐⭐ | 3-5 días |
| I5 | Lógica de racha (streak) implementada dos veces de forma divergente: `identity.service.ts` en UTC, `progress.service.ts` en hora local — pueden desincronizarse cerca de medianoche | ⭐⭐⭐⭐ | ⭐⭐ | 2-3 días |
| I6 | No existe estado `draft`/`published` en Curso/Módulo/Lección/Ejercicio — todo contenido guardado queda visible de inmediato | ⭐⭐⭐⭐ | ⭐⭐⭐ | 1-2 semanas |
| I7 | No hay borrado suave (soft delete) en ningún modelo de contenido — `deleteCourse` hace 4 deletes secuenciales sin `$transaction`, sin posibilidad de recuperación | ⭐⭐⭐⭐ | ⭐⭐ | 3-5 días |
| I8 | `Ranking` no tiene **ningún índice** salvo la PK, pese a ser la tabla detrás del leaderboard; tampoco tiene `@@unique([userId, type, period])`, por lo que puede haber filas duplicadas por usuario/periodo | ⭐⭐⭐⭐ | ⭐⭐ | 2-3 días |
| I9 | Dos modelos de premium solapados: `Subscription` (legado) y `PremiumSubscription` (nuevo) — no está claro cuál es la fuente de verdad ni si ambos se consultan en algún flujo | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 2-3 semanas (migración) |
| I10 | Dos implementaciones independientes de la pantalla de quiz (`/learn/exercise/[id]` vs `/learn/exercise/quiz/[id]`), la primera aparentemente inalcanzable/muerta, con lógicas de auth y recompensa divergentes | ⭐⭐⭐ | ⭐⭐ | 3-5 días |
| I11 | Dos arquitecturas de administración conviviendo: `src/features/admin/{courses,modules,lessons}` (moderna) vs. `app/admin/exercises` (legada, con `window.confirm()`/`alert()` nativos) | ⭐⭐⭐ | ⭐⭐⭐⭐ | 2-3 semanas |
| I12 | Sin caché de sesión/auth centralizada en el frontend: `useAuth()` existe pero varias pantallas (detalle de curso, quiz duplicado) leen `localStorage` directamente en vez de usar el hook | ⭐⭐⭐ | ⭐⭐ | 3-5 días |
| I13 | Cálculo de "nivel" duplicado con fórmulas distintas: dashboard usa `(level+1)*500` sobre `user.level` real; la página de curso calcula `Math.floor(xpLocal/500)+1` sobre una suma local — pueden mostrar números distintos al mismo usuario en la misma sesión | ⭐⭐⭐ | ⭐ | 1-2 días |
| I14 | Sin `Swagger`/OpenAPI en toda la API — ni un solo endpoint documentado de forma navegable/consumible por herramientas | ⭐⭐⭐⭐ | ⭐⭐ | 1 semana |
| I15 | `admin-users.service.ts` y `admin.controller.ts` limitan listados a `take: 50`/`take: 100` fijo, sin `skip`/cursor — no es paginación, es un techo duro; pasado ese número de usuarios/accesos, quedan invisibles para el admin salvo que coincidan con la búsqueda | ⭐⭐⭐⭐ | ⭐⭐ | 3-5 días |
| I16 | `GET /translate` no tiene guard ni límite de tamaño de texto — proxy gratuito y anónimo hacia una API de pago (DeepL), solo protegido por el throttle genérico global | ⭐⭐⭐ | ⭐ | 1-2 días |
| I17 | No hay editor enriquecido para el contenido de lecciones en el admin — es un `<textarea>` plano de markdown, sin vista previa en vivo ni resaltado de sintaxis mientras se escribe | ⭐⭐⭐ | ⭐⭐⭐ | 1-2 semanas |
| I18 | Sin reordenamiento por arrastrar-y-soltar en ningún nivel del admin (módulos, cursos, lecciones, ejercicios) — el orden se edita a mano con un `<input type="number">` | ⭐⭐⭐ | ⭐⭐ | 1 semana |
| I19 | Accesibilidad (`aria-*`) prácticamente ausente: de todas las superficies de curso/aprendizaje/certificados/premium/pricing/rankings/login/register auditadas, solo 2 archivos tienen atributos ARIA | ⭐⭐⭐⭐ | ⭐⭐⭐ | 2-3 semanas |
| I20 | Cero metadatos SEO en el árbol de rutas real: sin `generateMetadata`, sin Open Graph, sin JSON-LD, sin sitemap.xml/robots.txt | ⭐⭐⭐⭐ | ⭐⭐ | 1 semana |
| I21 | Estados de carga/error inconsistentes: páginas nuevas (rankings, logros, dashboard) usan skeletons y componentes de error compartidos; el funnel principal (cursos → curso → certificado) mezcla texto plano "Cargando…" con componentes retrofit | ⭐⭐⭐ | ⭐⭐ | 1 semana |
| I22 | `GET /exercises/:id?userId=` y `GET /exercises/lesson/:lessonId?userId=` confían en un `userId` de query string no autenticado para calcular estado "completado" de terceros | ⭐⭐⭐⭐ | ⭐⭐ | 2-3 días |
| I23 | Sin webhook ni endpoint de callback asíncrono en todo el repositorio — ni siquiera como estructura preparada para cuando se conecte un proveedor real | ⭐⭐⭐ | ⭐⭐⭐ | incluido en C5 |
| I24 | El código de emails/campañas (`EmailTemplate`, `EmailCampaign`, `EmailLog`) y de referidos (`ReferralProfile`, `ReferralProgramConfig`) existe en el schema y como módulo backend, pero su conexión real con onboarding/reactivación de estudiantes de cursos no está verificada ni es visible en el frontend de aprendizaje | ⭐⭐⭐ | ⭐⭐⭐ | 1-2 semanas (auditoría dedicada) |
| I25 | Sin límite de tamaño ni validación de forma en `Json` de contenido de lección/ejercicio — cualquier admin (o, peor, cualquier bug de validación futuro) puede guardar payloads arbitrariamente grandes | ⭐⭐⭐ | ⭐⭐ | 3-5 días |
| I26 | `module.service.ts` lanza un `new Error()` genérico en vez de una excepción Nest, lo que lo convierte en un 500 opaco para un problema de input del cliente (falta de traducciones) | ⭐⭐ | ⭐ | Horas |
| I27 | Sin caché de aplicación (Redis solo se usa para el adapter de Socket.IO, no como caché de consultas) — cada carga de catálogo de cursos golpea Postgres directamente | ⭐⭐⭐ | ⭐⭐⭐ | 1-2 semanas |
| I28 | Sin control de versión de API (`/v1` u otro esquema) — cualquier cambio breaking futuro no tiene forma de convivir con clientes viejos | ⭐⭐⭐ | ⭐⭐ | 3-5 días si se hace ahora (crece con el tiempo si se pospone) |
| I29 | El editor de código en vivo (workspace de ejercicios de código) tiene **cero breakpoints responsive** — es de escritorio únicamente, sin ningún fallback para tablet/móvil | ⭐⭐⭐ | ⭐⭐⭐⭐ | 2-3 semanas |
| I30 | No existe un hook/patrón compartido de fetching (tipo React Query/SWR) — el patrón `useState(loading/error/data)` + `useEffect(fetch)` está copiado a mano en ~20 lugares distintos | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 2-3 semanas (migración incremental) |

---

## 6. Problemas menores

| ID | Problema | Impacto | Complejidad | Tiempo |
|---|---|---|---|---|
| M1 | `progress/entities/progress.entity.ts` es una clase vacía sin uso — código muerto | ⭐ | ⭐ | Minutos |
| M2 | `UpdateProgressDto` existe pero no hay ningún endpoint `PATCH` que lo use | ⭐ | ⭐ | Minutos |
| M3 | DTOs completamente validados (`IssueCertificateDto`, `CreateCertificateAccessDto`, `CreateCertificateOrderDto`) que ningún controlador termina usando realmente | ⭐ | ⭐ | Horas |
| M4 | `certificates.repository.ts` selecciona `email` del usuario aunque el mapeo de respuesta nunca lo expone — select innecesario | ⭐ | ⭐ | Minutos |
| M5 | Verificación de certificado acepta tanto `verificationCode` como el `id` interno como clave de búsqueda intercambiable — amplía innecesariamente la superficie pública | ⭐⭐ | ⭐ | Horas |
| M6 | `translate.service.ts` usa `console.error` en vez del `Logger` de Nest que se usa en el resto del código | ⭐ | ⭐ | Minutos |
| M7 | Ruta `GET /identity/admin` devuelve un stub `{ secret: 'solo admins' }` — parece un endpoint de prueba olvidado en producción | ⭐ | ⭐ | Minutos |
| M8 | JWT se expone tanto en cookie `httpOnly` como en el cuerpo de la respuesta — decisión documentada mas no revisada recientemente frente a superficie XSS | ⭐⭐ | ⭐⭐ | 1-2 días (evaluación) |
| M9 | Lógica de transformación de respuesta de ejercicios (CODE/QUIZ/LIVE) duplicada casi textual entre `getExercisesByLesson` y `getExerciseById` | ⭐⭐ | ⭐⭐ | 1-2 días |
| M10 | Bloque de traducción "buscar por idioma, si no existe caer a español, si no al primero" copiado 18 veces en 4 archivos, con pequeñas divergencias entre copias | ⭐⭐ | ⭐⭐ | 2-3 días |
| M11 | Guard triple `@UseGuards(...) + @Roles('ADMIN')` repetido por ruta en vez de aplicado a nivel de controlador donde correspondería (course/module/lesson/exercise) | ⭐⭐ | ⭐⭐ | 1-2 días |
| M12 | `apps/web/src/app/` es un scaffold de `create-next-app` huérfano que nunca se renderiza pero sigue en el repo (incluye el único `metadata` real del proyecto, inerte) | ⭐⭐ | ⭐ | Horas |
| M13 | `components/admin/TranslationsForm.tsx` (legado) coexiste con `src/shared/ui/translations-form.tsx` (nuevo) — dos implementaciones del mismo formulario según qué sección de admin se use | ⭐⭐ | ⭐⭐ | 2-3 días |
| M14 | Rutas placeholder sin funcionalidad real: `/learn/exercise/live/[id]` y `/learn/exercise/result` | ⭐⭐ | ⭐⭐⭐ | 1-2 semanas (si se decide implementar) |
| M15 | Tabla comparativa de planes en `/pricing` marca "Incluido" en todas las celdas sin diferenciar entre tiers — la tabla no compara nada realmente | ⭐⭐ | ⭐ | Medio día |
| M16 | Botones de íconos sociales en el Footer (`<a href="#">`) sin `aria-label` ni texto oculto para lectores de pantalla | ⭐ | ⭐ | Horas |
| M17 | Toggle de mostrar/ocultar contraseña en login/registro sin `aria-label` | ⭐ | ⭐ | Minutos |
| M18 | `CachedImage` no fuerza `alt` obligatorio — varios usos del componente omiten texto alternativo | ⭐⭐ | ⭐ | 1 día |
| M19 | Sin `aria-live` en los banners de error de login/registro, ni `aria-invalid` en campos fallidos | ⭐⭐ | ⭐ | 1 día |
| M20 | Varios componentes de `src/features/admin` están escritos como una única línea densa de código (ej. `courses-list-page.tsx` con ~1600 caracteres en una sola línea) — dificulta revisión y diffs de git | ⭐⭐ | ⭐⭐ | 2-3 días (solo reformateo con Prettier) |
| M21 | Magic numbers sin nombrar: `experience ?? 10, coins ?? 5` en ejercicios, año fijo de premium otorgado por admin, `monthlyAmount: 9.99` hardcodeado en código en vez de config/BD | ⭐⭐ | ⭐ | 1 día |
| M22 | `Achievement` no tiene campo de tipo/criterio/ícono — el "cómo se gana" probablemente vive hardcodeado en algún servicio, no es data-driven | ⭐⭐ | ⭐⭐⭐ | 1 semana |
| M23 | Falta de imagen de fallback consistente: las cards de curso caen a una foto de stock de Unsplash si no hay `imageUrl`, generando catálogos con fotos genéricas no relacionadas al contenido | ⭐ | ⭐ | 1 día |
| M24 | No hay debounce ni indicación visual de "buscando" en el buscador de cursos (bajo riesgo hoy porque busca client-side, pero bloqueante si se mueve a búsqueda server-side) | ⭐ | ⭐ | Horas |
| M25 | El icono/estado `isNew`/`isPopular` de las cards de curso parece un flag estático del API, no una badge calculada dinámicamente (recencia real, popularidad real) | ⭐⭐ | ⭐⭐ | 2-3 días |

---

## 7. Mejoras rápidas (Quick Wins)

Ordenadas por relación beneficio/esfuerzo — todas ejecutables en días, no semanas.

| ID | Mejora | Impacto | Complejidad | Tiempo | Beneficio esperado |
|---|---|---|---|---|---|
| QW1 | Añadir `JwtAuthGuard` a `POST /progress` y `GET /progress/user/:userId`, derivando `userId` del JWT en vez de confiar en el body/param | ⭐⭐⭐⭐⭐ | ⭐⭐ | 1-2 días | Cierra C1, el hallazgo más grave |
| QW2 | Quitar `email` del `select` de las consultas de ranking público | ⭐⭐⭐⭐⭐ | ⭐ | Horas | Cierra la fuga de PII (C2) |
| QW3 | Ocultar el array `correct` de las respuestas de quiz cuando el ejercicio no está completado por el usuario autenticado | ⭐⭐⭐⭐⭐ | ⭐⭐ | 1-2 días | Cierra C3 |
| QW4 | Envolver `createProgress` en `prisma.$transaction` | ⭐⭐⭐⭐ | ⭐⭐ | 1-2 días | Elimina el riesgo de estado inconsistente entre XP/monedas/ledger |
| QW5 | Envolver `deleteCourse`/`deleteModule` en `$transaction` | ⭐⭐⭐ | ⭐ | Medio día | Evita borrados parciales huérfanos |
| QW6 | Añadir índice a `Ranking` (`@@index([type, period, score])`, `@@unique([userId, type, period])`) | ⭐⭐⭐⭐ | ⭐ | Medio día + migración | Leaderboard deja de degradarse con el crecimiento |
| QW7 | Cambiar `new Error()` por `BadRequestException` en `module.service.ts` | ⭐ | ⭐ | Minutos | El cliente recibe un 400 útil en vez de un 500 genérico |
| QW8 | Reemplazar `console.error` por `Logger` en `translate.service.ts` | ⭐ | ⭐ | Minutos | Logs consistentes y filtrables |
| QW9 | Añadir rate limit específico (más estricto) a `POST /translate` y separado del global | ⭐⭐⭐ | ⭐ | Medio día | Corta el vector de abuso de cuota de DeepL |
| QW10 | Eliminar `apps/web/src/app/` (scaffold huérfano) o migrar su `metadata` al `layout.tsx` real | ⭐⭐⭐ | ⭐ | Medio día | Primer paso obligatorio antes de cualquier trabajo de SEO |
| QW11 | Añadir `export const metadata`/`generateMetadata` al `layout.tsx` real y a `/courses/[id]`, `/certificates/[certificateId]` | ⭐⭐⭐⭐ | ⭐⭐ | 2-3 días | Cada página empieza a tener `<title>`/meta reales por primera vez |
| QW12 | Eliminar la ruta de quiz duplicada/muerta (`/learn/exercise/[id]`) o redirigirla | ⭐⭐ | ⭐ | Medio día | Menos superficie de mantenimiento, menos confusión |
| QW13 | Sustituir `window.confirm()`/`alert()` en `admin/exercises` por el `Dialog`/`toast` ya existente en `src/shared/ui` | ⭐⭐ | ⭐⭐ | 1-2 días | Consistencia visual del panel admin |
| QW14 | Unificar el cálculo de "nivel" en un solo helper compartido, usado por dashboard y detalle de curso | ⭐⭐⭐ | ⭐ | 1 día | Elimina el riesgo de mostrar dos niveles distintos al mismo usuario |
| QW15 | Añadir `aria-label` a los íconos sociales del Footer y al toggle de contraseña | ⭐ | ⭐ | Horas | Accesibilidad básica, esfuerzo mínimo |
| QW16 | Forzar `alt` obligatorio (tipado) en `CachedImage` | ⭐⭐ | ⭐ | 1 día | Previene regresiones futuras de accesibilidad en imágenes |
| QW17 | Reemplazar el "Top jugadores" hardcodeado del dashboard por una llamada real a `/rankings` (que ya existe y funciona en la página de rankings) | ⭐⭐⭐⭐ | ⭐⭐ | 2-3 días | Elimina uno de los tres datos falsos más visibles del producto |
| QW18 | Diferenciar de verdad la tabla comparativa de `/pricing` (marcar qué NO incluye cada plan) | ⭐⭐⭐ | ⭐ | 1 día | Una tabla de precios que miente por omisión reduce conversión, no la mejora |
| QW19 | Añadir `robots.txt` y `app/sitemap.ts` estáticos como primer paso de SEO | ⭐⭐⭐ | ⭐ | 1 día | Requisito mínimo de indexabilidad |
| QW20 | Documentar/loggear qué admin ejecuta `GRANT_ADMIN`/`GRANT_PREMIUM`/accesos de certificado, aunque sea con un log estructurado simple antes de construir la tabla de auditoría completa | ⭐⭐⭐⭐ | ⭐⭐ | 1-2 días | Mitigación inmediata de C6 mientras se construye la solución completa (ver I6/ADM) |

---

## 8. Mejoras de alto impacto

Iniciativas más grandes que un quick win, pero que cambian sustancialmente el producto.

| ID | Mejora | Impacto | Complejidad | Tiempo | Beneficio esperado |
|---|---|---|---|---|---|
| HI1 | Conectar un proveedor de pago real (Stripe recomendado) con webhooks para premium y certificados pagos | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 3-4 semanas | Habilita el modelo de negocio real; hoy no existe una vía de compra funcional |
| HI2 | Implementar paginación cursor-based real en todos los listados de cursos/módulos/lecciones/ejercicios/usuarios, con un `PaginationDto`/`PaginatedResponse<T>` compartido | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 2 semanas | Condición necesaria para escalar el catálogo y el panel admin más allá de cientos de registros |
| HI3 | Construir "Continuar aprendiendo" real: última lección/ejercicio incompleto por curso, con deep-link directo | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 1-2 semanas | La función de retención #1 de cualquier plataforma de e-learning, hoy inexistente pese a aparentar existir |
| HI4 | Introducir estado `draft`/`published`/`archived` en Curso/Módulo/Lección/Ejercicio con vista previa antes de publicar | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 2-3 semanas | Permite construir contenido sin exponerlo a estudiantes a medio terminar |
| HI5 | Migrar el fetching del frontend a React Query (o SWR) de forma incremental empezando por cursos/dashboard/certificados | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 3-4 semanas (incremental) | Caché, reintentos, invalidación y estados de carga consistentes "gratis"; elimina ~20 copias del mismo patrón manual |
| HI6 | Unificar `Subscription` y `PremiumSubscription` en un solo modelo de suscripción, con migración de datos | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 2-3 semanas | Elimina ambigüedad de "¿cuál es el estado premium real de este usuario?" |
| HI7 | Unificar el sistema de logros: decidir si `Achievement` (legado) migra a `GamificationAchievement`/`Mission` (nuevo) o viceversa, y deprecar el otro | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 3-4 semanas | Hoy cualquier feature de gamificación nueva no sabe con certeza a qué sistema conectarse |
| HI8 | Diseñar e implementar Learning Paths / Roadmaps que agrupen varios cursos con una secuencia recomendada y prerequisitos | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 3-4 semanas | Es la funcionalidad que más diferencia a Coursera/Codecademy de "una lista de cursos sueltos" |
| HI9 | Introducir un editor de contenido enriquecido (rich text/MDX) con vista previa en vivo para lecciones, reemplazando el `<textarea>` de markdown plano | ⭐⭐⭐⭐ | ⭐⭐⭐ | 2 semanas | Reduce fricción real del equipo de contenido, hoy escribiendo markdown a ciegas |
| HI10 | Reordenamiento drag-and-drop de módulos/cursos/lecciones/ejercicios en el panel admin | ⭐⭐⭐ | ⭐⭐⭐ | 1-2 semanas | Reemplaza edición manual de números de orden, propensa a colisiones |
| HI11 | Sistema de auditoría de acciones administrativas (`AdminActionLog`) para toda acción sensible (roles, premium, certificados, borrados de contenido) | ⭐⭐⭐⭐ | ⭐⭐⭐ | 1-2 semanas | Requisito de higiene operacional y, en muchas jurisdicciones, de cumplimiento |
| HI12 | Implementar caché de aplicación (Redis) para catálogo de cursos, rankings y dashboard de admin | ⭐⭐⭐⭐ | ⭐⭐⭐ | 1-2 semanas | Reduce carga a Postgres en las rutas más visitadas del producto |
| HI13 | Sistema de reseñas y calificaciones de curso (`CourseReview`), visible en la página de curso y usado para ordenar/recomendar | ⭐⭐⭐⭐ | ⭐⭐⭐ | 2 semanas | Señal de confianza social ausente hoy; estándar en toda plataforma competidora |
| HI14 | Pipeline de CI (lint + typecheck + tests + build) en cada PR, como mínimo sobre `apps/api` y `apps/web` | ⭐⭐⭐⭐⭐ | ⭐⭐ | 1 semana | Red de seguridad mínima; hoy cualquier regresión llega a producción sin ninguna verificación automática |
| HI15 | Añadir Swagger/OpenAPI generado desde los DTOs, más un cliente tipado generado para el frontend | ⭐⭐⭐⭐ | ⭐⭐⭐ | 1-2 semanas | Resuelve de raíz D2 (cero contratos compartidos) sin construir un paquete `shared` desde cero |

---

## 9. Nuevas funcionalidades recomendadas

Organizadas por categoría, cubriendo explícitamente los puntos pedidos (learning paths, notas, favoritos, gamificación, ejercicios, etc.).

### 9.1 Descubrimiento y planificación del aprendizaje

| ID | Funcionalidad | Impacto | Complejidad | Tiempo |
|---|---|---|---|---|
| NF1 | Learning Paths / Roadmaps (secuencias curadas de cursos) | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 3-4 semanas |
| NF2 | Prerrequisitos entre cursos, visibles antes de inscribirse | ⭐⭐⭐⭐ | ⭐⭐ | 1 semana |
| NF3 | Tiempo estimado por lección/ejercicio/curso, agregado y mostrado en cada nivel | ⭐⭐⭐⭐ | ⭐⭐ | 1 semana |
| NF4 | Objetivos de aprendizaje explícitos por curso ("al terminar sabrás...") | ⭐⭐⭐ | ⭐ | 3-5 días |
| NF5 | Motor de recomendaciones ("cursos para ti" basado en historial/dificultad completada) | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 2-3 semanas (v1 basada en reglas, no ML) |
| NF6 | Categorías/tags de curso (más allá de solo "Módulo" y dificultad) con filtro combinable | ⭐⭐⭐⭐ | ⭐⭐ | 1 semana |
| NF7 | Búsqueda server-side con relevancia (hoy es 100% client-side sobre lo ya cargado) | ⭐⭐⭐ | ⭐⭐⭐ | 1-2 semanas |
| NF8 | Checklist de curso ("qué necesitas saber antes de empezar") | ⭐⭐ | ⭐ | 3-5 días |
| NF9 | Resumen/sumario descargable al terminar un curso | ⭐⭐ | ⭐⭐ | 1 semana |
| NF10 | Recursos descargables adjuntos a lecciones (PDF, código fuente, cheatsheets) | ⭐⭐⭐ | ⭐⭐ | 1 semana |

### 9.2 Personalización y seguimiento individual

| ID | Funcionalidad | Impacto | Complejidad | Tiempo |
|---|---|---|---|---|
| NF11 | Favoritos/wishlist de cursos (no existe `CourseFavorite`, solo hay favoritos para el marketplace del juego) | ⭐⭐⭐ | ⭐⭐ | 3-5 días |
| NF12 | Notas personales del estudiante por lección | ⭐⭐⭐ | ⭐⭐⭐ | 1-2 semanas |
| NF13 | Marcadores/bookmarks dentro de una lección larga | ⭐⭐ | ⭐⭐ | 1 semana |
| NF14 | Historial de actividad de aprendizaje navegable por el propio usuario (ya existe `Activity` en BD; falta UI) | ⭐⭐⭐ | ⭐⭐ | 1 semana |
| NF15 | Recordatorios/notificaciones de racha en riesgo ("tu racha se rompe en 3 horas") | ⭐⭐⭐⭐ | ⭐⭐⭐ | 1-2 semanas (usa infraestructura de `Notification` ya existente) |
| NF16 | Calendario de estudio / metas semanales configurables por el usuario | ⭐⭐⭐ | ⭐⭐⭐ | 2 semanas |
| NF17 | Metas personales (ej. "completar 3 cursos este mes") con seguimiento visual | ⭐⭐⭐ | ⭐⭐⭐ | 1-2 semanas |
| NF18 | Resumen semanal/mensual por email (aprovechando `EmailTemplate`/`EmailCampaign` ya modelados) | ⭐⭐⭐ | ⭐⭐⭐ | 2 semanas |

### 9.3 Gamificación (mucho ya modelado en BD — falta activarlo/conectarlo)

| ID | Funcionalidad | Impacto | Complejidad | Tiempo | Nota |
|---|---|---|---|---|---|
| NF19 | Activar y exponer el sistema de Misiones (`Mission`/`UserMissionProgress`) en la UI de aprendizaje, no solo en el módulo social | ⭐⭐⭐⭐ | ⭐⭐⭐ | 1-2 semanas | El modelo ya existe |
| NF20 | Catálogo visible de Insignias (`GamificationBadge`)/Badges con criterios claros de obtención | ⭐⭐⭐ | ⭐⭐ | 1 semana | El modelo ya existe (`BadgesModule` ya está montado en `app.module.ts`) |
| NF21 | Retos entre amigos ligados a cursos (`FriendChallenge` ya tiene `courseId` opcional en el schema, sin usar aparentemente en el flujo de cursos) | ⭐⭐⭐ | ⭐⭐⭐ | 1-2 semanas |
| NF22 | Rachas por curso, no solo racha global de usuario | ⭐⭐⭐ | ⭐⭐⭐ | 1-2 semanas |
| NF23 | Temporadas de ranking (leaderboards que resetean periódicamente, con historial de temporadas pasadas) | ⭐⭐⭐ | ⭐⭐⭐ | 2 semanas |
| NF24 | Recompensas por bundle al completar hitos (`RewardBundle` ya existe en BD) conectadas a completar un curso/path completo | ⭐⭐⭐ | ⭐⭐ | 1 semana |
| NF25 | Título/rango cosmético desbloqueable (`GamificationTitle` ya existe) mostrado junto al nombre en el perfil/ranking | ⭐⭐ | ⭐⭐ | 1 semana |

### 9.4 Ejercicios y evaluación

| ID | Funcionalidad | Impacto | Complejidad | Tiempo |
|---|---|---|---|---|
| NF26 | Tests automáticos reales para ejercicios de código (hoy el editor solo previsualiza en iframe, sin verificación programática de la solución) | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 3-4 semanas |
| NF27 | Sandbox aislado del lado servidor para ejecutar/validar código (más allá del iframe sandboxed client-side actual) | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 4+ semanas |
| NF28 | Proyectos finales de curso (entregable evaluado, no solo lecciones sueltas) | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 3-4 semanas |
| NF29 | Retroalimentación explicada tras responder mal un quiz (hoy solo se sabe si acertó o no) | ⭐⭐⭐ | ⭐⭐ | 1 semana |
| NF30 | Reintentos limitados/ilimitados configurables por ejercicio, con registro de intentos (`Completion` no tiene campo `attempts` hoy) | ⭐⭐⭐ | ⭐⭐ | 1 semana |
| NF31 | Implementar de verdad el tipo de ejercicio `LIVE` (hoy es una página placeholder) | ⭐⭐ | ⭐⭐⭐⭐ | según alcance |
| NF32 | Página de resultado real tras un ejercicio (`/learn/exercise/result` hoy es placeholder) con desglose de XP/monedas/aciertos | ⭐⭐⭐ | ⭐⭐ | 1 semana |

### 9.5 Certificados

| ID | Funcionalidad | Impacto | Complejidad | Tiempo |
|---|---|---|---|---|
| NF33 | Generación real de PDF descargable (hoy es "imprimir la página con CSS de impresión", no un archivo PDF real) | ⭐⭐⭐⭐ | ⭐⭐⭐ | 1-2 semanas |
| NF34 | Código QR en el certificado enlazando a la verificación pública | ⭐⭐⭐⭐ | ⭐⭐ | 3-5 días |
| NF35 | Botón "Compartir en LinkedIn" (LinkedIn tiene un formato de URL estándar para "Add to Profile" de certificaciones) | ⭐⭐⭐⭐ | ⭐⭐ | 3-5 días |
| NF36 | Marcado con datos estructurados (`JSON-LD`, `EducationalOccupationalCredential`) en la página pública de verificación, para SEO/rich results | ⭐⭐⭐ | ⭐⭐ | 3-5 días |
| NF37 | Estado de revocación de certificado (`revoked`/`revokedReason`) — hoy el modelo no contempla invalidar un certificado ya emitido | ⭐⭐⭐ | ⭐⭐ | 1 semana |
| NF38 | Historial/versión del certificado si el curso cambia de contenido tras la emisión | ⭐⭐ | ⭐⭐⭐ | 1-2 semanas |
| NF39 | Completar el flujo de compra de certificado individual (`/certificates/buy/[courseId]`, hoy placeholder) — depende de HI1 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | incluido en HI1 |

### 9.6 Comunidad y soporte al aprendizaje

| ID | Funcionalidad | Impacto | Complejidad | Tiempo |
|---|---|---|---|---|
| NF40 | Preguntas y respuestas por lección (Q&A tipo Udemy) | ⭐⭐⭐ | ⭐⭐⭐⭐ | 2-3 semanas |
| NF41 | Comentarios/discusión por ejercicio | ⭐⭐ | ⭐⭐⭐ | 1-2 semanas |
| NF42 | Reportar contenido/lección con error tipográfico o de código | ⭐⭐⭐ | ⭐⭐ | 1 semana |
| NF43 | Programa de referidos aplicado a cursos (`ReferralProfile`/`ReferralProgramConfig` ya existen en BD, `Course.referralProgramConfigs` ya está relacionado) — falta exponerlo en la UI de cursos | ⭐⭐⭐ | ⭐⭐⭐ | 1-2 semanas |

---

## 10. Mejoras de UX

| ID | Mejora | Impacto | Complejidad | Tiempo |
|---|---|---|---|---|
| UX1 | Sidebar/tabla de contenidos persistente dentro del ejercicio (hoy la estructura del curso desaparece al entrar a un ejercicio; solo hay "volver") | ⭐⭐⭐⭐ | ⭐⭐⭐ | 1-2 semanas |
| UX2 | CTA "siguiente lección incompleta" claro y consistente en todos los tipos de ejercicio (hoy solo el quiz nuevo tiene navegación prev/next) | ⭐⭐⭐⭐ | ⭐⭐ | 1 semana |
| UX3 | Barra de progreso visible dentro de la lección/ejercicio, no solo en el acordeón del curso | ⭐⭐⭐ | ⭐⭐ | 3-5 días |
| UX4 | Unificar el patrón de verificación de sesión (`useAuth()`) en todas las pantallas, eliminando lecturas directas de `localStorage` | ⭐⭐⭐ | ⭐⭐ | 1 semana |
| UX5 | Feedback de recompensa (XP/monedas) consistente en todos los tipos de ejercicio, no solo en un flujo de quiz | ⭐⭐⭐ | ⭐⭐ | 3-5 días |
| UX6 | Distinguir visualmente contenido bloqueado por login vs. bloqueado por premium (hoy ambos casos usan el mismo candado, y de hecho premium ni siquiera bloquea nada realmente) | ⭐⭐⭐⭐ | ⭐⭐ | 1 semana |
| UX7 | Onboarding inicial para usuarios nuevos (elegir intereses/nivel para alimentar recomendaciones) | ⭐⭐⭐⭐ | ⭐⭐⭐ | 1-2 semanas |
| UX8 | Vista de "mis cursos en progreso" separada de "catálogo completo" | ⭐⭐⭐⭐ | ⭐⭐ | 1 semana |
| UX9 | Confirmaciones destructivas consistentes (dialogs estilizados en todo el admin, no `window.confirm()` en algunas secciones) | ⭐⭐ | ⭐⭐ | 3-5 días |
| UX10 | Vista previa de cómo se ve una lección/ejercicio antes de publicar (depende de HI4) | ⭐⭐⭐⭐ | ⭐⭐⭐ | incluido en HI4 |
| UX11 | Estado vacío diseñado quando un usuario no tiene certificados/cursos en progreso todavía, con CTA claro | ⭐⭐ | ⭐ | 3-5 días |
| UX12 | Breadcrumbs consistentes (Módulo > Curso > Lección > Ejercicio) en toda la experiencia de aprendizaje | ⭐⭐⭐ | ⭐⭐ | 1 semana |
| UX13 | Micro-confirmación visual/sonora opcional al completar un ejercicio (más allá del toast de XP) | ⭐ | ⭐⭐ | 3-5 días |
| UX14 | Modo "repasar" un curso ya completado sin re-otorgar XP/certificado duplicado | ⭐⭐ | ⭐⭐ | 1 semana |
| UX15 | Mensajes de error específicos por tipo de fallo (red, validación, permisos) en vez de genéricos en formularios de auth/checkout | ⭐⭐ | ⭐⭐ | 3-5 días |

---

## 11. Mejoras de UI

| ID | Mejora | Impacto | Complejidad | Tiempo |
|---|---|---|---|---|
| UI1 | Reemplazar el `<textarea>` de contenido de lección por un editor MDX/rich-text con vista previa (duplica HI9, listado aquí por completitud de sección) | ⭐⭐⭐⭐ | ⭐⭐⭐ | incluido en HI9 |
| UI2 | Skeletons consistentes en todo el funnel principal (cursos → curso → certificado), reemplazando texto plano "Cargando…" | ⭐⭐⭐ | ⭐⭐ | 1 semana |
| UI3 | Migrar el panel admin de acciones rápidas (otorgar XP/premium/rol) del `<select>` nativo a los componentes de `src/shared/ui` | ⭐⭐ | ⭐⭐ | 3-5 días |
| UI4 | Añadir gráficos con librería real (hoy el `Chart` del admin es custom, sin tooltips/leyenda interactiva) | ⭐⭐ | ⭐⭐ | 1 semana |
| UI5 | Diseño responsive para el workspace de ejercicios de código (hoy 0 breakpoints — al menos un modo de solo lectura en móvil) | ⭐⭐⭐ | ⭐⭐⭐⭐ | incluido en I29 |
| UI6 | Diseño responsive para el panel admin de cursos/módulos/lecciones (hoy prácticamente sin breakpoints) | ⭐⭐ | ⭐⭐⭐ | 1-2 semanas |
| UI7 | Badges dinámicas reales (`Nuevo`/`Popular`) calculadas por fecha/métricas en vez de flags estáticos | ⭐⭐ | ⭐⭐ | 3-5 días |
| UI8 | Sistema de diseño documentado (tokens de color, tipografía, espaciado) más allá de comentarios sueltos en `globals.css` | ⭐⭐ | ⭐⭐⭐ | 1-2 semanas |
| UI9 | Modo oscuro/claro consistente en todas las páginas de aprendizaje (verificar cobertura completa, no solo el simulador que menciona el schema) | ⭐⭐ | ⭐⭐ | 1 semana |
| UI10 | Miniaturas/ilustraciones de curso reales en vez de fallback genérico de stock cuando falta `imageUrl` | ⭐⭐ | ⭐⭐ | depende de proceso de contenido |

---

## 12. Mejoras técnicas

| ID | Mejora | Impacto | Complejidad | Tiempo |
|---|---|---|---|---|
| TEC1 | Introducir un hook/capa de fetching compartida (React Query/SWR) — ver HI5 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | incluido en HI5 |
| TEC2 | Extraer helper `resolveTranslation<T>(translations, lang)` único, eliminando las 18 copias detectadas | ⭐⭐⭐ | ⭐⭐ | 2-3 días |
| TEC3 | Extraer un `TranslationsUpsertService` genérico usado por course/module/lesson/exercise, eliminando el patrón N+1 duplicado | ⭐⭐⭐⭐ | ⭐⭐⭐ | 1 semana |
| TEC4 | Unificar la validación de racha (streak) en un único servicio de dominio, usado tanto por login como por completar ejercicios, con una sola definición de "día" (UTC recomendado) | ⭐⭐⭐⭐ | ⭐⭐ | 3-5 días |
| TEC5 | Dividir `exercise.service.ts` (400 líneas) en servicios más pequeños por responsabilidad (CRUD, proyección admin, transformación por tipo) | ⭐⭐⭐ | ⭐⭐⭐ | 1 semana |
| TEC6 | Dividir `identity.service.ts` (351 líneas) separando auth de perfil/streak | ⭐⭐⭐ | ⭐⭐⭐ | 1 semana |
| TEC7 | Dividir `course.service.ts` (338 líneas), unificando `getAllCourses`/`getCourseById` (90% código idéntico hoy) | ⭐⭐⭐ | ⭐⭐ | 3-5 días |
| TEC8 | Introducir DTOs con `class-validator` reales en course/module/lesson/exercise, eliminando `@Body() body: any` | ⭐⭐⭐⭐⭐ | ⭐⭐ | 1 semana |
| TEC9 | Añadir `class-validator` a `CreateProgressDto` con `@IsUUID()` en los ids, y derivar `userId` del JWT en vez de aceptarlo del body | ⭐⭐⭐⭐ | ⭐ | incluido en QW1 |
| TEC10 | Eliminar DTOs/entidades muertas (`progress.entity.ts`, DTOs de certificados no usados) | ⭐ | ⭐ | 1 día |
| TEC11 | Formatear con Prettier los archivos "una sola línea" en `src/features/admin` para hacerlos revisables | ⭐⭐ | ⭐ | 1 día |
| TEC12 | Consolidar `components/admin/DataTable`/`TranslationsForm` legados con sus equivalentes en `src/shared/ui`, terminando la migración de arquitectura de admin | ⭐⭐⭐ | ⭐⭐⭐⭐ | 2-3 semanas |
| TEC13 | Introducir un paquete `packages/shared` real con tipos/DTOs de dominio de cursos compartidos entre API y web (o generarlos desde OpenAPI, ver HI15) | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | incluido en HI15 |
| TEC14 | Elevar cobertura de tests: unitarios para servicios críticos (progress, certificates, payments) y al menos un e2e del funnel curso→lección→certificado | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 3-4 semanas (continuo) |
| TEC15 | Configurar CI (lint + typecheck + test + build) — ver HI14 | ⭐⭐⭐⭐⭐ | ⭐⭐ | incluido en HI14 |
| TEC16 | Añadir Dockerfiles de producción para `apps/api` y `apps/web` (hoy solo hay `docker-compose` de la base de datos de desarrollo) | ⭐⭐⭐ | ⭐⭐ | 3-5 días |
| TEC17 | Versionado de API (`/v1`) antes de que existan clientes externos que dependan de la forma actual | ⭐⭐⭐ | ⭐⭐ | 3-5 días |
| TEC18 | Documentar el árbol de decisión "qué modelo de premium usar" (`Subscription` vs `PremiumSubscription`) mientras se resuelve HI6, para que nadie construya sobre el modelo equivocado mientras tanto | ⭐⭐ | ⭐ | 1 día |
| TEC19 | Migrar loggeo ad hoc (`console.error`) a `Logger` de Nest de forma consistente en todos los servicios | ⭐ | ⭐ | 1-2 días |
| TEC20 | Revisar y estandarizar el guard de rutas admin: aplicar `@UseGuards`+`@Roles` a nivel de controlador en vez de por ruta donde sea posible | ⭐⭐ | ⭐⭐ | 3-5 días |

---

## 13. Mejoras de rendimiento

| ID | Mejora | Impacto | Complejidad | Tiempo |
|---|---|---|---|---|
| PERF1 | Paginación real en todos los listados de contenido (duplica HI2) | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | incluido en HI2 |
| PERF2 | Evitar hidratar el árbol completo curso→lecciones→ejercicios→traducciones en `GET /courses`; usar proyecciones distintas para listado vs. detalle | ⭐⭐⭐⭐ | ⭐⭐ | 1 semana |
| PERF3 | Batch de resolución de idiomas en las actualizaciones de traducción (un `findMany` en vez de N `findUnique`) | ⭐⭐⭐ | ⭐⭐ | incluido en TEC3 |
| PERF4 | Caché de Redis para catálogo de cursos y rankings, con invalidación al escribir | ⭐⭐⭐⭐ | ⭐⭐⭐ | incluido en HI12 |
| PERF5 | Índices adicionales: `Ranking(type, period, score)`, revisar `Activity(userId, createdAt)` compuesto (hoy solo indexado por `createdAt`) | ⭐⭐⭐⭐ | ⭐ | 1-2 días + migración |
| PERF6 | Paralelizar las 3-4 consultas secuenciales de `certificate-eligibility.service.ts` con `Promise.all` | ⭐⭐ | ⭐ | 1 día |
| PERF7 | CDN/cache-control agresivo para assets de curso (imágenes, adjuntos) — ya existe una base con `uploads` cacheado a 1 año, extenderlo a contenido de cursos | ⭐⭐⭐ | ⭐⭐ | 3-5 días |
| PERF8 | Lazy-loading de imágenes de cards de curso fuera del viewport | ⭐⭐ | ⭐ | 1-2 días |
| PERF9 | Code-splitting del editor Monaco (pesado) para que no bloquee el bundle inicial de páginas no relacionadas con ejercicios de código | ⭐⭐⭐ | ⭐⭐ | 3-5 días |
| PERF10 | Revisar tamaño de bundle general del frontend (sin librería de fetching compartida, es previsible duplicación de lógica en el bundle) | ⭐⭐ | ⭐⭐ | 1 semana (auditoría + fixes) |
| PERF11 | Monitoreo de queries lentas en Postgres (`pg_stat_statements` o equivalente) antes de optimizar a ciegas | ⭐⭐⭐ | ⭐⭐ | 3-5 días |
| PERF12 | Connection pooling explícito (PgBouncer o el pooler de Prisma) de cara a escenarios de más de 1 instancia de API | ⭐⭐⭐ | ⭐⭐ | 3-5 días |

---

## 14. Mejoras de seguridad

| ID | Mejora | Impacto | Complejidad | Tiempo |
|---|---|---|---|---|
| SEC1 | Guard de autenticación en `progress` (duplica C1/QW1) | ⭐⭐⭐⭐⭐ | ⭐⭐ | incluido en QW1 |
| SEC2 | Eliminar filtración de `email` en rankings públicos (duplica C2/QW2) | ⭐⭐⭐⭐⭐ | ⭐ | incluido en QW2 |
| SEC3 | Ocultar respuestas correctas de quiz hasta completar (duplica C3/QW3) | ⭐⭐⭐⭐⭐ | ⭐⭐ | incluido en QW3 |
| SEC4 | Tabla de auditoría de acciones administrativas (duplica C6/HI11) | ⭐⭐⭐⭐ | ⭐⭐⭐ | incluido en HI11 |
| SEC5 | Validación real de todos los DTOs de contenido (course/module/lesson/exercise) — hoy sin `class-validator` | ⭐⭐⭐⭐⭐ | ⭐⭐ | incluido en TEC8 |
| SEC6 | Rate limiting diferenciado por endpoint sensible (login/registro ya lo tienen; falta en `translate`, `progress`, `uploads`) | ⭐⭐⭐ | ⭐⭐ | 3-5 días |
| SEC7 | Sanitización/validación de forma para campos `Json` de contenido antes de persistir (`content`, `codes`) | ⭐⭐⭐⭐ | ⭐⭐⭐ | incluido en C9 |
| SEC8 | Revisar la doble emisión del JWT (cookie httpOnly + cuerpo de respuesta) y evaluar si el uso en `apps/game`/localStorage puede migrarse a un esquema más seguro (ej. token de corta duración + refresh) | ⭐⭐⭐ | ⭐⭐⭐ | 1-2 semanas (evaluación + migración) |
| SEC9 | Verificar ownership consistente en `exercise`/`rankings` (hoy confían en `userId` de query string) | ⭐⭐⭐⭐ | ⭐⭐ | incluido en I22 |
| SEC10 | Escaneo de dependencias (`npm audit`/Dependabot/Snyk) integrado al futuro CI | ⭐⭐⭐ | ⭐ | 1 día (configuración) |
| SEC11 | Definir y documentar una política de expiración/rotación de `JWT_SECRET` y de las claves de Spaces/DeepL/Resend | ⭐⭐⭐ | ⭐⭐ | 3-5 días |
| SEC12 | Añadir cabecera/verificación CSRF explícita para las rutas que mutan estado vía cookie de sesión (hoy se depende solo de CORS + `SameSite` implícito) | ⭐⭐⭐ | ⭐⭐ | 3-5 días |
| SEC13 | Límite de tamaño de payload global explícito en Nest (más allá del límite de archivos ya presente en `uploads`) | ⭐⭐ | ⭐ | 1 día |
| SEC14 | Revisar `verifyPublicCertificate` para que solo acepte `verificationCode`, no el `id` interno como alias (duplica M5) | ⭐⭐ | ⭐ | incluido en M5 |
| SEC15 | Pentest/revisión de seguridad dedicada antes de cualquier campaña de adquisición pagada, una vez cerrados C1-C9 | ⭐⭐⭐⭐ | ⭐⭐⭐ | 1-2 semanas (externa) |

---

## 15. Mejoras para la base de datos

| ID | Mejora | Impacto | Complejidad | Tiempo |
|---|---|---|---|---|
| DB1 | Añadir `status` (`DRAFT`/`PUBLISHED`/`ARCHIVED`) a `Course`, `Module`, `Lesson`, `Exercise` | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | incluido en HI4 |
| DB2 | Añadir `deletedAt` (soft delete) a los mismos modelos de contenido | ⭐⭐⭐⭐ | ⭐⭐ | 3-5 días + migración |
| DB3 | Índices faltantes: `Ranking`, revisar `Activity`, `FriendChallenge.courseId` | ⭐⭐⭐⭐ | ⭐ | incluido en PERF5 |
| DB4 | Constraint `@@unique` en `Lesson(courseId, order)` y `Exercise(lessonId, order)` para impedir duplicados de orden | ⭐⭐⭐ | ⭐⭐ | 3-5 días (requiere limpiar datos existentes primero) |
| DB5 | Añadir `progressPercent`/`lastAccessedAt`/`completedAt` a `Enrollment` para no tener que recalcular "dónde quedó" desde `Completion` en cada request | ⭐⭐⭐⭐ | ⭐⭐⭐ | 1 semana |
| DB6 | Añadir `durationMinutes` estimado a `Lesson`/`Exercise` | ⭐⭐⭐ | ⭐ | 1-2 días |
| DB7 | Añadir `score`/`attempts`/`timeSpentSeconds` a `Completion` para analítica de ejercicios | ⭐⭐⭐ | ⭐⭐ | 3-5 días |
| DB8 | Modelo `CourseReview`/`CourseRating` (userId, courseId, rating, comment) | ⭐⭐⭐⭐ | ⭐⭐ | incluido en HI13 |
| DB9 | Modelo `CourseCategory`/`Topic` con relación muchos-a-muchos a `Course` | ⭐⭐⭐⭐ | ⭐⭐ | incluido en NF6 |
| DB10 | Modelo `CourseFavorite`/`Wishlist` | ⭐⭐⭐ | ⭐ | incluido en NF11 |
| DB11 | Modelo `LessonNote` (nota personal por usuario+lección) | ⭐⭐⭐ | ⭐⭐ | incluido en NF12 |
| DB12 | Modelo `LearningPath` + `LearningPathCourse` (curso, orden, path) | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | incluido en HI8/NF1 |
| DB13 | Modelo `CoursePrerequisite` (self-relation en `Course`) | ⭐⭐⭐ | ⭐⭐ | incluido en NF2 |
| DB14 | Añadir `criteriaType`/`criteriaValue`/`icon` a `Achievement` para que sea data-driven en vez de hardcodeado | ⭐⭐⭐ | ⭐⭐⭐ | incluido en M22 |
| DB15 | Consolidar `Subscription`/`PremiumSubscription` en un único modelo (duplica HI6) | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | incluido en HI6 |
| DB16 | Consolidar `Achievement`/`UserAchievement` con `GamificationAchievement`/`UserGamificationAchievement` (duplica HI7) | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | incluido en HI7 |
| DB17 | Añadir `revoked`/`revokedAt`/`revokedReason` a `Certificate` | ⭐⭐⭐ | ⭐⭐ | incluido en NF37 |
| DB18 | Añadir `qrCodeUrl`/`pdfUrl` a `Certificate` una vez exista generación real de PDF/QR | ⭐⭐⭐ | ⭐⭐ | incluido en NF33/NF34 |
| DB19 | Evaluar particionamiento o archivado de `Activity`/`XPTransaction`/`CoinTransaction` a partir de cierto volumen (append-only, crecimiento indefinido) | ⭐⭐⭐ | ⭐⭐⭐⭐ | Fase 4 (escalado) |
| DB20 | Evaluar separar el schema del dominio de cursos del schema del mundo virtual/juego en bases de datos (o al menos schemas de Postgres) distintos a medio-largo plazo | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Fase 4 (escalado), decisión arquitectónica mayor |

---

## 16. Mejoras del backend

(Complementa lo ya cubierto en Técnicas/Seguridad/Rendimiento — aquí lo específico de organización de módulos NestJS.)

| ID | Mejora | Impacto | Complejidad | Tiempo |
|---|---|---|---|---|
| BE1 | Repositorio dedicado para course/module/lesson/exercise (hoy el patrón repository solo se usa en algunos módulos como certificates/academies/payments; course/module/lesson/exercise acceden a Prisma directo desde el servicio) | ⭐⭐⭐ | ⭐⭐⭐ | 1-2 semanas |
| BE2 | `PaginationDto`/`PaginatedResponse<T>` compartido y reutilizado en todos los módulos con listados | ⭐⭐⭐⭐ | ⭐⭐ | incluido en HI2 |
| BE3 | Servicio de dominio único para "elegibilidad y progreso de curso", consumido tanto por `progress` como por `certificates` (hoy `certificate-eligibility.service.ts` reimplementa parte del cálculo de completitud) | ⭐⭐⭐ | ⭐⭐⭐ | 1-2 semanas |
| BE4 | Exponer administración de contenido (course/module/lesson/exercise) bajo un namespace `/admin/*` consistente, en vez de mezclarlo con las rutas públicas diferenciadas solo por guard | ⭐⭐⭐ | ⭐⭐⭐ | 1-2 semanas |
| BE5 | Health check endpoint (`/health`) para orquestación/monitoreo (no se encontró ninguno en el código auditado) | ⭐⭐⭐ | ⭐ | 1 día |
| BE6 | Métricas de aplicación (Prometheus/OpenTelemetry) al menos en los endpoints del funnel de aprendizaje | ⭐⭐⭐ | ⭐⭐⭐ | 1-2 semanas |
| BE7 | Manejo explícito de timeouts/circuit breaker hacia servicios externos (DeepL, Resend, Spaces) | ⭐⭐ | ⭐⭐⭐ | 1 semana |
| BE8 | Feature flags para activar gradualmente funcionalidades nuevas (gamificación, learning paths) sin desplegar directo a 100% de usuarios | ⭐⭐⭐ | ⭐⭐⭐ | 1-2 semanas |

---

## 17. Mejoras del frontend

| ID | Mejora | Impacto | Complejidad | Tiempo |
|---|---|---|---|---|
| FE1 | Terminar la migración de `app/admin/exercises` al patrón `src/features/admin/*` | ⭐⭐⭐ | ⭐⭐⭐⭐ | incluido en I11/TEC12 |
| FE2 | Adoptar Server Components/data fetching en servidor para páginas públicas de solo lectura (catálogo de cursos, verificación de certificado) — hoy todo es `"use client"` | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 2-3 semanas |
| FE3 | Context de autenticación centralizado (hoy no existe; el estado se re-deriva por componente vía `useAuth()` o `localStorage` directo) | ⭐⭐⭐⭐ | ⭐⭐ | 1 semana |
| FE4 | Tipar las respuestas de API en el frontend a partir de un contrato compartido (duplica TEC13) | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | incluido en TEC13 |
| FE5 | Tests de componente/integración para el funnel de aprendizaje (hoy no se detectó testing de frontend en el alcance auditado) | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | continuo |
| FE6 | Error boundaries de Next.js (`error.tsx`) por segmento de ruta, no solo manejo de error local por componente | ⭐⭐⭐ | ⭐⭐ | 3-5 días |
| FE7 | Unificar el diseño de estados vacíos/errores/carga en un solo set de componentes usados en el 100% de las páginas (hoy conviven dos generaciones) | ⭐⭐⭐ | ⭐⭐⭐ | incluido en UI2 |
| FE8 | Internacionalización real del contenido de UI (hoy hay `LanguageContext`, verificar cobertura completa de textos, no solo de contenido de curso) | ⭐⭐ | ⭐⭐⭐ | 1-2 semanas |

---

## 18. Mejoras del sistema de cursos

(Síntesis específica de curso/módulo/lección/ejercicio/progreso/orden/requisitos/experiencia del estudiante — trazabilidad de lo ya detallado.)

| ID | Mejora | Impacto | Complejidad | Tiempo |
|---|---|---|---|---|
| CUR1 | Repensar la jerarquía de dominio: evaluar renombrar/reestructurar para que `Module` represente agrupación *dentro* de un curso (o renombrar el actual `Module` a `Track`/`Category` para no chocar con la expectativa estándar de la industria) | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Decisión de Fase 2, ejecución en Fase 3 (alto riesgo de romper todo lo existente) |
| CUR2 | Modelo explícito de "Capítulo"/sección dentro de una lección larga, en vez de contenido no estructurado en un solo `Json` | ⭐⭐⭐ | ⭐⭐⭐ | 1-2 semanas |
| CUR3 | Estado draft/publicado (duplica DB1/HI4) | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | incluido en HI4 |
| CUR4 | Progreso resumible real (duplica HI3) | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | incluido en HI3 |
| CUR5 | Prerrequisitos entre cursos (duplica NF2/DB13) | ⭐⭐⭐⭐ | ⭐⭐ | incluido en NF2 |
| CUR6 | Bloqueo de contenido diferenciado por motivo real (login vs. premium vs. prerrequisito no cumplido), con mensaje explicativo distinto en cada caso | ⭐⭐⭐⭐ | ⭐⭐ | incluido en UX6 |
| CUR7 | Orden de lecciones/ejercicios garantizado sin colisiones (constraint de BD, duplica DB4) más UI de reordenamiento (duplica HI10) | ⭐⭐⭐ | ⭐⭐ | incluido en DB4/HI10 |
| CUR8 | Panel de "experiencia del estudiante" en analítica admin: dónde abandonan los estudiantes un curso, qué ejercicio tiene más reintentos/fallos | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 2-3 semanas (requiere DB7 primero) |
| CUR9 | Vista de instructor/creador de contenido con permisos intermedios entre `STUDENT` y `ADMIN` (hoy solo existen esos dos roles efectivos para contenido) | ⭐⭐⭐ | ⭐⭐⭐ | 1-2 semanas |
| CUR10 | Clonado/duplicado de curso como plantilla para acelerar creación de contenido similar | ⭐⭐ | ⭐⭐ | 1 semana |
| CUR11 | Importación masiva de contenido (CSV/JSON) para lecciones/ejercicios, en vez de crear uno por uno en el admin | ⭐⭐ | ⭐⭐⭐ | 1-2 semanas |

---

## 19. Mejoras del sistema de certificados

(Trazabilidad de la sección 9.5, agrupada aquí como se pidió explícitamente.)

| ID | Mejora | Impacto | Complejidad | Tiempo |
|---|---|---|---|---|
| CERT1 | PDF real descargable (duplica NF33) | ⭐⭐⭐⭐ | ⭐⭐⭐ | incluido en NF33 |
| CERT2 | Código QR (duplica NF34) | ⭐⭐⭐⭐ | ⭐⭐ | incluido en NF34 |
| CERT3 | Compartir en LinkedIn (duplica NF35) | ⭐⭐⭐⭐ | ⭐⭐ | incluido en NF35 |
| CERT4 | JSON-LD para SEO/rich results (duplica NF36) | ⭐⭐⭐ | ⭐⭐ | incluido en NF36 |
| CERT5 | Revocación (duplica NF37/DB17) | ⭐⭐⭐ | ⭐⭐ | incluido en NF37 |
| CERT6 | Versionado ante cambio de contenido del curso (duplica NF38) | ⭐⭐ | ⭐⭐⭐ | incluido en NF38 |
| CERT7 | Flujo de compra funcional (duplica C4/HI1) | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | incluido en HI1 |
| CERT8 | Página "mis certificados" con filtro/búsqueda propia una vez el volumen crezca (hoy sin paginación, aceptable a corto plazo) | ⭐⭐ | ⭐⭐ | Fase 2/3 |
| CERT9 | Plantillas visuales de certificado por academia (`Academy` ya soporta metadata; falta usarla para personalizar el diseño del diploma por academia) | ⭐⭐⭐ | ⭐⭐⭐ | 1-2 semanas |
| CERT10 | Verificación por lote/API para terceros (ej. un empleador que quiere validar varios certificados a la vez) | ⭐⭐ | ⭐⭐⭐ | 1-2 semanas |

---

## 20. Mejoras del sistema premium

| ID | Mejora | Impacto | Complejidad | Tiempo |
|---|---|---|---|---|
| PREM1 | Página `/premium` funcional con comparación de planes y checkout real (duplica C4) | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | incluido en HI1 |
| PREM2 | Unificar `Subscription`/`PremiumSubscription` (duplica HI6) | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | incluido en HI6 |
| PREM3 | Gating real de contenido premium (hoy solo existe login-wall por `freeLimit`, no hay ninguna verificación de suscripción activa bloqueando lecciones/cursos específicos) | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 1-2 semanas |
| PREM4 | Planes configurables desde BD/admin en vez de hardcodeados en el frontend (`/pricing` hoy es 100% estático) | ⭐⭐⭐⭐ | ⭐⭐⭐ | 1-2 semanas |
| PREM5 | Periodo de prueba gratuito (trial) configurable | ⭐⭐⭐ | ⭐⭐ | 1 semana |
| PREM6 | Gestión de cancelación/downgrade self-service (hoy solo un admin puede revocar premium manualmente) | ⭐⭐⭐⭐ | ⭐⭐⭐ | incluido en HI1 |
| PREM7 | Facturas/recibos descargables para el usuario premium | ⭐⭐ | ⭐⭐ | 1 semana |
| PREM8 | Comparación de features realmente diferenciada en la tabla de precios (duplica M15) | ⭐⭐⭐ | ⭐ | incluido en QW18 |
| PREM9 | Beneficios premium exclusivos más allá de certificados (ej. cursos exclusivos, soporte prioritario, insignias) para justificar el precio | ⭐⭐⭐ | ⭐⭐⭐ | Fase 3 |

---

## 21. Mejoras del panel de administración

| ID | Mejora | Impacto | Complejidad | Tiempo |
|---|---|---|---|---|
| ADM1 | Namespace `/admin/*` unificado para contenido de cursos (duplica BE4) | ⭐⭐⭐ | ⭐⭐⭐ | incluido en BE4 |
| ADM2 | Auditoría de acciones administrativas (duplica C6/HI11) | ⭐⭐⭐⭐ | ⭐⭐⭐ | incluido en HI11 |
| ADM3 | Paginación real en listados de usuarios/accesos de certificado (duplica I15) | ⭐⭐⭐⭐ | ⭐⭐ | incluido en HI2 |
| ADM4 | Editor de contenido enriquecido (duplica HI9) | ⭐⭐⭐⭐ | ⭐⭐⭐ | incluido en HI9 |
| ADM5 | Drag-and-drop de orden (duplica HI10) | ⭐⭐⭐ | ⭐⭐⭐ | incluido en HI10 |
| ADM6 | Vista previa antes de publicar (duplica HI4) | ⭐⭐⭐⭐ | ⭐⭐⭐ | incluido en HI4 |
| ADM7 | Roles intermedios (instructor/editor de contenido) además de STUDENT/ADMIN (duplica CUR9) | ⭐⭐⭐ | ⭐⭐⭐ | incluido en CUR9 |
| ADM8 | Panel de analítica de aprendizaje (abandono, ejercicios más fallidos) (duplica CUR8) | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | incluido en CUR8 |
| ADM9 | Búsqueda y filtros avanzados en listados admin (por estado, dificultad, fecha de creación, academia) | ⭐⭐⭐ | ⭐⭐ | 1 semana |
| ADM10 | Acciones en lote (bulk actions): publicar/despublicar/borrar varios elementos a la vez | ⭐⭐ | ⭐⭐ | 1 semana |
| ADM11 | Exportación de datos (usuarios, certificados emitidos, progreso) a CSV para reporting | ⭐⭐⭐ | ⭐⭐ | 3-5 días |
| ADM12 | Consistencia visual total: terminar de migrar `admin/exercises` y las acciones rápidas del dashboard admin al mismo sistema de diseño que courses/modules/lessons | ⭐⭐⭐ | ⭐⭐⭐ | incluido en TEC12 |

---

## 22. Mejoras para SEO

| ID | Mejora | Impacto | Complejidad | Tiempo |
|---|---|---|---|---|
| SEO1 | `generateMetadata` por página en todo el árbol real de rutas (duplica QW11) | ⭐⭐⭐⭐ | ⭐⭐ | incluido en QW11 |
| SEO2 | Open Graph (título, descripción, imagen) por curso y por certificado público | ⭐⭐⭐⭐ | ⭐⭐ | 1 semana |
| SEO3 | JSON-LD `Course` en páginas de curso, `EducationalOccupationalCredential`/`Person` en verificación de certificado (duplica NF36) | ⭐⭐⭐ | ⭐⭐ | incluido en NF36 |
| SEO4 | `sitemap.xml` dinámico generado desde el catálogo real de cursos (más allá del estático inicial de QW19) | ⭐⭐⭐⭐ | ⭐⭐ | 1 semana |
| SEO5 | `robots.txt` correcto, evitando indexar rutas de admin/API | ⭐⭐⭐ | ⭐ | incluido en QW19 |
| SEO6 | URLs canónicas y slugs legibles para cursos (hoy la ruta es `/courses/[id]` con UUID, no un slug amigable) | ⭐⭐⭐ | ⭐⭐⭐ | 1-2 semanas |
| SEO7 | Contenido indexable server-rendered para páginas públicas clave (curso, certificado) — depende de FE2 (Server Components) | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | incluido en FE2 |
| SEO8 | Optimización de Core Web Vitals una vez exista medición (hoy no se detectó instrumentación de performance real-user) | ⭐⭐⭐ | ⭐⭐⭐ | Fase 2/3 |
| SEO9 | Página de listado de certificaciones/academias públicas indexable (valor de marca, prueba social) | ⭐⭐ | ⭐⭐ | 1 semana |
| SEO10 | Alt text consistente y descriptivo en todas las imágenes de curso (duplica QW16) para SEO de imágenes, no solo accesibilidad | ⭐⭐ | ⭐ | incluido en QW16 |

---

## 23. Roadmap recomendado

### Fase 1 — Imprescindible (semanas 1-6)
Objetivo: cerrar riesgos de seguridad/integridad de datos y dejar de mostrarle al usuario cosas que no funcionan. Cero funcionalidades nuevas vistosas — es la base sobre la que todo lo demás se construye.

- Seguridad crítica: C1, C2, C3, C6, C7, C9 (QW1-QW4, QW20)
- Honestidad del producto: eliminar/reemplazar datos mock del dashboard (C8, QW17), placeholders de `/premium` y `/certificates/buy` deben o implementarse o quitarse de la navegación mientras tanto
- Base técnica: CI mínimo (HI14), validación real de DTOs de contenido (TEC8/SEC5), unificar streak (I5/TEC4)
- SEO básico: QW10, QW11, QW19

### Fase 2 — Muy recomendable (semanas 7-16)
Objetivo: convertir infraestructura ya modelada en producto usable, y dar al negocio una vía de monetización real.

- Monetización: HI1 (pago real + webhooks), PREM3 (gating real de contenido premium), PREM4
- Paginación y escalabilidad de datos: HI2, PERF2, PERF5
- Retención real: HI3 (continuar aprendiendo real), NF15 (recordatorios de racha)
- Contenido: HI4 (draft/published + vista previa), HI9 (editor enriquecido), HI10 (drag-and-drop)
- Consolidación de deuda técnica: HI6 (unificar premium), HI7 (unificar gamificación), TEC12 (unificar admin)
- Certificados: NF33-NF37 (PDF, QR, LinkedIn, revocación)

### Fase 3 — Crecimiento (semanas 17-28)
Objetivo: funcionalidades que compiten de frente con Udemy/Coursera/Codecademy en experiencia de aprendizaje.

- HI8/NF1 (Learning Paths/Roadmaps), NF2 (prerrequisitos), NF5 (recomendaciones), NF6/NF7 (categorías + búsqueda real)
- HI13 (reseñas/ratings), HI11 (auditoría admin completa), CUR8 (analítica de abandono)
- Gamificación activada de punta a punta: NF19-NF25 (misiones, insignias, temporadas de ranking)
- Ejercicios: NF26/NF27 (tests automáticos y sandbox server-side de código), NF28 (proyectos finales)
- Comunidad: NF40-NF43 (Q&A, reportes de contenido, referidos aplicados a cursos)
- FE2 (Server Components + SEO real vía SEO7)

### Fase 4 — Escalado (más allá de la semana 28, disparado por volumen real de usuarios, no por fecha)
Objetivo: sostener 100k → 1M → 10M usuarios sin reescritura de emergencia.

- Separación de dominios: DB20 (evaluar aislar el schema de cursos del de mundo virtual/marketplace), microservicio o al menos módulo desplegable independiente para el sistema de cursos
- DB19: archivado/particionamiento de tablas append-only (`Activity`, `XPTransaction`, `CoinTransaction`)
- PERF12: connection pooling explícito, múltiples instancias de API detrás de balanceador
- BE6: observabilidad completa (métricas + tracing distribuido), no solo logs
- Estrategia de caché multinivel (CDN + Redis + caché de aplicación) para catálogo y rankings a nivel global
- Revisión de arquitectura de autenticación (SEC8) para soportar múltiples clientes (web/game/futuras apps móviles) de forma segura y consistente a esa escala
- Internacionalización operativa real: el modelo de datos ya soporta multi-idioma; a 10M usuarios esto implica CDN multi-región y posible sharding por región/idioma

**Qué cambiaría concretamente en cada escalón de usuarios:**

| Usuarios | Cambios obligatorios |
|---|---|
| 100.000 | Paginación real (HI2) ya debe estar en producción; caché de Redis (HI12) para catálogo/rankings; CI con tests (HI14/TEC14) evita que cualquier deploy rompa el funnel principal |
| 1.000.000 | Índices y particionamiento de tablas de eventos (DB19); connection pooling (PERF12); CDN para assets de curso (PERF7); separación de lecturas/escrituras si Postgres se vuelve cuello de botella; observabilidad real (BE6) para detectar degradación antes que los usuarios |
| 10.000.000 | Evaluar separación física del dominio de cursos del resto del monolito (DB20); estrategia multi-región; colas de trabajo asíncronas para tareas pesadas (emisión masiva de certificados, envío de campañas de email); revisión de costos de infraestructura como función de primera clase del roadmap, no un efecto secundario |

---

## Nota de cierre

Ningún hallazgo de esta auditoría requiere una reescritura. El patrón dominante es "la pieza correcta ya existe en alguna parte del código, pero no está conectada, no está protegida, o está duplicada con una versión más vieja" — eso es, en términos relativos, una posición de partida favorable: la Fase 1 es fundamentalmente trabajo de conexión y cierre de brechas, no de invención.
