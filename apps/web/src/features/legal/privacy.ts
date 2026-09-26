import { SUPPORT_EMAIL } from "@/config/site";
import type { LegalDocSet } from "./types";

const E = SUPPORT_EMAIL;

export const PRIVACY_POLICY: LegalDocSet = {
  es: {
    title: "Política de privacidad",
    summary:
      "Esta política explica qué datos personales trata CodeBuddies, para qué, con quién los comparte y cómo puedes ejercer tus derechos. Aplica a codebuddies.tech, game.codebuddies.tech y api.codebuddies.tech.",
    sections: [
      {
        id: "responsable",
        title: "1. Responsable del tratamiento",
        paragraphs: [
          `El responsable del tratamiento de tus datos es CodeBuddies, con domicilio en Colombia (en adelante, "CodeBuddies", "nosotros"). Para cualquier consulta sobre privacidad puedes escribir a ${E}.`,
          "Tratamos los datos conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013 de Colombia (protección de datos personales) y, cuando usas el servicio desde la Unión Europea o el Espacio Económico Europeo, conforme al Reglamento General de Protección de Datos (RGPD).",
        ],
      },
      {
        id: "datos",
        title: "2. Qué datos recopilamos",
        list: [
          "Datos de cuenta: nombre de usuario, correo electrónico y contraseña (guardada cifrada con un algoritmo de hash; nunca en texto plano).",
          "Datos de perfil opcionales: avatar, fecha de nacimiento, país, idioma, tema visual y preferencias de correo.",
          "Actividad de aprendizaje: lecciones y ejercicios completados, respuestas (correctas o no) y tiempo dedicado, XP, nivel, monedas, rachas, logros, insignias, pase de batalla y certificados emitidos.",
          "Contenido que publicas: comentarios, reseñas, reportes, mensajes privados entre usuarios, publicaciones de la comunidad y objetos creados para el marketplace.",
          "Datos sociales y del juego: amigos, seguidores, estado en línea, salas, objetos y chat dentro del juego.",
          "Datos de compras: plan contratado, estado de la suscripción, compras de monedas y certificados, identificadores de transacción y país de facturación. Los datos de la tarjeta los procesa Paddle; nosotros nunca los vemos ni los guardamos.",
          "Datos técnicos: dirección IP, tipo de navegador y dispositivo, fechas de acceso y registros de errores y seguridad.",
          "Datos de analítica y publicidad (solo con tu consentimiento): páginas visitadas y uso del sitio a través de Google Analytics, e identificadores publicitarios de Google AdSense.",
        ],
      },
      {
        id: "finalidades",
        title: "3. Para qué usamos tus datos y con qué base legal",
        list: [
          "Prestar el servicio (crear tu cuenta, guardar tu progreso, mostrar cursos, emitir certificados, gestionar el juego y la mensajería): ejecución del contrato que aceptas con los Términos.",
          "Procesar pagos, suscripciones y reembolsos: ejecución del contrato y obligaciones legales y fiscales.",
          "Seguridad, prevención de fraude y abuso (por ejemplo, límites de peticiones, detección de trampas en recompensas o de referidos falsos): interés legítimo en proteger la plataforma y a sus usuarios.",
          "Correos transaccionales (avisos de la cuenta, recibos, recordatorios de racha): ejecución del contrato.",
          "Correos de novedades y promociones: solo con tu consentimiento; puedes darte de baja cuando quieras desde Ajustes o desde el enlace del correo.",
          "Analítica y publicidad personalizada: solo con tu consentimiento en el banner de cookies.",
          "Atender tus solicitudes y cumplir obligaciones legales o requerimientos de autoridades.",
        ],
      },
      {
        id: "compartir",
        title: "4. Con quién compartimos tus datos",
        paragraphs: [
          "No vendemos tus datos personales. Solo los compartimos con proveedores que nos ayudan a operar el servicio, bajo contratos que los obligan a protegerlos:",
        ],
        list: [
          "Paddle.com Market Ltd. (Reino Unido): procesa los pagos como revendedor autorizado (Merchant of Record). Es responsable de los datos de facturación que recoge en su checkout según su propia política de privacidad.",
          "Salesforce / Heroku (EE. UU.): alojamiento de la aplicación y de la base de datos.",
          "Cloudflare (EE. UU.): almacenamiento y entrega de imágenes (R2) y red.",
          "Resend (EE. UU.): envío de correos electrónicos.",
          "Google LLC (EE. UU.): Google Tag Manager, Google Analytics y Google AdSense, solo según tu consentimiento de cookies.",
          "Otros usuarios: tu nombre de usuario, avatar, nivel, logros, rankings, comentarios, reseñas y perfil público son visibles para otros. Los mensajes privados solo los ven los participantes de la conversación.",
          "Autoridades: cuando la ley lo exija o para defender nuestros derechos.",
        ],
      },
      {
        id: "transferencias",
        title: "5. Transferencias internacionales",
        paragraphs: [
          "Nuestros proveedores alojan datos principalmente en Estados Unidos y el Reino Unido. Cuando transferimos datos fuera de Colombia o del Espacio Económico Europeo lo hacemos con proveedores que ofrecen garantías adecuadas (por ejemplo, cláusulas contractuales tipo de la Comisión Europea o el Marco de Privacidad de Datos UE-EE. UU.).",
        ],
      },
      {
        id: "conservacion",
        title: "6. Cuánto tiempo los conservamos",
        list: [
          "Datos de la cuenta y de aprendizaje: mientras la cuenta esté activa.",
          "Si pides eliminar tu cuenta: borramos o anonimizamos tus datos en un plazo máximo de 30 días, salvo lo que debamos conservar por ley.",
          "Registros de compras y facturación: el tiempo que exijan las normas fiscales y contables (en general, hasta 10 años).",
          "Registros técnicos y de seguridad: hasta 90 días.",
          "Certificados: se conservan para que sigan siendo verificables, salvo que pidas su eliminación.",
        ],
      },
      {
        id: "derechos",
        title: "7. Tus derechos",
        paragraphs: [
          `Puedes conocer, actualizar, rectificar y suprimir tus datos, pedir una copia en un formato portable, oponerte a ciertos usos, limitar el tratamiento y revocar en cualquier momento las autorizaciones que nos diste. Escríbenos a ${E} desde el correo de tu cuenta.`,
          "Respondemos consultas en un máximo de 10 días hábiles y reclamos en un máximo de 15 días hábiles, como indica la ley colombiana (en la UE, en un máximo de un mes).",
          "Si no quedas conforme con nuestra respuesta, puedes presentar una queja ante la Superintendencia de Industria y Comercio (SIC) de Colombia o, si vives en la UE, ante la autoridad de protección de datos de tu país.",
        ],
      },
      {
        id: "menores",
        title: "8. Menores de edad",
        paragraphs: [
          "CodeBuddies es una plataforma educativa que pueden usar menores. Si tienes menos de 14 años (o menos de 16 en la UE), necesitas la autorización de tu madre, padre o tutor para crear una cuenta. Si un colegio u organización gestiona el acceso, también pueden aplicarse sus propias reglas.",
          `Si eres madre, padre o tutor y crees que un menor nos dio datos sin tu autorización, escríbenos a ${E} y los eliminaremos.`,
        ],
      },
      {
        id: "seguridad",
        title: "9. Seguridad",
        paragraphs: [
          "Usamos conexiones cifradas (HTTPS), contraseñas con hash, control de acceso por roles, límites de peticiones y copias de seguridad. Ningún sistema es 100 % seguro: si detectamos una brecha que afecte tus datos, te avisaremos a ti y a las autoridades cuando corresponda.",
        ],
      },
      {
        id: "cookies",
        title: "10. Cookies",
        paragraphs: [
          "Usamos almacenamiento necesario para que el sitio funcione y, solo con tu permiso, cookies de analítica y publicidad. Encontrarás el detalle y cómo cambiar tu elección en la Política de cookies.",
        ],
      },
      {
        id: "cambios",
        title: "11. Cambios en esta política",
        paragraphs: [
          "Podemos actualizar esta política. Si el cambio es importante te avisaremos por correo o dentro de la plataforma antes de que entre en vigor. La fecha de la última actualización aparece arriba.",
        ],
      },
    ],
  },
  en: {
    title: "Privacy policy",
    summary:
      "This policy explains what personal data CodeBuddies processes, why, who we share it with and how you can exercise your rights. It applies to codebuddies.tech, game.codebuddies.tech and api.codebuddies.tech.",
    sections: [
      {
        id: "controller",
        title: "1. Data controller",
        paragraphs: [
          `The controller of your data is CodeBuddies, based in Colombia ("CodeBuddies", "we"). For any privacy question, write to ${E}.`,
          "We process data in accordance with Colombian Law 1581 of 2012 and Decree 1377 of 2013 and, when you use the service from the European Union or the European Economic Area, with the General Data Protection Regulation (GDPR).",
        ],
      },
      {
        id: "data",
        title: "2. Data we collect",
        list: [
          "Account data: username, email address and password (stored hashed, never in plain text).",
          "Optional profile data: avatar, date of birth, country, language, visual theme and email preferences.",
          "Learning activity: completed lessons and exercises, answers (correct or not) and time spent, XP, level, coins, streaks, achievements, badges, battle pass and issued certificates.",
          "Content you publish: comments, reviews, reports, private messages between users, community posts and items created for the marketplace.",
          "Social and game data: friends, followers, online status, rooms, items and in-game chat.",
          "Purchase data: plan, subscription status, coin and certificate purchases, transaction identifiers and billing country. Card details are processed by Paddle; we never see or store them.",
          "Technical data: IP address, browser and device type, access dates, and error and security logs.",
          "Analytics and advertising data (only with your consent): pages visited and site usage through Google Analytics, and Google AdSense advertising identifiers.",
        ],
      },
      {
        id: "purposes",
        title: "3. Why we use your data and legal basis",
        list: [
          "Providing the service (creating your account, saving your progress, showing courses, issuing certificates, running the game and messaging): performance of the contract you accept in the Terms.",
          "Processing payments, subscriptions and refunds: performance of the contract and legal and tax obligations.",
          "Security, fraud and abuse prevention (e.g. rate limits, detecting reward cheating or fake referrals): our legitimate interest in protecting the platform and its users.",
          "Transactional emails (account notices, receipts, streak reminders): performance of the contract.",
          "News and promotional emails: only with your consent; you can unsubscribe at any time in Settings or via the link in the email.",
          "Analytics and personalized advertising: only with your consent in the cookie banner.",
          "Handling your requests and complying with legal obligations or requests from authorities.",
        ],
      },
      {
        id: "sharing",
        title: "4. Who we share your data with",
        paragraphs: [
          "We do not sell your personal data. We only share it with providers that help us run the service, under contracts that require them to protect it:",
        ],
        list: [
          "Paddle.com Market Ltd. (United Kingdom): processes payments as our authorized reseller (Merchant of Record) and is responsible for the billing data it collects in its checkout under its own privacy policy.",
          "Salesforce / Heroku (USA): application and database hosting.",
          "Cloudflare (USA): image storage and delivery (R2) and network.",
          "Resend (USA): email delivery.",
          "Google LLC (USA): Google Tag Manager, Google Analytics and Google AdSense, only according to your cookie consent.",
          "Other users: your username, avatar, level, achievements, rankings, comments, reviews and public profile are visible to others. Private messages are only visible to the participants of the conversation.",
          "Authorities: when required by law or to defend our rights.",
        ],
      },
      {
        id: "transfers",
        title: "5. International transfers",
        paragraphs: [
          "Our providers host data mainly in the United States and the United Kingdom. When we transfer data outside Colombia or the European Economic Area we use providers that offer appropriate safeguards (such as the European Commission's standard contractual clauses or the EU-US Data Privacy Framework).",
        ],
      },
      {
        id: "retention",
        title: "6. How long we keep data",
        list: [
          "Account and learning data: while your account is active.",
          "If you ask us to delete your account: we delete or anonymize your data within 30 days, except what we must keep by law.",
          "Purchase and billing records: as long as tax and accounting rules require (generally up to 10 years).",
          "Technical and security logs: up to 90 days.",
          "Certificates: kept so they remain verifiable, unless you ask us to delete them.",
        ],
      },
      {
        id: "rights",
        title: "7. Your rights",
        paragraphs: [
          `You can access, update, correct and delete your data, request a copy in a portable format, object to certain uses, restrict processing and withdraw any consent at any time. Write to ${E} from your account's email address.`,
          "We answer requests within 10 business days and complaints within 15 business days, as required by Colombian law (within one month in the EU).",
          "If you are not satisfied with our answer, you can file a complaint with Colombia's Superintendence of Industry and Commerce (SIC) or, if you live in the EU, with your country's data protection authority.",
        ],
      },
      {
        id: "minors",
        title: "8. Minors",
        paragraphs: [
          "CodeBuddies is an educational platform that minors may use. If you are under 14 (under 16 in the EU), you need permission from a parent or guardian to create an account. If a school or organization manages access, its own rules may also apply.",
          `If you are a parent or guardian and believe a minor gave us data without your permission, write to ${E} and we will delete it.`,
        ],
      },
      {
        id: "security",
        title: "9. Security",
        paragraphs: [
          "We use encrypted connections (HTTPS), hashed passwords, role-based access control, rate limits and backups. No system is 100% secure: if we detect a breach affecting your data, we will notify you and the authorities where required.",
        ],
      },
      {
        id: "cookies",
        title: "10. Cookies",
        paragraphs: [
          "We use storage that is necessary for the site to work and, only with your permission, analytics and advertising cookies. See the Cookie policy for details and to change your choice.",
        ],
      },
      {
        id: "changes",
        title: "11. Changes to this policy",
        paragraphs: [
          "We may update this policy. If a change is significant we will notify you by email or within the platform before it takes effect. The date of the last update appears above.",
        ],
      },
    ],
  },
  de: {
    title: "Datenschutzerklärung",
    summary:
      "Diese Erklärung beschreibt, welche personenbezogenen Daten CodeBuddies verarbeitet, zu welchem Zweck, mit wem wir sie teilen und wie du deine Rechte ausüben kannst. Sie gilt für codebuddies.tech, game.codebuddies.tech und api.codebuddies.tech.",
    sections: [
      {
        id: "verantwortlicher",
        title: "1. Verantwortlicher",
        paragraphs: [
          `Verantwortlich für die Verarbeitung deiner Daten ist CodeBuddies mit Sitz in Kolumbien („CodeBuddies“, „wir“). Bei Fragen zum Datenschutz schreib an ${E}.`,
          "Wir verarbeiten Daten gemäß dem kolumbianischen Gesetz 1581 von 2012 und dem Dekret 1377 von 2013 und, wenn du den Dienst aus der Europäischen Union bzw. dem Europäischen Wirtschaftsraum nutzt, gemäß der Datenschutz-Grundverordnung (DSGVO).",
        ],
      },
      {
        id: "daten",
        title: "2. Welche Daten wir erheben",
        list: [
          "Kontodaten: Benutzername, E-Mail-Adresse und Passwort (nur als Hash gespeichert, nie im Klartext).",
          "Optionale Profildaten: Avatar, Geburtsdatum, Land, Sprache, Design und E-Mail-Einstellungen.",
          "Lernaktivität: abgeschlossene Lektionen und Übungen, Antworten (richtig oder falsch) und aufgewendete Zeit, XP, Level, Münzen, Serien, Erfolge, Abzeichen, Battle Pass und ausgestellte Zertifikate.",
          "Von dir veröffentlichte Inhalte: Kommentare, Bewertungen, Meldungen, private Nachrichten zwischen Nutzern, Community-Beiträge und für den Marktplatz erstellte Objekte.",
          "Soziale und Spieldaten: Freunde, Follower, Online-Status, Räume, Objekte und Chat im Spiel.",
          "Kaufdaten: gebuchter Tarif, Abo-Status, Käufe von Münzen und Zertifikaten, Transaktionskennungen und Rechnungsland. Kartendaten verarbeitet Paddle; wir sehen oder speichern sie nie.",
          "Technische Daten: IP-Adresse, Browser- und Gerätetyp, Zugriffszeiten sowie Fehler- und Sicherheitsprotokolle.",
          "Analyse- und Werbedaten (nur mit deiner Einwilligung): besuchte Seiten und Nutzung über Google Analytics sowie Werbekennungen von Google AdSense.",
        ],
      },
      {
        id: "zwecke",
        title: "3. Zwecke und Rechtsgrundlagen",
        list: [
          "Bereitstellung des Dienstes (Konto anlegen, Fortschritt speichern, Kurse anzeigen, Zertifikate ausstellen, Spiel und Nachrichten betreiben): Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO).",
          "Abwicklung von Zahlungen, Abos und Rückerstattungen: Vertragserfüllung sowie gesetzliche und steuerliche Pflichten.",
          "Sicherheit sowie Betrugs- und Missbrauchsprävention (z. B. Anfragelimits, Erkennung von Belohnungs-Betrug oder gefälschten Empfehlungen): berechtigtes Interesse am Schutz der Plattform und ihrer Nutzer.",
          "Transaktions-E-Mails (Kontohinweise, Belege, Serien-Erinnerungen): Vertragserfüllung.",
          "Newsletter und Angebote: nur mit deiner Einwilligung; du kannst dich jederzeit in den Einstellungen oder über den Link in der E-Mail abmelden.",
          "Analyse und personalisierte Werbung: nur mit deiner Einwilligung im Cookie-Banner.",
          "Bearbeitung deiner Anfragen und Erfüllung gesetzlicher Pflichten oder behördlicher Anordnungen.",
        ],
      },
      {
        id: "weitergabe",
        title: "4. Weitergabe von Daten",
        paragraphs: [
          "Wir verkaufen deine personenbezogenen Daten nicht. Wir teilen sie nur mit Dienstleistern, die uns beim Betrieb helfen und vertraglich zu ihrem Schutz verpflichtet sind:",
        ],
        list: [
          "Paddle.com Market Ltd. (Vereinigtes Königreich): wickelt Zahlungen als autorisierter Wiederverkäufer (Merchant of Record) ab und ist für die in seinem Checkout erhobenen Rechnungsdaten nach seiner eigenen Datenschutzerklärung verantwortlich.",
          "Salesforce / Heroku (USA): Hosting der Anwendung und der Datenbank.",
          "Cloudflare (USA): Speicherung und Auslieferung von Bildern (R2) sowie Netzwerk.",
          "Resend (USA): E-Mail-Versand.",
          "Google LLC (USA): Google Tag Manager, Google Analytics und Google AdSense, nur entsprechend deiner Cookie-Einwilligung.",
          "Andere Nutzer: Benutzername, Avatar, Level, Erfolge, Ranglisten, Kommentare, Bewertungen und öffentliches Profil sind für andere sichtbar. Private Nachrichten sehen nur die Teilnehmer der Unterhaltung.",
          "Behörden: wenn das Gesetz es verlangt oder zur Verteidigung unserer Rechte.",
        ],
      },
      {
        id: "uebermittlung",
        title: "5. Internationale Datenübermittlung",
        paragraphs: [
          "Unsere Dienstleister speichern Daten hauptsächlich in den USA und im Vereinigten Königreich. Übermittlungen außerhalb Kolumbiens oder des EWR erfolgen nur an Anbieter mit geeigneten Garantien (z. B. Standardvertragsklauseln der EU-Kommission oder das EU-US Data Privacy Framework).",
        ],
      },
      {
        id: "speicherdauer",
        title: "6. Speicherdauer",
        list: [
          "Konto- und Lerndaten: solange dein Konto aktiv ist.",
          "Wenn du die Löschung deines Kontos verlangst: Wir löschen oder anonymisieren deine Daten innerhalb von 30 Tagen, außer was wir gesetzlich aufbewahren müssen.",
          "Kauf- und Rechnungsdaten: so lange, wie steuer- und handelsrechtliche Vorschriften es verlangen (in der Regel bis zu 10 Jahre).",
          "Technische und Sicherheitsprotokolle: bis zu 90 Tage.",
          "Zertifikate: werden aufbewahrt, damit sie überprüfbar bleiben, sofern du nicht ihre Löschung verlangst.",
        ],
      },
      {
        id: "rechte",
        title: "7. Deine Rechte",
        paragraphs: [
          `Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch sowie das Recht, erteilte Einwilligungen jederzeit zu widerrufen. Schreib dazu von der E-Mail-Adresse deines Kontos an ${E}.`,
          "Wir antworten innerhalb eines Monats (in Kolumbien: Anfragen innerhalb von 10 und Beschwerden innerhalb von 15 Werktagen).",
          "Du kannst dich außerdem bei der Datenschutz-Aufsichtsbehörde deines Landes beschweren (in Kolumbien bei der Superintendencia de Industria y Comercio, SIC).",
        ],
      },
      {
        id: "minderjaehrige",
        title: "8. Minderjährige",
        paragraphs: [
          "CodeBuddies ist eine Lernplattform, die auch Minderjährige nutzen können. Wenn du jünger als 16 Jahre bist (in Kolumbien: 14), brauchst du die Zustimmung eines Elternteils oder Erziehungsberechtigten, um ein Konto zu erstellen. Wenn eine Schule oder Organisation den Zugang verwaltet, können zusätzlich deren Regeln gelten.",
          `Wenn du als Elternteil glaubst, dass ein Kind uns ohne deine Zustimmung Daten übermittelt hat, schreib an ${E} und wir löschen sie.`,
        ],
      },
      {
        id: "sicherheit",
        title: "9. Sicherheit",
        paragraphs: [
          "Wir nutzen verschlüsselte Verbindungen (HTTPS), gehashte Passwörter, rollenbasierte Zugriffskontrolle, Anfragelimits und Backups. Kein System ist zu 100 % sicher: Bei einer Datenpanne, die deine Daten betrifft, informieren wir dich und – soweit erforderlich – die Behörden.",
        ],
      },
      {
        id: "cookies",
        title: "10. Cookies",
        paragraphs: [
          "Wir verwenden technisch notwendige Speicherung und – nur mit deiner Erlaubnis – Analyse- und Werbe-Cookies. Details und die Möglichkeit, deine Auswahl zu ändern, findest du in der Cookie-Richtlinie.",
        ],
      },
      {
        id: "aenderungen",
        title: "11. Änderungen",
        paragraphs: [
          "Wir können diese Erklärung aktualisieren. Bei wesentlichen Änderungen informieren wir dich vorab per E-Mail oder auf der Plattform. Das Datum der letzten Aktualisierung steht oben.",
        ],
      },
    ],
  },
};
