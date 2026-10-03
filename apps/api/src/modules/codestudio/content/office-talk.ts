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
}): Conversation[] {
  const { employees } = input;
  if (employees.length < 2) return [];
  const byId = new Map(employees.map((employee) => [employee.id, employee]));
  const pm = employees.find((employee) => employee.roleSlug === 'product-manager');
  const qa = employees.find((employee) => employee.roleSlug === 'qa');
  const other = (notId: string, seed: string) => pickOne(employees.filter((employee) => employee.id !== notId), seed);
  const conversations: Conversation[] = [];

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
