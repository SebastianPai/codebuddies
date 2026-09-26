import type { LegalDocSet } from "./types";

// Lo que realmente guarda la web (ver utils/auth.ts, i18n, consent, hub de
// recompensas, lecciones y quiz) más lo que ponen Google y Paddle.
const NECESSARY_ROWS = {
  es: [
    ["token, userId, user", "CodeBuddies (almacenamiento local)", "Mantener tu sesión iniciada", "Hasta que cierras sesión"],
    ["lang, theme", "CodeBuddies (almacenamiento local)", "Recordar idioma y tema visual", "Persistente"],
    ["cb-consent", "CodeBuddies (almacenamiento local)", "Guardar tu elección de cookies", "Hasta que la cambies"],
    ["cb:lesson-read:*, cb:quiz:saved, cb:rewards-hub:*", "CodeBuddies (almacenamiento local)", "Recordar lecciones leídas, ejercicios guardados y avisos ya vistos", "Persistente"],
    ["codebuddies:presence-session-id", "CodeBuddies (almacenamiento de sesión)", "Mostrar tu estado en línea a tus amigos", "Hasta cerrar la pestaña"],
    ["Cookies de Paddle", "Paddle", "Procesar el pago de forma segura (solo al abrir el checkout)", "Según Paddle"],
  ],
  en: [
    ["token, userId, user", "CodeBuddies (local storage)", "Keep you signed in", "Until you log out"],
    ["lang, theme", "CodeBuddies (local storage)", "Remember language and visual theme", "Persistent"],
    ["cb-consent", "CodeBuddies (local storage)", "Store your cookie choice", "Until you change it"],
    ["cb:lesson-read:*, cb:quiz:saved, cb:rewards-hub:*", "CodeBuddies (local storage)", "Remember read lessons, saved exercises and notices already seen", "Persistent"],
    ["codebuddies:presence-session-id", "CodeBuddies (session storage)", "Show your online status to friends", "Until the tab is closed"],
    ["Paddle cookies", "Paddle", "Process payment securely (only when the checkout opens)", "As set by Paddle"],
  ],
  de: [
    ["token, userId, user", "CodeBuddies (lokaler Speicher)", "Angemeldet bleiben", "Bis zur Abmeldung"],
    ["lang, theme", "CodeBuddies (lokaler Speicher)", "Sprache und Design merken", "Dauerhaft"],
    ["cb-consent", "CodeBuddies (lokaler Speicher)", "Deine Cookie-Auswahl speichern", "Bis du sie änderst"],
    ["cb:lesson-read:*, cb:quiz:saved, cb:rewards-hub:*", "CodeBuddies (lokaler Speicher)", "Gelesene Lektionen, gespeicherte Übungen und gesehene Hinweise merken", "Dauerhaft"],
    ["codebuddies:presence-session-id", "CodeBuddies (Sitzungsspeicher)", "Deinen Online-Status für Freunde anzeigen", "Bis der Tab geschlossen wird"],
    ["Paddle-Cookies", "Paddle", "Sichere Zahlungsabwicklung (nur beim Öffnen des Checkouts)", "Laut Paddle"],
  ],
};

const OPTIONAL_ROWS = {
  es: [
    ["_ga, _ga_*", "Google Analytics", "Analítica: contar visitas y medir el uso", "2 años"],
    ["__gads, __gpi, __eoi, IDE", "Google AdSense", "Publicidad: mostrar y medir anuncios", "Hasta 13 meses"],
    ["_gcl_au", "Google", "Publicidad: medir conversiones", "3 meses"],
  ],
  en: [
    ["_ga, _ga_*", "Google Analytics", "Analytics: count visits and measure usage", "2 years"],
    ["__gads, __gpi, __eoi, IDE", "Google AdSense", "Advertising: show and measure ads", "Up to 13 months"],
    ["_gcl_au", "Google", "Advertising: measure conversions", "3 months"],
  ],
  de: [
    ["_ga, _ga_*", "Google Analytics", "Analyse: Besuche zählen und Nutzung messen", "2 Jahre"],
    ["__gads, __gpi, __eoi, IDE", "Google AdSense", "Werbung: Anzeigen ausspielen und messen", "Bis zu 13 Monate"],
    ["_gcl_au", "Google", "Werbung: Conversions messen", "3 Monate"],
  ],
};

const HEADERS = {
  es: ["Nombre", "Proveedor", "Para qué", "Duración"],
  en: ["Name", "Provider", "Purpose", "Duration"],
  de: ["Name", "Anbieter", "Zweck", "Dauer"],
};

