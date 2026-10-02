import { PrismaService } from '../../prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import { CodeStudioCatalogService } from './codestudio-catalog.service';
import { CodeStudioEngineService } from './codestudio-engine.service';
import { CodeStudioRewardsService } from './codestudio-rewards.service';
import { CodeStudioService } from './codestudio.service';

// Prueba de punta a punta contra un Postgres real (migraciones aplicadas).
// Solo corre con CS_INTEGRATION_DB=1 y DATABASE_URL apuntando a una base
// descartable — NUNCA contra la base de desarrollo o producción.
const run = process.env.CS_INTEGRATION_DB === '1' ? describe : describe.skip;

run('CodeStudio v2 contra Postgres real', () => {
  jest.setTimeout(120_000);
  const prisma = new PrismaService();
  const catalog = new CodeStudioCatalogService(prisma);
  const gamification = new GamificationService(prisma, null as never, null as never);
  const rewards = new CodeStudioRewardsService(prisma, gamification);
  const service = new CodeStudioService(prisma, new CodeStudioEngineService(), catalog, rewards);
  let userId = '';

  // "Viaja en el tiempo": hace que la última simulación haya sido hace 30s.
  const advance = async (companyId: string, times = 1) => {
    let view: Awaited<ReturnType<CodeStudioService['getCompany']>> | null = null;
    for (let i = 0; i < times; i++) {
      await prisma.codeStudioCompany.update({ where: { id: companyId }, data: { lastSimulatedAt: new Date(Date.now() - 30_000) } });
      view = await service.getCompany(userId, companyId);
    }
    return view!;
  };
  const featureId = async (slug: string) => (await prisma.codeStudioModule.findUniqueOrThrow({ where: { slug } })).id;
  const build = async (companyId: string, slug: string) => {
    await service.startDevelopment(userId, companyId, { moduleId: await featureId(slug) });
    for (let i = 0; i < 60; i++) {
      const view = await advance(companyId);
      if (view.tree.find((node) => node.slug === slug)?.state === 'installed') return view;
    }
    throw new Error(`${slug} nunca terminó`);
  };

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { username: `cs_${Date.now()}`, email: `cs_${Date.now()}@test.dev`, password: 'x' },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('convierte una empresa del sistema viejo sin romperla', async () => {
    const appType = await prisma.codeStudioAppType.findUniqueOrThrow({ where: { slug: 'delivery' } });
    const oldModule = await prisma.codeStudioModule.findFirstOrThrow({ where: { slug: 'autenticacion-login' } });
    const oldInfra = await prisma.codeStudioInfrastructureType.findUniqueOrThrow({ where: { slug: 'server' } });
    const role = await prisma.codeStudioEmployeeType.findUniqueOrThrow({ where: { slug: 'frontend' } });
    const legacy = await prisma.codeStudioCompany.create({
      data: {
        userId,
        appTypeId: appType.id,
        name: 'Legacy Co',
        cash: -500,
        activeUsers: 40,
        modules: { create: { moduleId: oldModule.id } },
        infrastructure: { create: { infrastructureTypeId: oldInfra.id, level: 2, capacity: 2400, cost: 2400 } },
        employees: { create: { employeeTypeId: role.id, name: 'Ana Old', age: 30, salary: 850 } },
        bugReports: { create: { kind: 'latency', title: 'Viejo', description: 'bug viejo', severity: 'HIGH', fixCost: 650 } },
      },
    });

    // La API sincroniza el contenido v2 al arrancar.
    await catalog.syncContent();
    expect(await prisma.codeStudioModule.count({ where: { active: true } })).toBe(41);

    const converted = await service.getCompany(userId, legacy.id);
    expect(converted.cash).toBe(2000);
    expect(converted.bugs).toHaveLength(0);
    expect(converted.legacyFeatures).toHaveLength(1);
    expect(converted.events[0].title).toBe('CodeStudio 2.0');

    const simulated = await advance(legacy.id, 3);
    expect(simulated.status).not.toBe('FAILED');
    expect(simulated.metrics.launched).toBe(true);
  });

  it('juega una partida: MVP, equipo, bug diagnosticado, decisión, inversión y quiebra', async () => {
    const coinsBefore = (await prisma.user.findUniqueOrThrow({ where: { id: userId } })).coins;
    const delivery = await prisma.codeStudioAppType.findUniqueOrThrow({ where: { slug: 'delivery' } });
    const created = await service.createCompany(userId, { appTypeId: delivery.id, name: 'Rappi Killer' });
    expect(created.cash).toBe(6000);
    expect(created.stage.index).toBe(0);
    expect(created.tree.find((node) => node.slug === 'landing')?.state).toBe('available');
    expect(created.tree.find((node) => node.slug === 'auth')?.state).toBe('locked');

    // Tipo de app bloqueado por nivel de fundador.
    const saas = await prisma.codeStudioAppType.findUniqueOrThrow({ where: { slug: 'saas' } });
    await expect(service.createCompany(userId, { appTypeId: saas.id, name: 'Too Early' })).rejects.toThrow(/se desbloquea en nivel/);

    // No se puede saltar el árbol.
    await expect(service.startDevelopment(userId, created.id, { moduleId: await featureId('core-feature') })).rejects.toThrow(/Primero necesitas/);

    await build(created.id, 'landing');
    await build(created.id, 'auth');
    let view = await build(created.id, 'core-feature');
    expect(view.stage.index).toBe(1);
    expect(view.profile.milestones.map((m) => m.key)).toEqual(expect.arrayContaining(['first-company', 'first-feature', 'stage-1']));

    // Sin servidor no hay usuarios; con servidor, llegan.
    const server = await prisma.codeStudioInfrastructureType.findUniqueOrThrow({ where: { slug: 'server' } });
    await service.installInfrastructure(userId, created.id, { infrastructureTypeId: server.id });
    view = await advance(created.id, 6);
    expect(view.activeUsers).toBeGreaterThan(0);
    expect(view.status).toBe('LIVE');

    // Contratar y despedir.
    const backend = await prisma.codeStudioEmployeeType.findUniqueOrThrow({ where: { slug: 'backend' } });
    view = await service.hireEmployee(userId, created.id, { employeeTypeId: backend.id });
    expect(view.employees).toHaveLength(1);
    expect(view.metrics.devPower).toBeGreaterThan(1);
    const cashBeforeFire = view.cash;
    view = await service.fireEmployee(userId, created.id, view.employees[0].id);
    expect(view.employees).toHaveLength(0);
    expect(view.cash).toBeLessThan(cashBeforeFire);

    // Bug: diagnóstico equivocado cuesta, el correcto da XP y coins.
    const inserted = await prisma.codeStudioBug.create({
      data: { companyId: created.id, kind: 'release', scenarioKey: 'n-plus-one', title: 'N+1', description: 'x', severity: 'MEDIUM', fixCost: 450 },
    });
    view = await service.getCompany(userId, created.id);
    const bug = view.bugs.find((entry) => entry.id === inserted.id)!;
    expect(bug.options.length).toBe(4);
    expect(JSON.stringify(bug)).not.toContain('correct');
    const wrong = await service.fixBug(userId, created.id, bug.id, { method: 'diagnose', optionKey: 'bigger-server' });
    expect((wrong.result as { correct: boolean }).correct).toBe(false);
    const right = await service.fixBug(userId, created.id, bug.id, { method: 'diagnose', optionKey: 'join' });
    expect((right.result as { correct: boolean }).correct).toBe(true);
    expect(right.company.bugs.some((entry) => entry.id === bug.id)).toBe(false);
    const coinsAfter = (await prisma.user.findUniqueOrThrow({ where: { id: userId } })).coins;
    expect(coinsAfter).toBeGreaterThan(coinsBefore);
    const ledger = await prisma.rewardLedgerEntry.findMany({ where: { userId, sourceType: 'CODESTUDIO' } });
    expect(ledger.some((entry) => entry.sourceId === 'first-bug-diagnosed')).toBe(true);

    // Logro repetido no vuelve a pagar coins.
    const coinsCheckpoint = coinsAfter;
    const spam = await prisma.codeStudioBug.create({
      data: { companyId: created.id, kind: 'release', scenarioKey: 'emails-spam', title: 'Spam', description: 'x', severity: 'LOW', fixCost: 200 },
    });
    await service.fixBug(userId, created.id, spam.id, { method: 'diagnose', optionKey: 'dns' });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).coins).toBe(coinsCheckpoint);

    // Decisión pendiente → elegir.
    const decision = await prisma.codeStudioEventLog.create({
      data: {
        companyId: created.id,
        title: 'Una influencer quiere promocionarte',
        description: 'x',
        effects: {
          kind: 'decision',
          status: 'pending',
          key: 'influencer-offer',
          params: { price: 300, expected: 80 },
          choices: [{ key: 'accept', label: 'Pagar', hint: '' }, { key: 'decline', label: 'No', hint: '' }],
          expiresAtDay: 999,
        },
      },
    });
    view = await service.getCompany(userId, created.id);
    expect(view.pendingDecision?.id).toBe(decision.id);
    const usersBefore = view.activeUsers;
    view = await service.chooseDecision(userId, created.id, decision.id, { choice: 'accept' });
    // Puede aparecer otra decisión real en el mismo tick; esta ya no está.
    expect(view.pendingDecision?.id).not.toBe(decision.id);
    expect(view.activeUsers).toBeGreaterThanOrEqual(usersBefore + 80);
    await expect(service.chooseDecision(userId, created.id, decision.id, { choice: 'accept' })).rejects.toThrow(/Ya tomaste/);

    // Precio y campaña.
    view = await service.setPricing(userId, created.id, { level: 1.3 });
    expect(view.priceLevel).toBe(1.3);
    const tiktok = view.marketing.channels.find((channel) => channel.slug === 'tiktok')!;
    expect(tiktok.quotes[0].users).toBeGreaterThan(0);
    view = await service.launchCampaign(userId, created.id, { campaignId: tiktok.id, multiplier: 1 });
    expect(view.marketing.summary[0].runs).toBe(1);

    // Inversión: requiere etapa y rating.
    await prisma.codeStudioCompany.update({ where: { id: created.id }, data: { stage: 2, rating: 4.2 } });
    const cashBeforeRound = (await prisma.codeStudioCompany.findUniqueOrThrow({ where: { id: created.id } })).cash;
    view = await service.raiseFunding(userId, created.id);
    expect(view.founderEquity).toBeCloseTo(85);
    expect(view.cash).toBeGreaterThan(cashBeforeRound + 7000);

    // Dos polls a la vez: uno simula, el otro no rompe nada.
    await prisma.codeStudioCompany.update({ where: { id: created.id }, data: { lastSimulatedAt: new Date(Date.now() - 20_000) } });
    const [a, b] = await Promise.all([service.getCompany(userId, created.id), service.getCompany(userId, created.id)]);
    expect(a.id).toBe(b.id);

    // Quiebra: 7 días en rojo.
    await prisma.codeStudioCompany.update({ where: { id: created.id }, data: { cash: -5000, debtDays: 6.8 } });
    view = await advance(created.id);
    expect(view.status).toBe('FAILED');
    expect(view.failureReason).toContain('Gastabas');
    await expect(service.hireEmployee(userId, created.id, { employeeTypeId: backend.id })).rejects.toThrow(/quebró/);
    const profile = await rewards.getProfile(userId);
    expect(profile.bankruptcies).toBe(1);
    expect(profile.milestones.map((m) => m.key)).toContain('first-bankruptcy');

    const studio = await service.myStudio(userId);
    expect(studio.companies.length).toBe(2);
    const ranking = (await service.ranking()) as Array<{ id: string }>;
    expect(ranking.some((row) => row.id === created.id)).toBe(false);
  });

  it('misiones diarias: pagan una sola vez y el bono llega al completar las 3', async () => {
    const before = await rewards.getProfile(userId);
    expect(before.daily.missions).toHaveLength(3);
    const coinsBefore = (await prisma.user.findUniqueOrThrow({ where: { id: userId } })).coins;
    const huge = { features: 99, bugs: 99, hires: 99, campaigns: 99, decisions: 99, newUsers: 1e6, revenue: 1e6, days: 999, stages: 9 };
    await prisma.$transaction((tx) => rewards.bumpDaily(tx, userId, huge, null));
    const after = await rewards.getProfile(userId);
    expect(after.daily.missions.every((mission) => mission.done)).toBe(true);
    expect(after.daily.bonus.done).toBe(true);
    // Solo pagan las que no estaban cumplidas antes (la partida anterior
    // del test ya pudo completar alguna de verdad).
    const pendingBefore = before.daily.missions.filter((mission) => !mission.done);
    const expectedCoins = pendingBefore.reduce((sum, mission) => sum + mission.coins, 0) + (before.daily.bonus.done ? 0 : after.daily.bonus.coins);
    const coinsAfter = (await prisma.user.findUniqueOrThrow({ where: { id: userId } })).coins;
    expect(coinsAfter - coinsBefore).toBe(expectedCoins);
    // Repetir no paga de nuevo.
    await prisma.$transaction((tx) => rewards.bumpDaily(tx, userId, huge, null));
    expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).coins).toBe(coinsAfter);
  });

  it('el XP es global (sube el nivel de la cuenta) y lo repetible tiene tope diario', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.experience).toBeGreaterThan(0);
    const xpLedger = await prisma.rewardLedgerEntry.count({ where: { userId, sourceType: 'CODESTUDIO', rewardType: 'XP' } });
    expect(xpLedger).toBeGreaterThan(0);
    // Mucho XP repetible de golpe: nunca pasa el tope del día.
    for (let i = 0; i < 20; i++) await prisma.$transaction((tx) => rewards.addXp(tx, userId, 200, null));
    const profile = await rewards.getProfile(userId);
    expect(profile.gameXpToday).toBeLessThanOrEqual(profile.gameXpCap);
    expect(profile.gameXpToday).toBe(profile.gameXpCap);
    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(after.level).toBe(profile.level);
    // La página de logros de la web.
    const page = await rewards.achievements(userId, 'en');
    expect(page.items.length).toBe(page.summary.total);
    expect(page.items.find((item) => item.key === 'first-company')?.unlocked).toBe(true);
    expect(page.items.find((item) => item.key === 'full-tree')?.howTo).toMatch(/Tree/);
  });

  it('responde en inglés y alemán', async () => {
    const delivery = await prisma.codeStudioAppType.findUniqueOrThrow({ where: { slug: 'delivery' } });
    const english = await service.createCompany(userId, { appTypeId: delivery.id, name: 'English Co' }, 'en');
    expect(english.events.some((event) => event.title === 'Welcome, CEO')).toBe(true);
    expect(english.stage.name).toBe('Idea');
    expect(english.stage.goals[0].label).toBe('Ship the Core feature');
    const catalog = await service.catalog('de');
    expect(catalog.features.find((feature) => feature.slug === 'auth')?.name).toBe('Registrierung und Login');
    await expect(service.startDevelopment(userId, english.id, { moduleId: await featureId('core-feature') }, 'en')).rejects.toThrow(/First you need/);
  });
});
