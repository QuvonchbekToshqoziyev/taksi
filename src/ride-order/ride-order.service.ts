import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RideOrderService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userTgId: number;
    fromName: string;
    toName: string;
    passengers: number;
    phone: string;
  }) {
    return this.prisma.rideOrder.create({
      data: {
        userTgId: BigInt(data.userTgId),
        fromName: data.fromName,
        toName: data.toName,
        passengers: data.passengers,
        phone: data.phone,
        status: 'active',
      },
    });
  }

  async getByUser(userTgId: number) {
    return this.prisma.rideOrder.findMany({
      where: { userTgId: BigInt(userTgId) },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async getActiveByUser(userTgId: number) {
    return this.prisma.rideOrder.findMany({
      where: { userTgId: BigInt(userTgId), status: 'active' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(id: number) {
    return this.prisma.rideOrder.findUnique({ where: { id } });
  }

  async updateStatus(id: number, status: 'active' | 'completed' | 'cancelled') {
    return this.prisma.rideOrder.update({
      where: { id },
      data: { status },
    });
  }

  statusEmoji(status: string): string {
    switch (status) {
      case 'active': return '🟡🟡🟡🟡🟡';
      case 'completed': return '🟢🟢🟢🟢🟢';
      case 'cancelled': return '🔴🔴🔴🔴🔴';
      default: return '⚪⚪⚪⚪⚪';
    }
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'active': return 'Faol';
      case 'completed': return 'Tugallangan';
      case 'cancelled': return 'Bekor qilingan';
      default: return status;
    }
  }
}
