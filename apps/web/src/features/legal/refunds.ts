import { SUPPORT_EMAIL } from "@/config/site";
import type { LegalDocSet } from "./types";

const E = SUPPORT_EMAIL;

export const REFUND_POLICY: LegalDocSet = {
  es: {
    title: "Política de reembolsos",
    summary:
      "Queremos que compres tranquilo: tienes 14 días para pedir un reembolso en los casos que se explican abajo. Los pagos y devoluciones los procesa Paddle, nuestro revendedor autorizado.",
    sections: [
      {
        id: "suscripciones",
        title: "1. Suscripción Premium (mensual o anual)",
        list: [
          "Puedes pedir el reembolso completo dentro de los 14 días siguientes al primer cobro de tu suscripción.",
          "Las renovaciones también se pueden reembolsar dentro de los 14 días siguientes al cobro, si no usaste los beneficios Premium de ese nuevo período (por ejemplo, no generaste certificados con Premium ni reclamaste recompensas del track Premium).",
          "Si cancelas, no se cobra la siguiente renovación y conservas Premium hasta el final del período pagado.",
          "Pasados los 14 días no hay reembolsos por períodos parciales, salvo que la ley aplicable lo exija.",
        ],
      },
      {
        id: "monedas",
        title: "2. Paquetes de monedas",
        list: [
          "Se reembolsan dentro de los 14 días siguientes a la compra solo si las monedas del paquete no se gastaron.",
          "Si gastaste una parte, podemos reembolsar la parte no usada de forma proporcional.",
        ],
      },
      {
        id: "certificados",
        title: "3. Certificados individuales",
        list: [
          "Se reembolsan dentro de los 14 días siguientes a la compra si el certificado todavía no se emitió.",
          "Una vez emitido (y por lo tanto verificable públicamente), el certificado no es reembolsable, salvo cobro duplicado o error nuestro.",
        ],
      },
      {
        id: "siempre",
        title: "4. Casos que siempre reembolsamos",
        list: [
          "Cobros duplicados o por error.",
          "Compras que no pudiste recibir o usar por una falla nuestra que no solucionamos en un plazo razonable.",
          "Cobros que no reconoces: escríbenos antes de iniciar un contracargo con tu banco, así lo resolvemos más rápido.",
        ],
      },
      {
        id: "como",
        title: "5. Cómo pedir un reembolso",
        paragraphs: [
          `Escríbenos a ${E} desde el correo de tu cuenta indicando: el producto, la fecha de compra, el número de pedido de Paddle (aparece en el recibo) y el motivo. También puedes pedirlo directamente a Paddle desde el enlace de tu recibo.`,
          "Respondemos en un máximo de 5 días hábiles. Si aprobamos el reembolso, Paddle lo devuelve al mismo medio de pago; según tu banco puede tardar entre 5 y 10 días hábiles en verse reflejado. Al reembolsarse se retira el beneficio comprado (Premium, monedas o certificado).",
        ],
      },
      {
        id: "abuso",
        title: "6. Abuso",
        paragraphs: [
          "Podemos rechazar reembolsos repetidos o abusivos (por ejemplo, comprar, usar y pedir la devolución varias veces). Los contracargos fraudulentos pueden llevar a la suspensión de la cuenta.",
        ],
      },
      {
        id: "ue",
        title: "7. Consumidores de la Unión Europea",
        paragraphs: [
          "Tienes un derecho legal de desistimiento de 14 días para contratos a distancia. Al empezar a usar un contenido digital de inmediato (por ejemplo, activar Premium o emitir un certificado) aceptas que ese derecho puede perderse para lo ya entregado, en los términos de la Directiva 2011/83/UE. Esta política nunca limita los derechos que te da la ley.",
        ],
      },
      {
        id: "colombia",
        title: "8. Consumidores en Colombia",
        paragraphs: [
          "Además de esta política, conservas el derecho de retracto de 5 días hábiles (Ley 1480, art. 47) y el derecho a pedir la reversión del pago con tarjeta en los casos del art. 51 (fraude, operación no solicitada, producto no recibido o defectuoso) dentro de los 5 días hábiles siguientes a conocer el hecho, avisándonos a nosotros y al emisor de tu medio de pago.",
        ],
      },
    ],
  },
  en: {
    title: "Refund policy",
    summary:
      "We want you to buy with confidence: you have 14 days to request a refund in the cases described below. Payments and refunds are processed by Paddle, our authorized reseller.",
    sections: [
      {
        id: "subscriptions",
        title: "1. Premium subscription (monthly or yearly)",
        list: [
          "You can request a full refund within 14 days of the first charge of your subscription.",
          "Renewals can also be refunded within 14 days of the charge if you did not use the Premium benefits of that new period (for example, you did not generate certificates with Premium or claim Premium track rewards).",
          "If you cancel, the next renewal is not charged and you keep Premium until the end of the paid period.",
          "After 14 days there are no refunds for partial periods, unless required by applicable law.",
        ],
      },
      {
        id: "coins",
        title: "2. Coin packs",
        list: [
          "Refundable within 14 days of purchase only if the pack's coins have not been spent.",
          "If you spent part of them, we may refund the unused part proportionally.",
        ],
      },
      {
        id: "certificates",
        title: "3. Individual certificates",
        list: [
          "Refundable within 14 days of purchase if the certificate has not been issued yet.",
          "Once issued (and therefore publicly verifiable), a certificate is not refundable, except for duplicate charges or our own error.",
        ],
      },
      {
        id: "always",
        title: "4. Cases we always refund",
        list: [
          "Duplicate or mistaken charges.",
          "Purchases you could not receive or use due to a failure on our side that we did not fix within a reasonable time.",
          "Charges you don't recognize: write to us before starting a chargeback with your bank so we can solve it faster.",
        ],
      },
      {
        id: "how",
        title: "5. How to request a refund",
        paragraphs: [
          `Write to ${E} from your account's email with: the product, the purchase date, the Paddle order number (shown on the receipt) and the reason. You can also request it directly from Paddle via the link in your receipt.`,
          "We reply within 5 business days. If approved, Paddle returns the money to the same payment method; depending on your bank it may take 5 to 10 business days to appear. When refunded, the purchased benefit (Premium, coins or certificate) is removed.",
        ],
      },
      {
        id: "abuse",
        title: "6. Abuse",
        paragraphs: [
          "We may decline repeated or abusive refund requests (for example, buying, using and asking for a refund several times). Fraudulent chargebacks may lead to account suspension.",
        ],
      },
      {
        id: "eu",
        title: "7. European Union consumers",
        paragraphs: [
          "You have a statutory 14-day right of withdrawal for distance contracts. By starting to use digital content immediately (for example, activating Premium or issuing a certificate) you acknowledge that this right may be lost for what has already been supplied, under Directive 2011/83/EU. This policy never limits your statutory rights.",
        ],
      },
      {
        id: "colombia",
        title: "8. Consumers in Colombia",
        paragraphs: [
          "In addition to this policy, you keep the 5-business-day right of withdrawal (Law 1480, art. 47) and the right to request a card payment reversal in the cases of art. 51 (fraud, unsolicited transaction, product not received or defective) within 5 business days of learning of the event, notifying both us and your card issuer.",
        ],
      },
    ],
  },
  de: {
    title: "Rückerstattungsrichtlinie",
    summary:
      "Du sollst entspannt kaufen können: In den unten beschriebenen Fällen hast du 14 Tage Zeit, eine Erstattung zu verlangen. Zahlungen und Erstattungen wickelt Paddle ab, unser autorisierter Wiederverkäufer.",
    sections: [
      {
        id: "abos",
        title: "1. Premium-Abo (monatlich oder jährlich)",
        list: [
          "Innerhalb von 14 Tagen nach der ersten Abbuchung kannst du die volle Erstattung verlangen.",
          "Auch Verlängerungen werden innerhalb von 14 Tagen nach der Abbuchung erstattet, wenn du die Premium-Vorteile des neuen Zeitraums nicht genutzt hast (z. B. keine Zertifikate über Premium erstellt und keine Premium-Belohnungen abgeholt).",
          "Nach einer Kündigung wird die nächste Verlängerung nicht berechnet; Premium bleibt bis zum Ende des bezahlten Zeitraums aktiv.",
          "Nach Ablauf der 14 Tage gibt es keine anteiligen Erstattungen, sofern das Gesetz nichts anderes vorschreibt.",
        ],
      },
      {
        id: "muenzen",
        title: "2. Münzpakete",
        list: [
          "Erstattung innerhalb von 14 Tagen nach dem Kauf nur, wenn die Münzen des Pakets nicht ausgegeben wurden.",
          "Wurde ein Teil ausgegeben, können wir den ungenutzten Teil anteilig erstatten.",
        ],
      },
      {
        id: "zertifikate",
        title: "3. Einzelzertifikate",
        list: [
          "Erstattung innerhalb von 14 Tagen nach dem Kauf, solange das Zertifikat noch nicht ausgestellt wurde.",
          "Ein ausgestelltes (und damit öffentlich prüfbares) Zertifikat wird nicht erstattet, außer bei doppelter Abbuchung oder eigenem Fehler.",
        ],
      },
      {
        id: "immer",
        title: "4. Fälle, die wir immer erstatten",
        list: [
          "Doppelte oder fehlerhafte Abbuchungen.",
          "Käufe, die du wegen eines Fehlers auf unserer Seite, den wir nicht in angemessener Zeit behoben haben, nicht erhalten oder nutzen konntest.",
          "Abbuchungen, die du nicht erkennst: Schreib uns, bevor du eine Rückbuchung bei deiner Bank veranlasst – so geht es schneller.",
        ],
      },
      {
        id: "antrag",
        title: "5. So beantragst du eine Erstattung",
        paragraphs: [
          `Schreib von der E-Mail-Adresse deines Kontos an ${E} mit: Produkt, Kaufdatum, Paddle-Bestellnummer (steht auf dem Beleg) und Grund. Du kannst die Erstattung auch direkt bei Paddle über den Link in deinem Beleg beantragen.`,
          "Wir antworten innerhalb von 5 Werktagen. Bei Genehmigung erstattet Paddle den Betrag auf dasselbe Zahlungsmittel; je nach Bank dauert es 5 bis 10 Werktage. Mit der Erstattung entfällt die gekaufte Leistung (Premium, Münzen oder Zertifikat).",
        ],
      },
      {
        id: "missbrauch",
        title: "6. Missbrauch",
        paragraphs: [
          "Wiederholte oder missbräuchliche Erstattungsanträge (z. B. mehrfach kaufen, nutzen und zurückfordern) können wir ablehnen. Betrügerische Rückbuchungen können zur Sperrung des Kontos führen.",
        ],
      },
      {
        id: "widerruf",
        title: "7. Widerrufsrecht für Verbraucher in der EU",
        paragraphs: [
          "Dir steht ein gesetzliches 14-tägiges Widerrufsrecht für Fernabsatzverträge zu. Wenn du digitale Inhalte sofort nutzt (z. B. Premium aktivierst oder ein Zertifikat ausstellen lässt), erkennst du an, dass dieses Recht für bereits bereitgestellte Leistungen gemäß Richtlinie 2011/83/EU erlöschen kann. Diese Richtlinie schränkt deine gesetzlichen Rechte nie ein.",
        ],
      },
      {
        id: "kolumbien",
        title: "8. Verbraucher in Kolumbien",
        paragraphs: [
          "Zusätzlich zu dieser Richtlinie gilt das 5-tägige Widerrufsrecht (Gesetz 1480, Art. 47) und das Recht auf Zahlungsrückabwicklung in den Fällen des Art. 51 innerhalb von 5 Werktagen, nachdem du vom Vorfall erfahren hast.",
        ],
      },
    ],
  },
};
