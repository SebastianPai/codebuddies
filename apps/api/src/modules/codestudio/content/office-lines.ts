// Lo que dice cada empleado en la oficina: según su rol, lo que hizo
// (el bug que arregló, el que está arreglando, el que causó), su rasgo y su
// ánimo del momento (cansado, bravo, contento). No todo es bueno: también se
// quejan cuando la empresa va mal.

import { L, Localized } from './i18n/localized';
import type { OfficeContext } from './office';

export type Mood = 'happy' | 'normal' | 'tired' | 'angry';

export type EmployeeLineInput = {
  id: string;
  roleSlug: string;
  traitKey: string;
  motivation: number;
  stress: number;
  /** Minutos en el equipo (1 minuto real = 1 día de juego). */
  minutesInTeam: number;
  seated: boolean;
  bugsCaused: number;
  /** Bug que terminó de arreglar hace poco. */
  fixedBug: string | null;
  /** Bug que está arreglando ahora. */
  fixingBug: string | null;
};

export type EmployeeLineContext = OfficeContext & { rating: number; hasCoffee: boolean; deal?: { name: string; discount: number } | null };

const MOOD_WINDOW_MS = 10 * 60_000;

function hash(text: string) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index++) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return Math.abs(value);
}

/**
 * Ánimo de un empleado: cambia cada 10 minutos y es el mismo para todos los
 * que miran la oficina en ese rato. Sin puesto, sin café, con estrés o con la
 * caja en rojo es más fácil que llegue cansado o bravo.
 */
export function moodOf(employee: EmployeeLineInput, ctx: EmployeeLineContext, now = Date.now()): Mood {
  const roll = hash(`${employee.id}:${Math.floor(now / MOOD_WINDOW_MS)}`) % 100;
  let angry = 6;
  let tired = 10;
  if (!employee.seated) angry += 25;
  if (ctx.cash < ctx.dailyCosts * 5) angry += 15;
  if (employee.traitKey === 'unmotivated') angry += 12;
  if (employee.stress > 50) tired += 20;
  if (!ctx.hasCoffee) tired += 8;
  if (ctx.openBugs >= 3) tired += 8;
  if (roll < angry) return 'angry';
  if (roll < angry + tired) return 'tired';
  const happy = employee.traitKey === 'star' || employee.motivation >= 85 ? 45 : 20;
  if (roll < angry + tired + happy) return 'happy';
  return 'normal';
}

const MOOD_LINES: Record<Exclude<Mood, 'normal'>, Localized[]> = {
  tired: [
    L('Vengo con sueño... anoche me quedé hasta tarde con el deploy.', 'I came in tired... I stayed up late with the deploy.', 'Ich bin müde... ich war gestern lange wegen des Deploys wach.'),
    L('Necesito un café. O tres.', 'I need a coffee. Or three.', 'Ich brauche einen Kaffee. Oder drei.'),
    L('Dormí cuatro horas, no me pidan nada difícil hoy.', "I slept four hours, don't ask me for anything hard today.", 'Ich habe vier Stunden geschlafen, verlangt heute nichts Schweres.'),
  ],
  angry: [
    L('Hoy no me hablen: el build falló cinco veces.', "Don't talk to me today: the build failed five times.", 'Sprecht mich heute nicht an: Der Build ist fünfmal fehlgeschlagen.'),
    L('Otra reunión que pudo ser un correo...', 'Another meeting that could have been an email...', 'Noch ein Meeting, das eine E-Mail hätte sein können...'),
    L('Alguien hizo push directo a main. Otra vez.', 'Someone pushed straight to main. Again.', 'Jemand hat direkt auf main gepusht. Schon wieder.'),
  ],
  happy: [
    L('¡Hoy me siento imparable!', 'I feel unstoppable today!', 'Heute bin ich nicht zu stoppen!'),
    L('Qué buen ambiente hay hoy en la oficina.', 'Great vibe in the office today.', 'Heute ist richtig gute Stimmung im Büro.'),
  ],
};

type RoleLines = (ctx: EmployeeLineContext) => Localized[];