export const COOKIE_POLICY: LegalDocSet = {
  es: {
    title: "Política de cookies",
    summary:
      "Las cookies y el almacenamiento local son pequeños datos que el sitio guarda en tu navegador. Usamos los necesarios para que CodeBuddies funcione y, solo si lo aceptas, cookies de analítica y de publicidad. Puedes cambiar tu elección cuando quieras.",
    sections: [
      {
        id: "necesarias",
        title: "1. Necesarias (siempre activas)",
        paragraphs: ["Sin ellas no podrías iniciar sesión ni guardar tus preferencias. No requieren consentimiento."],
        table: { headers: HEADERS.es, rows: NECESSARY_ROWS.es },
      },
      {
        id: "opcionales",
        title: "2. Analítica y publicidad (solo con tu permiso)",
        paragraphs: [
          "Las carga Google a través de Google Tag Manager. Usamos el Modo de consentimiento de Google: hasta que aceptas, Google no guarda cookies en tu navegador y solo recibe señales anónimas sin identificadores. Si rechazas la publicidad, los anuncios que veas no serán personalizados. Los usuarios Premium no ven anuncios.",
        ],
        table: { headers: HEADERS.es, rows: OPTIONAL_ROWS.es },
      },
      {
        id: "gestionar",
        title: "3. Cómo cambiar tu elección",
        list: [
          "Con el botón \"Cambiar preferencias de cookies\" de esta página o el enlace \"Preferencias de cookies\" del pie de página.",
          "Desde la configuración de tu navegador puedes borrar o bloquear cookies; si bloqueas las necesarias, es posible que no puedas iniciar sesión.",
          "Para Google: adssettings.google.com y el complemento de exclusión de Google Analytics (tools.google.com/dlpage/gaoptout).",
        ],
      },
      {
        id: "mas",
        title: "4. Más información",
        paragraphs: ["Para saber cómo tratamos tus datos personales, consulta la Política de privacidad."],
      },
    ],
  },
  en: {
    title: "Cookie policy",
    summary:
      "Cookies and local storage are small pieces of data the site stores in your browser. We use the necessary ones so CodeBuddies works and, only if you accept, analytics and advertising cookies. You can change your choice at any time.",
    sections: [
      {
        id: "necessary",
        title: "1. Necessary (always on)",
        paragraphs: ["Without them you couldn't sign in or keep your preferences. They don't require consent."],
        table: { headers: HEADERS.en, rows: NECESSARY_ROWS.en },
      },
      {
        id: "optional",
        title: "2. Analytics and advertising (only with your permission)",
        paragraphs: [
          "They are loaded by Google through Google Tag Manager. We use Google Consent Mode: until you accept, Google stores no cookies in your browser and only receives anonymous signals without identifiers. If you reject advertising, the ads you see won't be personalized. Premium users see no ads.",
        ],
        table: { headers: HEADERS.en, rows: OPTIONAL_ROWS.en },
      },
      {
        id: "manage",
        title: "3. How to change your choice",
        list: [
          "With the \"Change cookie preferences\" button on this page or the \"Cookie preferences\" link in the footer.",
          "In your browser settings you can delete or block cookies; if you block the necessary ones, you may not be able to sign in.",
          "For Google: adssettings.google.com and the Google Analytics opt-out add-on (tools.google.com/dlpage/gaoptout).",
        ],
      },
      {
        id: "more",
        title: "4. More information",
        paragraphs: ["To learn how we handle your personal data, see the Privacy policy."],
      },
    ],
  },
  de: {
    title: "Cookie-Richtlinie",
    summary:
      "Cookies und lokaler Speicher sind kleine Datenmengen, die die Website in deinem Browser ablegt. Wir nutzen die notwendigen, damit CodeBuddies funktioniert, und – nur wenn du zustimmst – Analyse- und Werbe-Cookies. Du kannst deine Auswahl jederzeit ändern.",
    sections: [
      {
        id: "notwendig",
        title: "1. Notwendig (immer aktiv)",
        paragraphs: ["Ohne sie könntest du dich nicht anmelden und keine Einstellungen speichern. Sie benötigen keine Einwilligung."],
        table: { headers: HEADERS.de, rows: NECESSARY_ROWS.de },
      },
      {
        id: "optional",
        title: "2. Analyse und Werbung (nur mit deiner Erlaubnis)",
        paragraphs: [
          "Sie werden von Google über den Google Tag Manager geladen. Wir nutzen den Google-Einwilligungsmodus: Bis du zustimmst, speichert Google keine Cookies in deinem Browser und erhält nur anonyme Signale ohne Kennungen. Lehnst du Werbung ab, sind die Anzeigen nicht personalisiert. Premium-Nutzer sehen keine Werbung.",
        ],
        table: { headers: HEADERS.de, rows: OPTIONAL_ROWS.de },
      },
      {
        id: "verwalten",
        title: "3. Auswahl ändern",
        list: [
          "Über die Schaltfläche „Cookie-Einstellungen ändern“ auf dieser Seite oder den Link „Cookie-Einstellungen“ in der Fußzeile.",
          "In deinem Browser kannst du Cookies löschen oder blockieren; blockierst du die notwendigen, kannst du dich eventuell nicht anmelden.",
          "Für Google: adssettings.google.com und das Deaktivierungs-Add-on für Google Analytics (tools.google.com/dlpage/gaoptout).",
        ],
      },
      {
        id: "mehr",
        title: "4. Weitere Informationen",
        paragraphs: ["Wie wir deine personenbezogenen Daten verarbeiten, erfährst du in der Datenschutzerklärung."],
      },
    ],
  },
};
