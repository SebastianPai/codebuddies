import { Company, Catalog } from "./types";
import { format, percent, secondsLabel } from "./utils";

export function makeNotifications(company?: Company) {
  if (!company) return [];
  const liveEvents = (company.events ?? []).slice(0, 5).map((event) => ({
    type: "Actividad",
    tone: "info",
    title: event.title,
    message: event.description || new Date(event.createdAt).toLocaleString("es-CO"),
  }));

  return [
    ...liveEvents,
    {
      type: "Evento",
      tone: "info",
      title: company.activeUsers > 500 ? "Tendencia viral detectada" : "Primeros usuarios probando la app",
      message: company.activeUsers > 500 ? "La curva de usuarios esta acelerando. Revisa infraestructura." : "El mercado esta respondiendo al prototipo.",
    },
    {
      type: "Bug",
      tone: company.bugs > 20 ? "danger" : "warn",
      title: company.bugs > 20 ? "Errores afectando rating" : "QA encontro deuda tecnica",
      message: `${company.bugs.toFixed(0)} puntos de bugs acumulados.`,
    },
    {
      type: "Version",
      tone: "success",
      title: `Build v${Math.max(1, company.modules.length)}.${company.development.length}`,
      message: `${company.modules.length} features publicadas y ${company.development.length} en progreso.`,
    },
  ];
}

export function makeClients(company?: Company) {
  const satisfaction = company?.satisfaction ?? 70;
  const names = ["Diana Founder", "Mateo Gamer", "Lina Shopper", "Tomas Dev", "Sara Creator", "Nora Analyst"];
  const types = ["Power user", "Casual", "Premium", "Developer", "Creator", "Enterprise"];
  return names.map((name, index) => {
    const score = Math.max(10, Math.min(98, satisfaction + (index - 2) * 6));
    return {
      name,
      type: types[index],
      satisfaction: score,
      rating: Math.max(1, Math.min(5, score / 22)),
      comment:
        score > 75
          ? "La app se siente rapida y cada semana mejora."
          : score > 50
            ? "Me gusta, pero hay detalles que deberian pulir."
            : "Se cae demasiado, necesito una alternativa.",
    };
  });
}

export function makeInfrastructureIndicators(company: Company) {
  const capacity = company.infrastructure.reduce((sum, item) => sum + (item.capacity ?? 1000), 0) || 1000;
  const load = Math.min(100, (company.activeUsers / capacity) * 100);
  const latencyPressure = Math.min(100, (company.latency / 240) * 100);
  const bugPressure = Math.min(100, company.bugs);
  const stability = Math.max(0, Math.min(100, company.stability));

  return [
    { label: "CPU", icon: "CPU", value: Math.max(12, load + bugPressure * 0.25), hint: `${format(company.activeUsers)} usuarios activos` },
    { label: "RAM", icon: "RAM", value: Math.max(18, load * 0.82 + company.modules.length * 3), hint: `${company.modules.length} features en memoria` },
    { label: "Red", icon: "NET", value: Math.max(10, latencyPressure), hint: `${company.latency.toFixed(0)}ms promedio` },
    { label: "Disco", icon: "SSD", value: Math.min(100, 18 + company.totalUsers / 80 + company.snapshots.length * 2), hint: `${format(company.totalUsers)} usuarios historicos` },
    { label: "Cache", icon: "L1", value: Math.max(0, 100 - latencyPressure), hint: latencyPressure > 65 ? "Necesita optimizacion" : "Operando estable" },
    { label: "Firewall", icon: "FW", value: stability, hint: `${percent(stability)} estabilidad` },
    { label: "CDN", icon: "CDN", value: Math.max(15, 100 - latencyPressure * 0.7), hint: "Distribucion de assets" },
    { label: "Balanceador", icon: "LB", value: Math.max(10, 100 - load), hint: `${format(capacity)} capacidad total` },
  ];
}

export function makeTrends(catalog?: Catalog) {
  const labels = [
    ...(catalog?.appTypes ?? []).slice(0, 3).map((type) => ({ label: type.name, type: "App", score: 72 + type.difficulty * 4 })),
    ...(catalog?.technologies ?? []).slice(0, 4).map((tech, index) => ({ label: tech.name, type: "Tech", score: 86 - index * 7 })),
  ];
  return labels.slice(0, 7);
}

export function makeObjectives(company?: Company) {
  return [
    { label: "Llegar a 100 usuarios activos", current: company?.activeUsers ?? 0, target: 100, scope: "Diario" },
    { label: "Publicar 5 features", current: company?.modules.length ?? 0, target: 5, scope: "Semanal" },
    { label: "Mantener rating 4.5", current: Math.round((company?.rating ?? 0) * 20), target: 90, scope: "Largo plazo" },
  ];
}

export function makeVersions(company: Company) {
  return [
    {
      version: `v${Math.max(1, company.modules.length)}.0`,
      date: "Actual",
      notes: [
        `${company.modules.length} funciones instaladas`,
        `${company.development.length} tareas en sprint`,
        `Rating ${company.rating.toFixed(1)} con ${format(company.activeUsers)} usuarios`,
      ],
    },
    {
      version: "v0.1",
      date: "Fundacion",
      notes: ["Blueprint inicial copiado", "Infraestructura base creada", "Primer equipo contratado"],
    },
  ];
}

export function getEmployeeAssignment(company: Company, employeeIndex: number) {
  const activeTasks = company.development.filter((task) => ["QUEUED", "IN_PROGRESS"].includes(task.status));
  const task = activeTasks[employeeIndex % Math.max(1, activeTasks.length)];
  if (!task) {
    return {
      status: "Disponible",
      task: company.bugs > 15 ? "Revisando bugs criticos" : "Soporte y discovery",
      progress: company.bugs > 15 ? Math.min(100, company.bugs) : 18,
      remaining: "Esperando siguiente prioridad",
    };
  }

  const remaining = Math.max(0, (task.requiredSeconds ?? 0) - (task.spentSeconds ?? 0));
  return {
    status: task.progress >= 70 ? "QA" : "Desarrollo",
    task: task.module.name,
    progress: task.progress,
    remaining: `Tiempo restante: ${secondsLabel(remaining)}`,
  };
}
