import { SUPPORT_EMAIL } from "@/config/site";
import type { LegalDocSet } from "./types";

const E = SUPPORT_EMAIL;

export const TERMS: LegalDocSet = {
  es: {
    title: "Términos y condiciones",
    summary:
      "Estas condiciones regulan el uso de CodeBuddies: la plataforma de cursos, el juego, la comunidad y las compras. Al crear una cuenta o usar el servicio las aceptas. Léelas junto con la Política de privacidad y la Política de reembolsos.",
    sections: [
      {
        id: "servicio",
        title: "1. El servicio",
        paragraphs: [
          "CodeBuddies ofrece cursos interactivos de programación, ejercicios, certificados, un mundo virtual multijugador, funciones sociales (amigos, mensajes, comunidad, rankings) y elementos de juego como XP, monedas, rachas, logros y pase de batalla. Parte del contenido es gratuito y parte requiere pago.",
          "Podemos mejorar, cambiar o retirar funciones. Si retiramos algo por lo que pagaste y todavía no pudiste disfrutar, te ofreceremos una alternativa o un reembolso proporcional.",
        ],
      },
      {
        id: "cuenta",
        title: "2. Tu cuenta",
        list: [
          "Debes dar datos verdaderos y mantener segura tu contraseña. Eres responsable de lo que ocurra con tu cuenta.",
          "La cuenta es personal: no la vendas, prestes ni compartas.",
          "Si tienes menos de 14 años (16 en la UE), necesitas la autorización de tu madre, padre o tutor, que acepta estas condiciones en tu nombre.",
          `Puedes pedir el cierre de tu cuenta en cualquier momento escribiendo a ${E}.`,
        ],
      },
      {
        id: "pagos",
        title: "3. Planes, pagos y renovación",
        paragraphs: [
          "Los pagos los procesa Paddle.com, que actúa como revendedor autorizado (Merchant of Record): Paddle es quien te vende y factura, cobra los impuestos aplicables y gestiona el cobro. Al pagar también aceptas las condiciones de compra de Paddle.",
        ],
        list: [
          "CodeBuddies Premium se ofrece como suscripción mensual o anual que se renueva automáticamente al final de cada período, al precio vigente, hasta que la canceles.",
          "Puedes cancelar cuando quieras desde Facturación o desde el enlace del recibo de Paddle. Mantienes el acceso Premium hasta el final del período ya pagado.",
          "Si cambiamos el precio de tu suscripción te avisaremos con al menos 30 días de anticipación; el nuevo precio se aplica desde la siguiente renovación y puedes cancelar antes.",
          "Los certificados individuales se pagan una sola vez por curso.",
          "Los reembolsos se rigen por la Política de reembolsos.",
        ],
      },
      {
        id: "monedas",
        title: "4. Monedas y objetos virtuales",
        list: [
          "Las monedas, XP, objetos, cosméticos, muebles, mascotas, insignias y demás elementos virtuales son una licencia de uso personal dentro de CodeBuddies, no una propiedad.",
          "No tienen valor monetario, no se pueden canjear por dinero ni transferir fuera de la plataforma, salvo las funciones de intercambio o marketplace que ofrezcamos.",
          "Podemos corregir saldos o registros claramente erróneos (por ejemplo, por un fallo técnico o un uso indebido).",
          "Las monedas compradas no caducan mientras tu cuenta esté activa.",
        ],
      },
      {
        id: "certificados",
        title: "5. Certificados",
        paragraphs: [
          "Un certificado acredita que la cuenta completó un curso en CodeBuddies; no es un título oficial ni universitario. Cada certificado tiene un código público de verificación. Podemos revocar certificados obtenidos con trampas, suplantación o fraude.",
        ],
      },
      {
        id: "conducta",
        title: "6. Normas de uso",
        paragraphs: ["No está permitido:"],
        list: [
          "Acosar, amenazar, discriminar o publicar contenido sexual, violento, ilegal o que infrinja derechos de terceros.",
          "Hacer trampa: automatizar respuestas, explotar errores, crear cuentas falsas o referidos falsos para obtener recompensas.",
          "Atacar el servicio, sobrecargarlo, extraer datos de forma masiva o acceder a cuentas ajenas.",
          "Subir código malicioso, spam o publicidad no autorizada.",
          "Evadir pagos, revender accesos o hacer contracargos fraudulentos.",
        ],
      },
      {
        id: "contenido",
        title: "7. Tu contenido y nuestro contenido",
        paragraphs: [
          "Tú conservas los derechos sobre lo que publicas (comentarios, código, reseñas, objetos creados). Nos das una licencia gratuita y mundial para alojarlo, mostrarlo y adaptarlo dentro del servicio mientras siga publicado.",
          "Los cursos, textos, ejercicios, gráficos, personajes, el software y la marca CodeBuddies son nuestros o de nuestros licenciantes. Puedes usarlos para aprender, pero no copiarlos, revenderlos ni redistribuirlos.",
          `Si crees que algún contenido infringe tus derechos, escríbenos a ${E}.`,
        ],
      },
      {
        id: "publicidad",
        title: "8. Publicidad",
        paragraphs: [
          "Las cuentas gratuitas pueden ver anuncios de Google AdSense. Los usuarios Premium no ven anuncios. La publicidad personalizada solo se muestra si la aceptas en el banner de cookies.",
        ],
      },
      {
        id: "suspension",
        title: "9. Suspensión y cierre",
        paragraphs: [
          "Si incumples estas condiciones podemos advertirte, quitar contenido, retirar recompensas obtenidas indebidamente o suspender o cerrar tu cuenta. En casos graves (fraude, acoso, ataques) podemos hacerlo sin aviso previo. Si la cuenta se cierra por un incumplimiento, no corresponde reembolso de lo ya consumido.",
        ],
      },
      {
        id: "responsabilidad",
        title: "10. Garantías y responsabilidad",
        paragraphs: [
          "Hacemos lo posible para que el servicio funcione bien y sin interrupciones, pero puede tener fallas o pausas por mantenimiento. El servicio se ofrece \"tal cual\" y no garantizamos resultados laborales o académicos concretos.",
          "En la medida en que la ley lo permita, nuestra responsabilidad total frente a ti se limita a lo que nos pagaste en los 12 meses anteriores al hecho que la origine. Nada de esto limita los derechos que te reconozcan las normas de protección al consumidor que te sean aplicables.",
        ],
      },
      {
        id: "ley",
        title: "11. Ley aplicable",
        paragraphs: [
          "Estas condiciones se rigen por las leyes de Colombia. Si eres consumidor en otro país (por ejemplo, en la Unión Europea), conservas la protección de las normas obligatorias de tu país y puedes acudir a sus tribunales.",
          `Antes de cualquier reclamo formal, escríbenos a ${E}: la mayoría de los problemas se resuelven así.`,
        ],
      },
      {
        id: "cambios",
        title: "12. Cambios",
        paragraphs: [
          "Podemos actualizar estas condiciones. Si el cambio es importante te avisaremos con antelación por correo o en la plataforma. Si sigues usando CodeBuddies después de la fecha de entrada en vigor, se entiende que los aceptas; si no estás de acuerdo, puedes cerrar tu cuenta.",
        ],
      },
    ],
  },
  en: {
    title: "Terms and conditions",
    summary:
      "These terms govern the use of CodeBuddies: the course platform, the game, the community and purchases. By creating an account or using the service you accept them. Read them together with the Privacy policy and the Refund policy.",
    sections: [
      {
        id: "service",
        title: "1. The service",
        paragraphs: [
          "CodeBuddies offers interactive programming courses, exercises, certificates, a multiplayer virtual world, social features (friends, messages, community, rankings) and game elements such as XP, coins, streaks, achievements and a battle pass. Some content is free and some requires payment.",
          "We may improve, change or remove features. If we remove something you paid for and have not yet been able to use, we will offer an alternative or a proportional refund.",
        ],
      },
      {
        id: "account",
        title: "2. Your account",
        list: [
          "You must provide accurate information and keep your password safe. You are responsible for activity on your account.",
          "Your account is personal: do not sell, lend or share it.",
          "If you are under 14 (16 in the EU), you need permission from a parent or guardian, who accepts these terms on your behalf.",
          `You can ask us to close your account at any time by writing to ${E}.`,
        ],
      },
      {
        id: "payments",
        title: "3. Plans, payments and renewal",
        paragraphs: [
          "Payments are processed by Paddle.com, acting as our authorized reseller (Merchant of Record): Paddle sells to you and invoices you, collects applicable taxes and handles billing. When you pay you also accept Paddle's buyer terms.",
        ],
        list: [
          "CodeBuddies Premium is offered as a monthly or yearly subscription that renews automatically at the end of each period, at the current price, until you cancel.",
          "You can cancel at any time from Billing or via the link in your Paddle receipt. You keep Premium access until the end of the period already paid.",
          "If we change your subscription price we will notify you at least 30 days in advance; the new price applies from the next renewal and you may cancel before then.",
          "Individual certificates are a one-time payment per course.",
          "Refunds are governed by the Refund policy.",
        ],
      },
      {
        id: "coins",
        title: "4. Coins and virtual items",
        list: [
          "Coins, XP, items, cosmetics, furniture, pets, badges and other virtual goods are a personal license to use within CodeBuddies, not property.",
          "They have no monetary value and cannot be exchanged for money or transferred outside the platform, except through trading or marketplace features we provide.",
          "We may correct clearly wrong balances or records (for example, due to a technical error or misuse).",
          "Purchased coins do not expire while your account is active.",
        ],
      },
      {
        id: "certificates",
        title: "5. Certificates",
        paragraphs: [
          "A certificate states that the account completed a course on CodeBuddies; it is not an official or university degree. Each certificate has a public verification code. We may revoke certificates obtained through cheating, impersonation or fraud.",
        ],
      },
      {
        id: "conduct",
        title: "6. Rules of use",
        paragraphs: ["You may not:"],
        list: [
          "Harass, threaten or discriminate, or post sexual, violent, illegal or infringing content.",
          "Cheat: automate answers, exploit bugs, or create fake accounts or referrals to obtain rewards.",
          "Attack or overload the service, scrape data at scale or access other people's accounts.",
          "Upload malicious code, spam or unauthorized advertising.",
          "Evade payments, resell access or file fraudulent chargebacks.",
        ],
      },
      {
        id: "content",
        title: "7. Your content and our content",
        paragraphs: [
          "You keep the rights to what you publish (comments, code, reviews, created items). You give us a free, worldwide license to host, display and adapt it within the service while it remains published.",
          "Courses, texts, exercises, graphics, characters, the software and the CodeBuddies brand belong to us or our licensors. You may use them to learn, but not copy, resell or redistribute them.",
          `If you believe any content infringes your rights, write to ${E}.`,
        ],
      },
      {
        id: "ads",
        title: "8. Advertising",
        paragraphs: [
          "Free accounts may see Google AdSense ads. Premium users see no ads. Personalized advertising is only shown if you accept it in the cookie banner.",
        ],
      },
      {
        id: "suspension",
        title: "9. Suspension and termination",
        paragraphs: [
          "If you breach these terms we may warn you, remove content, withdraw improperly obtained rewards, or suspend or close your account. In serious cases (fraud, harassment, attacks) we may do so without prior notice. If an account is closed for a breach, no refund is due for what has already been used.",
        ],
      },
      {
        id: "liability",
        title: "10. Warranties and liability",
        paragraphs: [
          "We do our best to keep the service working well and without interruption, but it may have failures or maintenance pauses. The service is provided \"as is\" and we do not guarantee specific job or academic outcomes.",
          "To the extent permitted by law, our total liability to you is limited to what you paid us in the 12 months before the event giving rise to it. Nothing here limits your rights under applicable consumer protection laws.",
        ],
      },
      {
        id: "law",
        title: "11. Governing law",
        paragraphs: [
          "These terms are governed by the laws of Colombia. If you are a consumer in another country (for example, in the European Union), you keep the protection of your country's mandatory laws and may use its courts.",
          `Before any formal claim, write to us at ${E}: most issues are solved that way.`,
        ],
      },
      {
        id: "changes",
        title: "12. Changes",
        paragraphs: [
          "We may update these terms. If a change is significant we will notify you in advance by email or within the platform. If you keep using CodeBuddies after the effective date, you accept them; if you disagree, you can close your account.",
        ],
      },
    ],
  },
  de: {
    title: "Allgemeine Geschäftsbedingungen",
    summary:
      "Diese Bedingungen regeln die Nutzung von CodeBuddies: Kursplattform, Spiel, Community und Käufe. Mit der Kontoerstellung oder Nutzung des Dienstes akzeptierst du sie. Lies sie zusammen mit der Datenschutzerklärung und der Rückerstattungsrichtlinie.",
    sections: [
      {
        id: "dienst",
        title: "1. Der Dienst",
        paragraphs: [
          "CodeBuddies bietet interaktive Programmierkurse, Übungen, Zertifikate, eine Multiplayer-Welt, soziale Funktionen (Freunde, Nachrichten, Community, Ranglisten) und Spielelemente wie XP, Münzen, Serien, Erfolge und einen Battle Pass. Ein Teil der Inhalte ist kostenlos, ein Teil kostenpflichtig.",
          "Wir können Funktionen verbessern, ändern oder einstellen. Stellen wir etwas ein, wofür du bezahlt und das du noch nicht nutzen konntest, bieten wir dir eine Alternative oder eine anteilige Erstattung an.",
        ],
      },
      {
        id: "konto",
        title: "2. Dein Konto",
        list: [
          "Deine Angaben müssen wahr sein und du musst dein Passwort sicher aufbewahren. Du bist für die Aktivitäten in deinem Konto verantwortlich.",
          "Das Konto ist persönlich: Verkaufe, verleihe oder teile es nicht.",
          "Wenn du jünger als 16 Jahre bist (in Kolumbien: 14), brauchst du die Zustimmung eines Erziehungsberechtigten, der diese Bedingungen für dich akzeptiert.",
          `Du kannst die Schließung deines Kontos jederzeit per E-Mail an ${E} verlangen.`,
        ],
      },
      {
        id: "zahlungen",
        title: "3. Tarife, Zahlungen und Verlängerung",
        paragraphs: [
          "Zahlungen wickelt Paddle.com als autorisierter Wiederverkäufer (Merchant of Record) ab: Paddle verkauft dir die Leistung, stellt die Rechnung aus, führt die anfallenden Steuern ab und übernimmt den Zahlungseinzug. Mit der Zahlung akzeptierst du auch die Käuferbedingungen von Paddle.",
        ],
        list: [
          "CodeBuddies Premium ist ein monatliches oder jährliches Abo, das sich am Ende jedes Zeitraums zum jeweils gültigen Preis automatisch verlängert, bis du kündigst.",
          "Du kannst jederzeit über „Abrechnung“ oder den Link in deinem Paddle-Beleg kündigen. Premium bleibt bis zum Ende des bezahlten Zeitraums aktiv.",
          "Preisänderungen deines Abos kündigen wir mindestens 30 Tage vorher an; der neue Preis gilt ab der nächsten Verlängerung und du kannst vorher kündigen.",
          "Einzelzertifikate sind eine einmalige Zahlung pro Kurs.",
          "Rückerstattungen richten sich nach der Rückerstattungsrichtlinie.",
        ],
      },
      {
        id: "muenzen",
        title: "4. Münzen und virtuelle Gegenstände",
        list: [
          "Münzen, XP, Gegenstände, Kosmetik, Möbel, Haustiere, Abzeichen und andere virtuelle Güter sind eine persönliche Nutzungslizenz innerhalb von CodeBuddies, kein Eigentum.",
          "Sie haben keinen Geldwert und können nicht in Geld umgetauscht oder außerhalb der Plattform übertragen werden, außer über von uns angebotene Tausch- oder Marktplatzfunktionen.",
          "Wir können offensichtlich falsche Guthaben oder Einträge korrigieren (z. B. nach einem technischen Fehler oder Missbrauch).",
          "Gekaufte Münzen verfallen nicht, solange dein Konto aktiv ist.",
        ],
      },
      {
        id: "zertifikate",
        title: "5. Zertifikate",
        paragraphs: [
          "Ein Zertifikat bestätigt, dass das Konto einen Kurs auf CodeBuddies abgeschlossen hat; es ist kein staatlicher oder akademischer Abschluss. Jedes Zertifikat hat einen öffentlichen Prüfcode. Durch Betrug, Täuschung oder Identitätsmissbrauch erlangte Zertifikate können wir widerrufen.",
        ],
      },
      {
        id: "regeln",
        title: "6. Nutzungsregeln",
        paragraphs: ["Nicht erlaubt ist:"],
        list: [
          "Belästigung, Drohungen, Diskriminierung oder sexuelle, gewalttätige, rechtswidrige oder rechtsverletzende Inhalte.",
          "Betrug: automatisierte Antworten, Ausnutzen von Fehlern, falsche Konten oder Empfehlungen, um Belohnungen zu erhalten.",
          "Angriffe auf den Dienst, Überlastung, massenhaftes Auslesen von Daten oder Zugriff auf fremde Konten.",
          "Hochladen von Schadcode, Spam oder nicht genehmigter Werbung.",
          "Umgehen von Zahlungen, Weiterverkauf von Zugängen oder betrügerische Rückbuchungen.",
        ],
      },
      {
        id: "inhalte",
        title: "7. Deine und unsere Inhalte",
        paragraphs: [
          "Du behältst die Rechte an deinen Inhalten (Kommentare, Code, Bewertungen, erstellte Objekte). Du räumst uns eine kostenlose, weltweite Lizenz ein, sie im Rahmen des Dienstes zu speichern, anzuzeigen und anzupassen, solange sie veröffentlicht sind.",
          "Kurse, Texte, Übungen, Grafiken, Figuren, die Software und die Marke CodeBuddies gehören uns oder unseren Lizenzgebern. Du darfst sie zum Lernen nutzen, aber nicht kopieren, weiterverkaufen oder verbreiten.",
          `Wenn du glaubst, dass Inhalte deine Rechte verletzen, schreib an ${E}.`,
        ],
      },
      {
        id: "werbung",
        title: "8. Werbung",
        paragraphs: [
          "Kostenlose Konten können Anzeigen von Google AdSense sehen. Premium-Nutzer sehen keine Werbung. Personalisierte Werbung wird nur angezeigt, wenn du sie im Cookie-Banner erlaubst.",
        ],
      },
      {
        id: "sperrung",
        title: "9. Sperrung und Kündigung",
        paragraphs: [
          "Bei Verstößen können wir dich verwarnen, Inhalte entfernen, unrechtmäßig erlangte Belohnungen zurücknehmen oder dein Konto sperren bzw. schließen. In schweren Fällen (Betrug, Belästigung, Angriffe) auch ohne Vorwarnung. Wird ein Konto wegen eines Verstoßes geschlossen, besteht kein Anspruch auf Erstattung bereits genutzter Leistungen.",
        ],
      },
      {
        id: "haftung",
        title: "10. Gewährleistung und Haftung",
        paragraphs: [
          "Wir bemühen uns um einen störungsfreien Betrieb, es kann jedoch zu Ausfällen oder Wartungspausen kommen. Wir garantieren keine bestimmten beruflichen oder schulischen Ergebnisse.",
          "Soweit gesetzlich zulässig, ist unsere Haftung auf den Betrag begrenzt, den du uns in den 12 Monaten vor dem schadensbegründenden Ereignis gezahlt hast. Unberührt bleiben die Haftung für Vorsatz, grobe Fahrlässigkeit und Personenschäden sowie deine zwingenden Verbraucherrechte.",
        ],
      },
      {
        id: "recht",
        title: "11. Anwendbares Recht",
        paragraphs: [
          "Es gilt kolumbianisches Recht. Als Verbraucher in einem anderen Land (z. B. in der EU) behältst du den Schutz der zwingenden Vorschriften deines Landes und kannst dessen Gerichte anrufen.",
          `Bevor du formell reklamierst, schreib uns an ${E} – die meisten Probleme lassen sich so lösen.`,
        ],
      },
      {
        id: "aenderungen",
        title: "12. Änderungen",
        paragraphs: [
          "Wir können diese Bedingungen aktualisieren. Über wesentliche Änderungen informieren wir dich vorab per E-Mail oder auf der Plattform. Nutzt du CodeBuddies nach dem Inkrafttreten weiter, gelten sie als akzeptiert; bist du nicht einverstanden, kannst du dein Konto schließen.",
        ],
      },
    ],
  },
};