const ROLE_LINES: Record<string, RoleLines> = {
  frontend: (ctx) => [
    ctx.rating >= 4
      ? L('El nuevo diseño quedó precioso, los usuarios lo notan.', 'The new design looks great, users notice it.', 'Das neue Design ist wunderschön, die Nutzer merken es.')
      : L('Safari otra vez me rompió el diseño...', 'Safari broke my layout again...', 'Safari hat mein Layout schon wieder kaputt gemacht...'),
  ],
  backend: (ctx) => [
    ctx.utilization > 0.8
      ? L('La base de datos está sufriendo, necesitamos más servidor.', 'The database is suffering, we need a bigger server.', 'Die Datenbank leidet, wir brauchen einen größeren Server.')
      : L('La API responde en 50 ms. Ni yo me lo creo.', "The API responds in 50 ms. Even I can't believe it.", 'Die API antwortet in 50 ms. Ich glaube es selbst kaum.'),
  ],
  fullstack: (ctx) => [
    ctx.queued > 0
      ? L('Me piden front, back y café al mismo tiempo...', "They want front end, back end and coffee from me at the same time...", 'Alle wollen Frontend, Backend und Kaffee gleichzeitig von mir...')
      : L('Hoy hice front y back: soy dos personas en una.', 'Today I did front end and back end: two people in one.', 'Heute habe ich Frontend und Backend gemacht: zwei Leute in einem.'),
  ],
  qa: (ctx) => [
    ctx.openBugs > 0
      ? L(`Encontré ${ctx.openBugs} bug(s) más. De nada.`, `I found ${ctx.openBugs} more bug(s). You're welcome.`, `Ich habe ${ctx.openBugs} weitere(n) Bug(s) gefunden. Gern geschehen.`)
      : L('Probé todo dos veces: está limpio. Por ahora.', 'I tested everything twice: it is clean. For now.', 'Ich habe alles zweimal getestet: sauber. Fürs Erste.'),
  ],
  ux: (ctx) => [
    ctx.rating < 3.5
      ? L('Los usuarios no encuentran el botón de registro, hay que moverlo.', "Users can't find the sign-up button, we need to move it.", 'Die Nutzer finden den Registrieren-Button nicht, wir müssen ihn verschieben.')
      : L('Hice pruebas con usuarios: les encantó el flujo.', 'I ran user tests: they loved the flow.', 'Ich habe Nutzertests gemacht: Sie lieben den Ablauf.'),
  ],
  'product-manager': (ctx) => [
    ctx.queued > 0
      ? L('El roadmap está más lleno que mi agenda.', 'The roadmap is fuller than my calendar.', 'Die Roadmap ist voller als mein Kalender.')
      : L('Prioricemos: primero lo que pide la gente.', "Let's prioritize: what people ask for comes first.", 'Lasst uns priorisieren: Zuerst, was die Leute wollen.'),
    ...(ctx.openBugs > 0
      ? [L('Ya le pasé los bugs al equipo, tranquilos.', 'I already handed the bugs to the team, relax.', 'Ich habe die Bugs schon ans Team verteilt, entspannt euch.')]
      : []),
  ],
  devops: (ctx) => [
    ctx.utilization > 0.85
      ? L('Si sube más el tráfico, se nos cae todo.', 'If traffic grows any more, everything goes down.', 'Wenn der Traffic weiter steigt, fällt alles aus.')
      : L('Automaticé el deploy: ahora sale solo.', 'I automated the deploy: it ships by itself now.', 'Ich habe das Deployment automatisiert: Es läuft jetzt von selbst.'),
  ],
  marketing: (ctx) => [
    ...(ctx.deal
      ? [
          L(
            `¡Ojo! ${ctx.deal.name} está ${ctx.deal.discount}% más barato estos días. Hay que aprovechar.`,
            `Heads up! ${ctx.deal.name} is ${ctx.deal.discount}% cheaper these days. Let's use it.`,
            `Achtung! ${ctx.deal.name} ist gerade ${ctx.deal.discount}% günstiger. Das sollten wir nutzen.`,
          ),
        ]
      : []),
    ctx.campaigns === 0
      ? L('Denme presupuesto y les traigo usuarios.', "Give me a budget and I'll bring you users.", 'Gebt mir Budget und ich bringe euch Nutzer.')
      : ctx.activeUsers >= 100
        ? L('¡La campaña está funcionando, miren los números!', 'The campaign is working, look at the numbers!', 'Die Kampagne funktioniert, schaut euch die Zahlen an!')
        : L('La campaña no prendió... hay que mejorar el producto.', "The campaign didn't take off... the product needs to improve.", 'Die Kampagne hat nicht gezündet... das Produkt muss besser werden.'),
  ],
  support: (ctx) => [
    ctx.openBugs >= 2
      ? L('Los usuarios están furiosos por los bugs, mi bandeja explota.', 'Users are furious about the bugs, my inbox is exploding.', 'Die Nutzer sind wütend wegen der Bugs, mein Postfach explodiert.')
      : L('Hoy un usuario nos dio las gracias. Me alegró el día.', 'A user thanked us today. Made my day.', 'Heute hat sich ein Nutzer bedankt. Mein Tag ist gerettet.'),
  ],
  'community-manager': (ctx) => [
    ctx.rating < 3
      ? L('En redes nos están destrozando...', "They're tearing us apart on social media...", 'In den sozialen Medien werden wir zerrissen...')
      : L('La comunidad pide modo oscuro. Otra vez.', 'The community is asking for dark mode. Again.', 'Die Community will einen Dark Mode. Schon wieder.'),
  ],
  'data-scientist': (ctx) => [
    ctx.activeUsers < 50
      ? L('Con tan pocos usuarios mis gráficas no dicen nada.', "With so few users my charts don't say anything.", 'Bei so wenigen Nutzern sagen meine Diagramme nichts aus.')
      : L('Los datos dicen que la gente se va el día 2. Hay que arreglar eso.', 'The data says people leave on day 2. We need to fix that.', 'Die Daten sagen, die Leute gehen an Tag 2. Das müssen wir ändern.'),
  ],
};

