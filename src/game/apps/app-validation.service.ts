// src/modules/apps/app-validation.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppValidationService {
  validate(logic: any) {
    if (!logic || typeof logic !== 'object') {
      return {
        valid: false,
        errors: ['La lógica de la app está vacía o inválida'],
      };
    }

    const nodes = logic.nodes || [];
    const edges = logic.edges || [];

    const hasOrder = nodes.some((n: any) => n.type === 'ORDER');
    const hasAssign = nodes.some((n: any) => n.type === 'ASSIGN_DRIVER');
    const hasDeliver = nodes.some((n: any) => n.type === 'DELIVER');

    const errors: string[] = [];

    if (!hasOrder) errors.push('Falta un nodo de tipo ORDER (Recibir pedidos)');
    if (!hasAssign)
      errors.push('Falta un nodo de tipo ASSIGN_DRIVER (Asignar repartidor)');
    if (!hasDeliver)
      errors.push('Falta un nodo de tipo DELIVER (Entregar pedido)');

    // Validación básica de estructura
    if (nodes.length === 0) {
      errors.push('La app debe tener al menos un nodo');
    }

    return {
      valid: errors.length === 0,
      errors,
      nodeCount: nodes.length,
      edgeCount: edges.length,
    };
  }
}
