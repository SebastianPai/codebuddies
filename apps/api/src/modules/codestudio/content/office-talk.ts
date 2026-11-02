// Conversaciones entre empleados en la oficina, armadas con lo que de verdad
// pasa en la empresa: el PM le pasa un bug a alguien y esa persona responde
// según lo difícil que sea, QA avisa de un bug, alguien celebra un arreglo...
// El juego las reproduce en globos (una cada tanto, igual para todos los que
// miran). Se calculan solo cuando alguien entra a la oficina.

import { L, Localized } from './i18n/localized';

export type TalkEmployee = { id: string; name: string; roleSlug: string; traitKey: string };
export type TalkBug = { id: string; title: string; severity: string; assignedEmployeeId: string | null };
export type TalkLine = { employeeId: string; text: Localized };
export type Conversation = TalkLine[];
/** Algo que pasó hace poco en la empresa (del historial). */
export type TalkEvent =
  | { event: 'release'; name: string }
  | { event: 'hire'; name: string; employeeId?: string; auto?: boolean }
  | { event: 'fire'; name: string; trait?: string };

// Rasgos con los que el equipo se alivia cuando la persona se va.
const ROUGH_TRAITS = new Set(['sloppy', 'slow', 'unmotivated']);

const BUILDERS = new Set(['fullstack', 'frontend', 'backend', 'devops', 'data-scientist']);

function hash(text: string) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index++) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

const pickOne = <T>(options: T[], seed: string) => options[hash(seed) % options.length];

function first(name: string) {
  return name.split(' ')[0] ?? name;
}

/** Respuesta de quien recibe un bug: según gravedad y su rasgo. */
function bugReply(bug: TalkBug, who: TalkEmployee): Localized {
  if (who.traitKey === 'sloppy') return L('Seguro fue mi código... ya lo arreglo.', 'Pretty sure that was my code... fixing it.', 'Das war bestimmt mein Code... ich behebe es.');
  if (who.traitKey === 'unmotivated') return L('¿Otra vez yo? Bueno, va...', 'Me again? Fine...', 'Schon wieder ich? Na gut...');
  const hard = bug.severity === 'HIGH' || bug.severity === 'CRITICAL';
  return hard
    ? pickOne(
        [
          L('Uf, este está difícil... denme tiempo.', 'Ugh, this one is tough... give me time.', 'Uff, der ist schwierig... gebt mir Zeit.'),
          L('Este va a costar... pero voy.', "This one won't be easy... but I'm on it.", 'Das wird nicht leicht... aber ich mach das.'),
        ],
        bug.id,
      )
    : pickOne(
        [
          L('¡Pan comido!', 'Piece of cake!', 'Ein Kinderspiel!'),
          L('Dame cinco minutos.', 'Give me five minutes.', 'Gib mir fünf Minuten.'),
          L('Hecho antes del café.', "Done before my coffee's ready.", 'Erledigt, bevor der Kaffee fertig ist.'),
        ],
        bug.id,
      );
}

