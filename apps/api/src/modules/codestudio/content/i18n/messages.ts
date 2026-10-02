// Textos que arma el servidor de CodeStudio (errores, actividad, post-mortem).
// Cada mensaje tiene sus 3 idiomas juntos para que nunca queden desparejos.
import { L } from './localized';

const $ = (value: number) => `$${Math.round(value).toLocaleString('es-CO')}`;

export const MSG = {
  // ── Errores ──────────────────────────────────────────────────────────
  nameLength: () => L('El nombre debe tener entre 3 y 40 caracteres.', 'The name must be 3 to 40 characters long.', 'Der Name muss 3 bis 40 Zeichen lang sein.'),
  appTypeUnavailable: () => L('Ese tipo de app no está disponible.', 'That app type is not available.', 'Dieser App-Typ ist nicht verfügbar.'),
  appTypeLocked: (app: string, min: number, level: number) =>
    L(
      `${app} se desbloquea en nivel ${min}. Tú eres nivel ${level}: sube estudiando o jugando.`,
      `${app} unlocks at level ${min}. You are level ${level}: level up by studying or playing.`,
      `${app} wird ab Level ${min} freigeschaltet. Du bist Level ${level}: steig durch Lernen oder Spielen auf.`,
    ),
  tooManyCompanies: (max: number) =>
    L(
      `Puedes tener hasta ${max} empresas activas a la vez. Cierra una desde Ajustes.`,
      `You can have up to ${max} active companies at once. Close one from Settings.`,
      `Du kannst bis zu ${max} aktive Firmen gleichzeitig haben. Schließe eine in den Einstellungen.`,
    ),
  featureUnavailable: () => L('Esa feature no está disponible.', 'That feature is not available.', 'Dieses Feature ist nicht verfügbar.'),
  featureInstalled: () => L('Ya construiste esta feature.', 'You already built this feature.', 'Dieses Feature hast du schon gebaut.'),
  featureInProgress: () => L('Esta feature ya está en desarrollo.', 'This feature is already in development.', 'Dieses Feature ist schon in Entwicklung.'),
  queueFull: (max: number) =>
    L(
      `Tu equipo ya tiene ${max} features en cola. Espera a que terminen o contrata más gente.`,
      `Your team already has ${max} features queued. Wait for them to finish or hire more people.`,
      `Dein Team hat schon ${max} Features in der Warteschlange. Warte, bis sie fertig sind, oder stell mehr Leute ein.`,
    ),
  unlocksAtStage: (stage: string) => L(`Se desbloquea en la etapa ${stage}.`, `Unlocks at the ${stage} stage.`, `Wird in der Stufe ${stage} freigeschaltet.`),
  needsFirst: (names: string) => L(`Primero necesitas: ${names}`, `First you need: ${names}`, `Zuerst brauchst du: ${names}`),
  taskNotFound: () => L('Esa tarea no está en desarrollo.', 'That task is not in development.', 'Diese Aufgabe ist nicht in Entwicklung.'),
  roleUnavailable: () => L('Ese rol no está disponible.', 'That role is not available.', 'Diese Rolle ist nicht verfügbar.'),
  maxEmployees: (max: number) => L(`Máximo ${max} empleados.`, `Maximum ${max} employees.`, `Maximal ${max} Mitarbeiter.`),
  employeeNotFound: () => L('Empleado no encontrado.', 'Employee not found.', 'Mitarbeiter nicht gefunden.'),
  hostingUnavailable: () => L('Ese servidor no está disponible.', 'That server is not available.', 'Dieser Server ist nicht verfügbar.'),
  maxLevel: () => L('Ya está al nivel máximo.', 'It is already at max level.', 'Schon auf maximalem Level.'),
  campaignUnavailable: () => L('Esa campaña no está disponible.', 'That campaign is not available.', 'Diese Kampagne ist nicht verfügbar.'),
  invalidBudget: () => L('Presupuesto inválido.', 'Invalid budget.', 'Ungültiges Budget.'),
  appOffline: () =>
    L(
      'Tu app no está en línea: los usuarios llegarían a una página caída. Instala un servidor primero.',
      'Your app is not online: users would land on a dead page. Install a server first.',
      'Deine App ist nicht online: Nutzer würden auf einer toten Seite landen. Installiere zuerst einen Server.',
    ),
  quoteFailed: () => L('No se pudo cotizar la campaña.', 'Could not quote the campaign.', 'Die Kampagne konnte nicht kalkuliert werden.'),
  bugNotFound: () => L('Ese bug no existe o ya está resuelto.', 'That bug does not exist or is already fixed.', 'Dieser Bug existiert nicht oder ist schon behoben.'),
  bugTaken: () => L('Alguien de tu equipo ya está trabajando en este bug.', 'Someone on your team is already working on this bug.', 'Jemand aus deinem Team arbeitet schon an diesem Bug.'),
  bugLegacy: () =>
    L(
      'Este bug es del sistema anterior: arréglalo con tu equipo o una consultora.',
      'This bug is from the old system: fix it with your team or a consultancy.',
      'Dieser Bug stammt aus dem alten System: behebe ihn mit deinem Team oder einer Beratung.',
    ),
  pickOption: () => L('Elige una de las opciones.', 'Pick one of the options.', 'Wähle eine der Optionen.'),
  notTechnical: (role: string) =>
    L(
      `${role} no tiene el perfil técnico. Necesitas Backend, FullStack, DevOps, QA o Data Scientist.`,
      `${role} doesn't have the technical profile. You need Backend, FullStack, DevOps, QA or Data Scientist.`,
      `${role} hat nicht das technische Profil. Du brauchst Backend, FullStack, DevOps, QA oder Data Scientist.`,
    ),
  employeeBusy: (name: string) => L(`${name} ya está arreglando otro bug.`, `${name} is already fixing another bug.`, `${name} behebt schon einen anderen Bug.`),
  diagnoseNeedsCash: (amount: number) =>
    L(
      `Necesitas ${$(amount)} para que tu equipo aplique el arreglo.`,
      `You need ${$(amount)} for your team to apply the fix.`,
      `Du brauchst ${$(amount)}, damit dein Team die Lösung umsetzt.`,
    ),
  decisionNotFound: () => L('Esa decisión no existe.', 'That decision does not exist.', 'Diese Entscheidung existiert nicht.'),
  decisionTaken: () => L('Ya tomaste esta decisión.', 'You already made this decision.', 'Diese Entscheidung hast du schon getroffen.'),
  decisionUnknown: () => L('Decisión desconocida.', 'Unknown decision.', 'Unbekannte Entscheidung.'),
  invalidChoice: () => L('Opción inválida.', 'Invalid option.', 'Ungültige Option.'),
  noMoreRounds: () => L('Ya levantaste todas las rondas disponibles.', 'You have raised every available round.', 'Du hast alle verfügbaren Runden eingesammelt.'),
  investorsWantStage: (round: string, stage: string) =>
    L(
      `Los inversores de ${round} esperan que llegues a la etapa ${stage}.`,
      `${round} investors expect you to reach the ${stage} stage.`,
      `Die Investoren der Runde ${round} erwarten, dass du die Stufe ${stage} erreichst.`,
    ),
  investorsWantRating: (rating: string, min: number) =>
    L(
      `Ningún inversor apuesta por una app con rating ${rating}. Súbelo a ${min}+.`,
      `No investor bets on an app rated ${rating}. Raise it to ${min}+.`,
      `Kein Investor setzt auf eine App mit Bewertung ${rating}. Bring sie auf ${min}+.`,
    ),
  roundClosed: () => L('Esa ronda ya se cerró.', 'That round is already closed.', 'Diese Runde ist schon abgeschlossen.'),
  invalidPrice: () => L('Nivel de precio inválido.', 'Invalid price level.', 'Ungültige Preisstufe.'),
  notEnoughCash: () => L('Fondos insuficientes.', 'Not enough cash.', 'Nicht genug Geld.'),
  companyNotFound: () => L('Empresa no encontrada.', 'Company not found.', 'Firma nicht gefunden.'),
  notYourCompany: () => L('No puedes acceder a esta empresa.', "You can't access this company.", 'Du hast keinen Zugriff auf diese Firma.'),
  companyFailed: () => L('Esta empresa quebró. Funda una nueva.', 'This company went bankrupt. Found a new one.', 'Diese Firma ist pleite. Gründe eine neue.'),

  // ── Actividad ────────────────────────────────────────────────────────
  welcomeTitle: () => L('Bienvenido, CEO', 'Welcome, CEO', 'Willkommen, CEO'),
  welcomeText: (cash: number) =>
    L(
      `Tienes ${$(cash)} y una idea. Construye tu MVP en el Árbol: Landing page → Registro y login → Funcionalidad principal. Cada minuto real es un día en tu startup.`,
      `You have ${$(cash)} and an idea. Build your MVP in the Tree: Landing page → Sign-up and login → Core feature. Every real minute is a day in your startup.`,
      `Du hast ${$(cash)} und eine Idee. Bau dein MVP im Baum: Landingpage → Registrierung und Login → Kernfunktion. Jede echte Minute ist ein Tag in deinem Startup.`,
    ),
  cancelledTitle: (name: string) => L(`Cancelaste ${name}`, `You cancelled ${name}`, `Du hast ${name} abgebrochen`),
  cancelledText: (refund: number) =>
    L(
      `Recuperaste ${$(refund)} (la mitad). El trabajo hecho se pierde.`,
      `You got back ${$(refund)} (half). The work done is lost.`,
      `Du hast ${$(refund)} (die Hälfte) zurückbekommen. Die geleistete Arbeit ist verloren.`,
    ),
  hiredTitle: (name: string, role: string) => L(`Contrataste a ${name} (${role})`, `You hired ${name} (${role})`, `Du hast ${name} (${role}) eingestellt`),
  hiredText: (bonus: number, salary: number) =>
    L(
      `Bono de contratación ${$(bonus)}. Sueldo: ${$(salary)}/mes (${$(salary / 30)} por día).`,
      `Hiring bonus ${$(bonus)}. Salary: ${$(salary)}/month (${$(salary / 30)} per day).`,
      `Einstellungsbonus ${$(bonus)}. Gehalt: ${$(salary)}/Monat (${$(salary / 30)} pro Tag).`,
    ),
  firedTitle: (name: string) => L(`${name} dejó la empresa`, `${name} left the company`, `${name} hat die Firma verlassen`),
  firedText: (severance: number, salary: number) =>
    L(
      `Indemnización: ${$(severance)}. Ahorras ${$(salary)}/mes.`,
      `Severance: ${$(severance)}. You save ${$(salary)}/month.`,
      `Abfindung: ${$(severance)}. Du sparst ${$(salary)}/Monat.`,
    ),
  hostingUpgraded: (name: string, level: number) => L(`${name} mejorado a nivel ${level}`, `${name} upgraded to level ${level}`, `${name} auf Level ${level} verbessert`),
  hostingInstalled: (name: string) => L(`${name} instalado`, `${name} installed`, `${name} installiert`),
  hostingText: (capacity: number, monthly: number) =>
    L(
      `Capacidad +${capacity.toLocaleString('es-CO')} usuarios. Cuesta ${$(monthly)}/mes por nivel.`,
      `Capacity +${capacity.toLocaleString('en-US')} users. Costs ${$(monthly)}/month per level.`,
      `Kapazität +${capacity.toLocaleString('de-DE')} Nutzer. Kostet ${$(monthly)}/Monat pro Level.`,
    ),
  campaignTitle: (channel: string, users: number) => L(`Campaña en ${channel}: +${users} usuarios`, `${channel} campaign: +${users} users`, `Kampagne auf ${channel}: +${users} Nutzer`),
  campaignLosing: (cost: number, cac: number, ltv: number) =>
    L(
      `Pagaste ${$(cost)}. Cada usuario te costó ${$(cac)} pero solo te deja ~${$(ltv)} en su vida (LTV). Estás comprando usuarios a pérdida.`,
      `You paid ${$(cost)}. Each user cost ${$(cac)} but only brings ~${$(ltv)} over their lifetime (LTV). You are buying users at a loss.`,
      `Du hast ${$(cost)} bezahlt. Jeder Nutzer kostete ${$(cac)}, bringt aber nur ~${$(ltv)} über seine Lebenszeit (LTV). Du kaufst Nutzer mit Verlust.`,
    ),
  campaignWinning: (cost: number, cac: number, ltv: number) =>
    L(
      `Pagaste ${$(cost)}. Cada usuario te costó ${$(cac)} y te deja ~${$(ltv)} (LTV). Buen negocio.`,
      `You paid ${$(cost)}. Each user cost ${$(cac)} and brings ~${$(ltv)} (LTV). Good deal.`,
      `Du hast ${$(cost)} bezahlt. Jeder Nutzer kostete ${$(cac)} und bringt ~${$(ltv)} (LTV). Gutes Geschäft.`,
    ),
  campaignNoRevenue: (cost: number) =>
    L(
      `Pagaste ${$(cost)}. Todavía no cobras nada: estos usuarios no te dejan dinero hasta que tengas monetización.`,
      `You paid ${$(cost)}. You don't charge anything yet: these users bring no money until you have monetization.`,
      `Du hast ${$(cost)} bezahlt. Du verlangst noch nichts: diese Nutzer bringen erst Geld, wenn du monetarisierst.`,
    ),
  bugFixedTitle: (title: string) => L(`Bug resuelto: ${title}`, `Bug fixed: ${title}`, `Bug behoben: ${title}`),
  bugFixedText: (lesson: string, hint: string, xp: number) => L(`${lesson}${hint ? ` ${hint}` : ''} (+${xp} XP)`, `${lesson}${hint ? ` ${hint}` : ''} (+${xp} XP)`, `${lesson}${hint ? ` ${hint}` : ''} (+${xp} XP)`),
  consultantTitle: (title: string) => L(`Una consultora arregló: ${title}`, `A consultancy fixed: ${title}`, `Eine Beratung hat behoben: ${title}`),
  consultantText: (cost: number, lesson: string) =>
    L(
      `Pagaste ${$(cost)}.${lesson ? ` Te dejaron una nota: "${lesson}"` : ''}`,
      `You paid ${$(cost)}.${lesson ? ` They left you a note: "${lesson}"` : ''}`,
      `Du hast ${$(cost)} bezahlt.${lesson ? ` Sie haben dir eine Notiz hinterlassen: "${lesson}"` : ''}`,
    ),
  employeeFixedTitle: (name: string, title: string) => L(`${name} arregló: ${title}`, `${name} fixed: ${title}`, `${name} hat behoben: ${title}`),
  employeeFixedText: (lesson: string) =>
    L(
      lesson ? `Lo que aprendió el equipo: ${lesson}` : 'Bug resuelto.',
      lesson ? `What the team learned: ${lesson}` : 'Bug fixed.',
      lesson ? `Was das Team gelernt hat: ${lesson}` : 'Bug behoben.',
    ),
  yourTeam: () => L('Tu equipo', 'Your team', 'Dein Team'),
  roundTitle: (round: string, raise: number) => L(`Ronda ${round} cerrada: +${$(raise)}`, `${round} round closed: +${$(raise)}`, `Runde ${round} abgeschlossen: +${$(raise)}`),
  roundText: (equity: number, remaining: string) =>
    L(
      `Vendiste el ${equity}% de la empresa. Ahora eres dueño del ${remaining}%. Más caja para crecer, pero cada ronda te diluye.`,
      `You sold ${equity}% of the company. You now own ${remaining}%. More cash to grow, but every round dilutes you.`,
      `Du hast ${equity}% der Firma verkauft. Dir gehören jetzt ${remaining}%. Mehr Geld zum Wachsen, aber jede Runde verwässert deinen Anteil.`,
    ),
  priceTitle: (label: string) => L(`Nuevo precio: ${label}`, `New price: ${label}`, `Neuer Preis: ${label}`),
  priceUp: () => L('Cobras más por usuario, pero algunos se irán y llegarán menos.', 'You charge more per user, but some will leave and fewer will arrive.', 'Du verlangst mehr pro Nutzer, aber einige gehen und weniger kommen.'),
  priceDown: () => L('Cobras menos por usuario, pero se quedan más y llegan más.', 'You charge less per user, but more stay and more arrive.', 'Du verlangst weniger pro Nutzer, aber mehr bleiben und mehr kommen.'),
  priceNormal: () => L('Precio de mercado.', 'Market price.', 'Marktpreis.'),
  releaseTitle: (name: string) => L(`En producción: ${name}`, `Live: ${name}`, `Live: ${name}`),
  releaseText: (lesson: string, xp: number) => L(`${lesson} (+${xp} XP)`, `${lesson} (+${xp} XP)`, `${lesson} (+${xp} XP)`),
  decisionExpired: (name: string) => L(`No decidiste a tiempo: ${name}`, `You didn't decide in time: ${name}`, `Nicht rechtzeitig entschieden: ${name}`),
  decisionTakenLog: () => L('Decisión tomada', 'Decision made', 'Entscheidung getroffen'),
  debtTitle: () => L('Números rojos', 'In the red', 'Im Minus'),
  debtText: (days: number) =>
    L(
      `Tu caja está en negativo. Tienes ${days} días (minutos) para volver a positivo o la empresa quiebra. Opciones: despedir gente, subir precios, levantar inversión o vender más.`,
      `Your cash is negative. You have ${days} days (minutes) to get back to positive or the company goes bankrupt. Options: let people go, raise prices, raise funding or sell more.`,
      `Deine Kasse ist im Minus. Du hast ${days} Tage (Minuten), um wieder ins Plus zu kommen, sonst ist die Firma pleite. Optionen: Leute entlassen, Preise erhöhen, Kapital einsammeln oder mehr verkaufen.`,
    ),
  stageTitle: (name: string) => L(`¡Nueva etapa: ${name}!`, `New stage: ${name}!`, `Neue Stufe: ${name}!`),
  stageReward: (cash: number) => L(` Una aceleradora te premia con ${$(cash)}.`, ` An accelerator rewards you with ${$(cash)}.`, ` Ein Accelerator belohnt dich mit ${$(cash)}.`),
  failedTitle: () => L('Tu startup quebró', 'Your startup went bankrupt', 'Dein Startup ist pleite'),
  newBugTitle: (title: string) => L(`Nuevo bug: ${title}`, `New bug: ${title}`, `Neuer Bug: ${title}`),
  newBugText: (symptom: string) => L(`${symptom} Diagnostícalo en la pestaña Bugs.`, `${symptom} Diagnose it in the Bugs tab.`, `${symptom} Diagnostiziere ihn im Tab Bugs.`),
  legacyTitle: () => L('CodeStudio 2.0', 'CodeStudio 2.0', 'CodeStudio 2.0'),
  legacyText: () =>
    L(
      'Llegó una economía nueva: 1 minuto = 1 día, sin monetización no hay ingresos, si la caja queda en rojo 7 días quiebras, y los bugs se resuelven diagnosticándolos. Tus features anteriores siguen instaladas; el nuevo Árbol está en la pestaña Árbol.',
      'A new economy arrived: 1 minute = 1 day, no monetization means no revenue, 7 days in the red and you go bankrupt, and bugs are fixed by diagnosing them. Your previous features are still installed; the new Tree is in the Tree tab.',
      'Eine neue Wirtschaft ist da: 1 Minute = 1 Tag, ohne Monetarisierung keine Einnahmen, 7 Tage im Minus bedeuten Pleite, und Bugs behebt man durch Diagnose. Deine bisherigen Features bleiben installiert; der neue Baum ist im Tab Baum.',
    ),
  levelUpTitle: (level: number) => L(`¡Subiste a nivel ${level}!`, `You reached level ${level}!`, `Du hast Level ${level} erreicht!`),
  levelUpText: (bonus: number) =>
    L(
      `Tu próxima startup arrancará con ${$(bonus)} extra.`,
      `Your next startup will start with ${$(bonus)} extra.`,
      `Dein nächstes Startup startet mit ${$(bonus)} extra.`,
    ),
  achievementTitle: (name: string) => L(`Logro: ${name}`, `Achievement: ${name}`, `Erfolg: ${name}`),
  rewardSuffix: (xp: number, coins: number) => L(` +${xp} XP${coins > 0 ? ` · +${coins} coins` : ''}`, ` +${xp} XP${coins > 0 ? ` · +${coins} coins` : ''}`, ` +${xp} XP${coins > 0 ? ` · +${coins} Coins` : ''}`),
  dailyTitle: (label: string) => L(`Misión diaria cumplida: ${label}`, `Daily mission complete: ${label}`, `Tagesmission geschafft: ${label}`),
  dailyAllTitle: () => L('¡Completaste las 3 misiones de hoy!', 'You completed all 3 missions today!', 'Du hast heute alle 3 Missionen geschafft!'),
  dailyAllText: () => L('Bono diario. Mañana hay misiones nuevas.', 'Daily bonus. New missions tomorrow.', 'Tagesbonus. Morgen gibt es neue Missionen.'),

  // ── Post-mortem ──────────────────────────────────────────────────────
  pmBurn: (costs: number, salaries: number, infra: number, revenue: number) =>
    L(
      `Gastabas ${$(costs)} por día (sueldos ${$(salaries)}, servidores ${$(infra)}) y entraban ${$(revenue)}.`,
      `You were spending ${$(costs)} per day (salaries ${$(salaries)}, servers ${$(infra)}) and bringing in ${$(revenue)}.`,
      `Du hast ${$(costs)} pro Tag ausgegeben (Gehälter ${$(salaries)}, Server ${$(infra)}) und ${$(revenue)} eingenommen.`,
    ),
  pmNoMonetization: () =>
    L(
      'Nunca construiste una forma de cobrar: sin la rama Monetización, los usuarios no dejan dinero.',
      'You never built a way to charge: without the Monetization branch, users bring no money.',
      'Du hast nie eine Bezahlmöglichkeit gebaut: ohne den Zweig Monetarisierung bringen Nutzer kein Geld.',
    ),
  pmOverhired: () =>
    L(
      'Contrataste más rápido de lo que crecían tus ingresos. Cada sueldo es un compromiso diario.',
      'You hired faster than your revenue grew. Every salary is a daily commitment.',
      'Du hast schneller eingestellt, als deine Einnahmen wuchsen. Jedes Gehalt ist eine tägliche Verpflichtung.',
    ),
  pmChurn: (churn: string) =>
    L(
      `Tus usuarios se iban rápido (${churn}% por día): mejora la satisfacción y la retención.`,
      `Your users were leaving fast (${churn}% per day): improve satisfaction and retention.`,
      `Deine Nutzer gingen schnell (${churn}% pro Tag): verbessere Zufriedenheit und Bindung.`,
    ),
  pmNoFunding: () => L('Podías levantar una ronda de inversión y no lo hiciste.', 'You could have raised a funding round and didn’t.', 'Du hättest eine Finanzierungsrunde einsammeln können und hast es nicht getan.'),
  pmKept: () =>
    L(
      'Tu nivel y tus logros se conservan: la próxima arranca con más caja.',
      'Your level and achievements stay: the next one starts with more cash.',
      'Dein Level und deine Erfolge bleiben: das nächste Startup beginnt mit mehr Geld.',
    ),
};
