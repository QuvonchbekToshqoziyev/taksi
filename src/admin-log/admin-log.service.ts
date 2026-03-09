import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AdminLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    adminTgId: number;
    action: string;
    targetType: string;
    targetId: string;
    details?: string;
    previousValue?: string;
  }) {
    return this.prisma.adminLog.create({
      data: {
        adminTgId: BigInt(params.adminTgId),
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        details: params.details,
        previousValue: params.previousValue,
      },
    });
  }

  async getRecentLogs(limit = 20) {
    return this.prisma.adminLog.findMany({
      where: { restoredAt: null },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getLogsByType(targetType: string, limit = 20) {
    return this.prisma.adminLog.findMany({
      where: { targetType },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getLogById(id: number) {
    return this.prisma.adminLog.findUnique({ where: { id } });
  }

  async markRestored(id: number) {
    return this.prisma.adminLog.update({
      where: { id },
      data: { restoredAt: new Date() },
    });
  }
}
