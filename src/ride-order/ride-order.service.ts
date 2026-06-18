import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StateManager } from '../core/state/state.manager';
import { ClientRequestState } from '../core/state/state.types';

@Injectable()
export class RideOrderService {
  private readonly logger = new Logger(RideOrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stateManager: StateManager,
  ) {}

  async create(data: {
    userTgId: number;
    fromName: string;
    toName: string;
    passengers: number;
    phone: string;
    features?: string[];
    time?: string;
  }) {
    return this.prisma.rideOrder.create({
      data: {
        userTgId: BigInt(data.userTgId),
        fromName: data.fromName,
        toName: data.toName,
        passengers: data.passengers,
        phone: data.phone,
        status: ClientRequestState.NEW,
        features: data.features || [],
        time: data.time || null,
      },
    });
  }

  async getByUser(userTgId: number) {
    return this.prisma.rideOrder.findMany({
      where: { userTgId: BigInt(userTgId), status: { not: ClientRequestState.CANCELLED } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async getActiveByUser(userTgId: number) {
    return this.prisma.rideOrder.findMany({
      where: { userTgId: BigInt(userTgId), status: ClientRequestState.NEW },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(id: number) {
    return this.prisma.rideOrder.findUnique({ where: { id } });
  }

  async updateStatus(id: number, newStatus: ClientRequestState): Promise<boolean> {
    const order = await this.getById(id);
    if (!order) {
      this.logger.warn(`Ride order not found: ${id}`);
      return false;
    }

    const isValid = this.stateManager.transitionClientRequestState(
      order.status as ClientRequestState,
      newStatus,
    );

    if (!isValid) {
      this.logger.warn(`Invalid state transition for order ${id}: ${order.status} -> ${newStatus}`);
      return false;
    }

    await this.prisma.rideOrder.update({
      where: { id },
      data: { status: newStatus },
    });
    
    return true;
  }

  async getNewOrders() {
    return this.prisma.rideOrder.findMany({
      where: { status: ClientRequestState.NEW },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  isOpenStatus(status: string): boolean {
    return status === ClientRequestState.NEW || status === ClientRequestState.MATCHED;
  }

  isActiveRideStatus(status: string): boolean {
    return status === ClientRequestState.MATCHED;
  }

  statusEmoji(status: string): string {
    switch (status) {
      case ClientRequestState.NEW: return '🟡';
      case ClientRequestState.PARTIAL_MATCH: return '🟠';
      case ClientRequestState.MATCHED: return '🟢';
      case ClientRequestState.EXPIRED: return '⚫';
      case ClientRequestState.CANCELLED: return '🔴';
      default: return '⚪';
    }
  }

  statusLabel(status: string): string {
    switch (status) {
      case ClientRequestState.NEW: return 'Kutilmoqda';
      case ClientRequestState.PARTIAL_MATCH: return 'Qisman mos';
      case ClientRequestState.MATCHED: return 'Mos keldi';
      case ClientRequestState.EXPIRED: return 'Muddati o\'tgan';
      case ClientRequestState.CANCELLED: return 'Bekor qilingan';
      default: return status;
    }
  }
}