export function officeConversations(input: {
  employees: TalkEmployee[];
  openBugs: TalkBug[];
  recentFixes: Array<{ title: string; assignedEmployeeId: string | null }>;
  deal: { name: string; discount: number } | null;
  unseatedIds: string[];
  /** Lanzamientos, contrataciones y despidos recientes (lo más nuevo primero). */
  events?: TalkEvent[];
}): Conversation[] {
  const { employees } = input;
  if (employees.length < 2) return [];
  const byId = new Map(employees.map((employee) => [employee.id, employee]));
  const pm = employees.find((employee) => employee.roleSlug === 'product-manager');
  const qa = employees.find((employee) => employee.roleSlug === 'qa');
  const other = (notId: string, seed: string) => pickOne(employees.filter((employee) => employee.id !== notId), seed);
  const conversations: Conversation[] = [];

  // Lo que acaba de pasar va primero: así no repiten siempre lo mismo.
  for (const item of (input.events ?? []).slice(0, 4)) {
    if (item.event === 'release') {
      const builder = employees.find((employee) => BUILDERS.has(employee.roleSlug)) ?? employees[0];
      const marketer = employees.find((employee) => employee.roleSlug === 'marketing');
      const mate = other(builder.id, item.name);
      conversations.push([
        { employeeId: builder.id, text: pickOne([
          L(`¡Ya salió «${item.name}»! Los usuarios ya lo pueden usar.`, `"${item.name}" is live! Users can try it now.`, `„${item.name}“ ist live! Die Nutzer können es jetzt benutzen.`),
          L(`Publicamos «${item.name}». Crucemos los dedos para que no falle.`, `We shipped "${item.name}". Fingers crossed it holds up.`, `Wir haben „${item.name}“ veröffentlicht. Daumen drücken, dass es hält.`),
        ], item.name) },
        marketer && marketer.id !== builder.id
          ? { employeeId: marketer.id, text: L(`Lo anuncio en redes: «${item.name}» ya está disponible.`, `I'll post it: "${item.name}" is out now.`, `Ich poste es: „${item.name}“ ist jetzt verfügbar.`) }
          : { employeeId: mate.id, text: L('A ver qué dicen los usuarios, ojalá les guste.', "Let's see what users think, hope they like it.", 'Mal sehen, was die Nutzer sagen, hoffentlich gefällt es ihnen.') },
      ]);
    } else if (item.event === 'hire') {
      const newbie = item.employeeId ? byId.get(item.employeeId) : employees.find((employee) => employee.name === item.name);
      if (!newbie) continue;
      const host = other(newbie.id, newbie.id);
      conversations.push([
        { employeeId: host.id, text: L(`¡Bienvenida al equipo, ${first(newbie.name)}! Te muestro la oficina.`, `Welcome to the team, ${first(newbie.name)}! Let me show you around.`, `Willkommen im Team, ${first(newbie.name)}! Ich zeige dir das Büro.`) },
        { employeeId: newbie.id, text: item.auto
          ? L('¡Gracias! Me dijeron que hacía falta gente en mi área.', 'Thanks! They told me my team needed people.', 'Danke! Man hat mir gesagt, dass mein Team Leute braucht.')
          : L('¡Gracias! Tengo muchas ganas de empezar.', "Thanks! I can't wait to get started.", 'Danke! Ich freue mich darauf, loszulegen.') },
      ]);
    } else if (item.event === 'fire') {
      const a = pickOne(employees, `${item.name}:a`);
      const b = other(a.id, `${item.name}:b`);
      const relief = item.trait ? ROUGH_TRAITS.has(item.trait) : false;
      conversations.push(
        relief
          ? [
              { employeeId: a.id, text: L(`Desde que se fue ${first(item.name)} se trabaja más tranquilo.`, `Since ${first(item.name)} left, things are calmer.`, `Seit ${first(item.name)} weg ist, ist es ruhiger.`) },
              { employeeId: b.id, text: L('Sí... pero ojalá el jefe contrate a alguien pronto.', 'Yeah... but I hope the boss hires someone soon.', 'Ja... aber hoffentlich stellt der Chef bald jemanden ein.') },
            ]
          : [
              { employeeId: a.id, text: L(`Qué pena lo de ${first(item.name)}... era buena persona.`, `Too bad about ${first(item.name)}... they were nice.`, `Schade um ${first(item.name)}... war ein netter Mensch.`) },
              { employeeId: b.id, text: L('Ahora nos toca su trabajo a nosotros.', 'Now we have to pick up their work.', 'Jetzt müssen wir seine Arbeit übernehmen.') },
            ],
      );
    }
  }

  // El PM (o un compañero) le pasa el bug a quien lo está arreglando.
  for (const bug of input.openBugs.filter((entry) => entry.assignedEmployeeId).slice(0, 3)) {
    const who = byId.get(bug.assignedEmployeeId!);
    if (!who) continue;
    const boss = pm && pm.id !== who.id ? pm : null;
    conversations.push([
      boss
        ? { employeeId: boss.id, text: L(`${first(who.name)}, ¿te encargas de «${bug.title}»?`, `${first(who.name)}, can you take "${bug.title}"?`, `${first(who.name)}, übernimmst du „${bug.title}“?`) }
        : { employeeId: who.id, text: L(`El jefe me pasó «${bug.title}».`, `The boss gave me "${bug.title}".`, `Der Chef hat mir „${bug.title}“ gegeben.`) },
      { employeeId: who.id, text: bugReply(bug, who) },
    ]);
  }

  // QA avisa de un bug que nadie tomó.
  const waiting = input.openBugs.find((entry) => !entry.assignedEmployeeId);
  const dev = employees.find((employee) => BUILDERS.has(employee.roleSlug) && employee.id !== qa?.id);
  if (waiting && qa && dev) {
    conversations.push([
      { employeeId: qa.id, text: L(`${first(dev.name)}, encontré un bug: «${waiting.title}».`, `${first(dev.name)}, I found a bug: "${waiting.title}".`, `${first(dev.name)}, ich habe einen Bug gefunden: „${waiting.title}“.`) },
      { employeeId: dev.id, text: L('¿En serio? Ya lo miro.', 'Seriously? I will take a look.', 'Echt jetzt? Ich schau es mir an.') },
      ...(pm ? [{ employeeId: pm.id, text: L('Lo anoto en el tablero.', "I'll put it on the board.", 'Ich schreibe es aufs Board.') }] : []),
    ]);
  }

  // Alguien terminó un arreglo y otro lo celebra.
  for (const fix of input.recentFixes.slice(0, 2)) {
    const who = fix.assignedEmployeeId ? byId.get(fix.assignedEmployeeId) : null;
    if (!who) continue;
    const mate = other(who.id, fix.title);
    conversations.push([
      { employeeId: who.id, text: L(`¡Listo! «${fix.title}» ya no falla.`, `Done! "${fix.title}" is fixed.`, `Fertig! „${fix.title}“ ist behoben.`) },
      { employeeId: mate.id, text: L(`¡Grande, ${first(who.name)}!`, `Nice one, ${first(who.name)}!`, `Stark, ${first(who.name)}!`) },
    ]);
  }

  // Marketing encontró una oferta.
  const marketer = employees.find((employee) => employee.roleSlug === 'marketing');
  if (input.deal && marketer) {
    const mate = other(marketer.id, input.deal.name);
    conversations.push([
      {
        employeeId: marketer.id,
        text: L(`${input.deal.name} está ${input.deal.discount}% más barato.`, `${input.deal.name} is ${input.deal.discount}% cheaper.`, `${input.deal.name} ist ${input.deal.discount}% günstiger.`),
      },
      { employeeId: mate.id, text: L('¡Dile al jefe antes de que se acabe!', 'Tell the boss before it ends!', 'Sag es dem Chef, bevor es vorbei ist!') },
    ]);
  }

  // Quien no tiene puesto pregunta.
  const unseated = input.unseatedIds.map((id) => byId.get(id)).find(Boolean);
  if (unseated) {
    const mate = other(unseated.id, unseated.id);
    conversations.push([
      { employeeId: unseated.id, text: L('¿Alguien sabe dónde me siento?', 'Does anyone know where I sit?', 'Weiß jemand, wo ich sitze?') },
      { employeeId: mate.id, text: L('Pídele un escritorio al jefe.', 'Ask the boss for a desk.', 'Frag den Chef nach einem Schreibtisch.') },
    ]);
  }

  return conversations;
}
