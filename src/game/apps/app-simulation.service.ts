// src/modules/apps/app-simulation.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AppSimulationService {
  constructor(private readonly prisma: PrismaService) {}

  // Simulación mejorada - más realista y escalable
  simulate(app: any) {
    const logic = app.logic || { nodes: [], edges: [] };
    const nodes = logic.nodes || [];

    const baseUsers = 20;
    let successRate = 0.5;
    let complaints = 0;
    let revenue = 0;

    // Análisis de nodos presentes
    const nodeTypes = nodes.map((n: any) => n.data?.nodeType || n.type);

    // Bonos por nodos clave
    if (nodeTypes.includes('ORDER')) successRate += 0.12;
    if (nodeTypes.includes('PAYMENT') || nodeTypes.includes('VERIFY_PAYMENT'))
      successRate += 0.15;
    if (nodeTypes.includes('ASSIGN_DRIVER') || nodeTypes.includes('DELIVER'))
      successRate += 0.18;
    if (nodeTypes.includes('NOTIFICATION')) successRate += 0.1;
    if (nodeTypes.includes('UPDATE_STOCK')) successRate += 0.08;
    if (nodeTypes.includes('TRACK_ORDER')) successRate += 0.09;

    // Penalizaciones por faltas graves
    if (!nodeTypes.includes('NOTIFICATION')) complaints += 25; // usuarios se quejan de no recibir info
    if (!nodeTypes.includes('PAYMENT') && !nodeTypes.includes('VERIFY_PAYMENT'))
      complaints += 30;
    if (nodeTypes.includes('DELIVER') && !nodeTypes.includes('ASSIGN_DRIVER'))
      complaints += 20;

    // Complejidad = más nodos bien conectados = mejor app
    const complexity = Math.min(nodes.length * 0.025, 0.35);
    successRate += complexity;

    // Efecto de quejas
    const complaintPenalty = Math.min(complaints / 200, 0.45);
    successRate -= complaintPenalty;

    successRate = Math.max(0.08, Math.min(successRate, 0.97));

    const activeUsers = Math.floor(baseUsers * (1 + successRate * 2.2));
    revenue = Math.floor(activeUsers * successRate * (12 + Math.random() * 18));

    const retention = Math.max(0.25, 0.85 - complaintPenalty * 0.8);

    return {
      activeUsers,
      successRate,
      revenue,
      retention,
      complaints,
      successOrders: Math.floor(activeUsers * successRate),
      failedOrders: Math.floor(activeUsers * (1 - successRate)),
    };
  }

  // Tick global (se ejecuta cada X minutos)
  async runTick() {
    const apps = await this.prisma.app.findMany({
      where: { status: 'PUBLISHED' },
      include: { snapshots: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    for (const app of apps) {
      const result = this.simulate(app);

      // Actualizar app principal
      await this.prisma.app.update({
        where: { id: app.id },
        data: {
          activeUsers: result.activeUsers,
          successRate: result.successRate,
          revenue: { increment: result.revenue },
          retention: result.retention,
          totalRequests: { increment: result.activeUsers },
        },
      });

      // Crear snapshot histórico
      await this.prisma.appSimulationSnapshot.create({
        data: {
          appId: app.id,
          users: result.activeUsers,
          successRate: result.successRate,
          revenue: result.revenue,
          retention: result.retention,
        },
      });
    }
  }
}
