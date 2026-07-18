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

  async createFromGroup(data: {
    userTgId: number;
    sourceChatId: string;
    sourceMessageId: number;
    sourceText: string;
    sourceTitle: string;
    passengers?: number;
    phone?: string;
    time?: string;
  }): Promise<{ created: boolean; order: any }> {
    try {
      const order = await this.prisma.rideOrder.create({
        data: {
          userTgId: BigInt(data.userTgId),
          fromName: data.sourceTitle,
          toName: "Yo'nalish xabar matnida",
          passengers: data.passengers || 1,
          phone: data.phone || '',
          status: ClientRequestState.NEW,
          time: data.time || null,
          sourceChatId: data.sourceChatId,
          sourceMessageId: data.sourceMessageId,
          sourceText: data.sourceText,
          sourceTitle: data.sourceTitle,
        },
      });
      return { created: true, order };
    } catch (error: any) {
      if (error?.code !== 'P2002') throw error;
      const order = await this.prisma.rideOrder.findUnique({
        where: {
          sourceChatId_sourceMessageId: {
            sourceChatId: data.sourceChatId,
            sourceMessageId: data.sourceMessageId,
          },
        },
      });
      if (!order) throw error;
      return { created: false, order };
    }
  }

  async getByUser(userTgId: number) {
    return this.prisma.rideOrder.findMany({
      where: {
        userTgId: BigInt(userTgId),
        status: { not: ClientRequestState.CANCELLED },
      },
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

  async updateStatus(
    id: number,
    newStatus: ClientRequestState,
  ): Promise<boolean> {
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
      this.logger.warn(
        `Invalid state transition for order ${id}: ${order.status} -> ${newStatus}`,
      );
      return false;
    }

    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.rideOrder.updateMany({
        where: { id, status: order.status },
        data: { status: newStatus },
      });
      if (changed.count !== 1) return false;

      if (
        newStatus === ClientRequestState.CANCELLED ||
        newStatus === ClientRequestState.EXPIRED
      ) {
        await tx.ride.updateMany({
          where: { clientRequestId: id },
          data: {
            state:
              newStatus === ClientRequestState.EXPIRED
                ? 'COMPLETED'
                : 'CANCELLED',
          },
        });
      }

      return true;
    });
  }

  async acceptByDriver(orderId: number, driverTgId: number) {
    return this.prisma.$transaction(async (tx) => {
      const driver = await tx.driver.findUnique({
        where: { tgId: BigInt(driverTgId) },
      });
      if (!driver)
        return { ok: false as const, reason: 'NOT_REGISTERED' as const };
      if (!driver.isApproved) {
        return { ok: false as const, reason: 'NOT_APPROVED' as const };
      }

      const claimed = await tx.rideOrder.updateMany({
        where: { id: orderId, status: ClientRequestState.NEW },
        data: { status: ClientRequestState.MATCHED },
      });
      if (claimed.count !== 1) {
        const order = await tx.rideOrder.findUnique({ where: { id: orderId } });
        return {
          ok: false as const,
          reason: order ? ('ALREADY_TAKEN' as const) : ('NOT_FOUND' as const),
        };
      }

      const ride = await tx.ride.upsert({
        where: { clientRequestId: orderId },
        update: { driverId: driver.id, state: 'CREATED' },
        create: {
          driverId: driver.id,
          clientRequestId: orderId,
          state: 'CREATED',
        },
      });
      const order = await tx.rideOrder.findUnique({ where: { id: orderId } });
      return { ok: true as const, driver, order: order!, ride };
    });
  }

  async releaseByDriver(orderId: number, driverTgId: number) {
    return this.prisma.$transaction(async (tx) => {
      const driver = await tx.driver.findUnique({
        where: { tgId: BigInt(driverTgId) },
      });
      if (!driver?.isApproved) {
        return { ok: false as const, reason: 'NOT_APPROVED' as const };
      }

      const ride = await tx.ride.findFirst({
        where: {
          clientRequestId: orderId,
          driverId: driver.id,
          state: { in: ['CREATED', 'IN_PROGRESS'] },
        },
      });
      if (!ride) return { ok: false as const, reason: 'NOT_OWNER' as const };

      const reopened = await tx.rideOrder.updateMany({
        where: { id: orderId, status: ClientRequestState.MATCHED },
        data: { status: ClientRequestState.NEW },
      });
      if (reopened.count !== 1) {
        return { ok: false as const, reason: 'NOT_MATCHED' as const };
      }
      await tx.ride.update({
        where: { id: ride.id },
        data: { state: 'CANCELLED' },
      });
      const order = await tx.rideOrder.findUnique({ where: { id: orderId } });
      return { ok: true as const, driver, order: order! };
    });
  }

  async getNewOrders() {
    return this.prisma.rideOrder.findMany({
      where: { status: ClientRequestState.NEW },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  isOpenStatus(status: string): boolean {
    return (
      status === ClientRequestState.NEW || status === ClientRequestState.MATCHED
    );
  }

  isActiveRideStatus(status: string): boolean {
    return status === ClientRequestState.MATCHED;
  }

  statusEmoji(status: string): string {
    switch (status) {
      case ClientRequestState.NEW:
        return '🟡';
      case ClientRequestState.PARTIAL_MATCH:
        return '🟠';
      case ClientRequestState.MATCHED:
        return '🟢';
      case ClientRequestState.EXPIRED:
        return '⚫';
      case ClientRequestState.CANCELLED:
        return '🔴';
      default:
        return '⚪';
    }
  }

  statusLabel(status: string): string {
    switch (status) {
      case ClientRequestState.NEW:
        return 'Kutilmoqda';
      case ClientRequestState.PARTIAL_MATCH:
        return 'Qisman mos';
      case ClientRequestState.MATCHED:
        return 'Mos keldi';
      case ClientRequestState.EXPIRED:
        return "Muddati o'tgan";
      case ClientRequestState.CANCELLED:
        return 'Bekor qilingan';
      default:
        return status;
    }
  }
}