const TRAIT_LINES: Record<string, Localized> = {
  star: L('Terminé lo mío temprano, ¿qué más hay?', 'I finished my stuff early, what else is there?', 'Ich bin früh fertig, was gibt es noch?'),
  mentor: L('Les enseñé a los nuevos a hacer code review.', 'I taught the new folks how to do code review.', 'Ich habe den Neuen Code-Reviews beigebracht.'),
  slow: L('Ya casi termino... bueno, casi.', "I'm almost done... well, almost.", 'Ich bin fast fertig... na ja, fast.'),
  unmotivated: L('¿Ya es hora de irse?', 'Is it time to go home yet?', 'Ist schon Feierabend?'),
  sloppy: L('Lo subí sin probar, seguro funciona.', "I pushed it without testing, I'm sure it works.", 'Ich habe es ohne Test hochgeladen, wird schon gehen.'),
};

/** Frases de un empleado, la más importante primero. */
export function employeeLines(employee: EmployeeLineInput, ctx: EmployeeLineContext, now = Date.now()): Localized[] {
  const lines: Localized[] = [];
  if (employee.fixedBug) {
    lines.push(L(`¡Arreglé «${employee.fixedBug}»! Ya no molesta más.`, `I fixed "${employee.fixedBug}"! It won't bother us anymore.`, `Ich habe „${employee.fixedBug}“ behoben! Das stört nicht mehr.`));
  }
  if (employee.fixingBug) {
    lines.push(L(`Estoy con «${employee.fixingBug}», denme un rato.`, `I'm on "${employee.fixingBug}", give me a moment.`, `Ich sitze an „${employee.fixingBug}“, gebt mir etwas Zeit.`));
  }
  if (!employee.seated) {
    lines.push(L('No tengo escritorio... así no se puede trabajar.', "I don't have a desk... I can't work like this.", 'Ich habe keinen Schreibtisch... so kann ich nicht arbeiten.'));
  }
  if (employee.minutesInTeam < 3) {
    lines.push(L('Es mi primer día, ¿dónde queda el baño?', "It's my first day, where's the restroom?", 'Es ist mein erster Tag, wo ist die Toilette?'));
  }

  const mood = moodOf(employee, ctx, now);
  if (mood !== 'normal') {
    const options = MOOD_LINES[mood];
    lines.push(options[hash(`${employee.id}:${mood}:${Math.floor(now / MOOD_WINDOW_MS)}`) % options.length]);
  }

  lines.push(...(ROLE_LINES[employee.roleSlug]?.(ctx) ?? []));
  if (employee.bugsCaused > 0 && employee.traitKey === 'sloppy') {
    lines.push(L('Ese último bug... creo que fue culpa mía. Perdón.', 'That last bug... I think it was my fault. Sorry.', 'Der letzte Bug... ich glaube, das war meine Schuld. Sorry.'));
  }
  const trait = TRAIT_LINES[employee.traitKey];
  if (trait) lines.push(trait);
  return lines;
}
