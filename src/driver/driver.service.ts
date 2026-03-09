import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DriverService {
  constructor(private readonly prisma: PrismaService) {}

  async register(data: {
    tgId: number;
    fullName: string;
    phone: string;
    carNumber: string;
    carPhotoId?: string;
  }) {
    return this.prisma.driver.upsert({
      where: { tgId: BigInt(data.tgId) },
      update: {
        fullName: data.fullName,
        phone: data.phone,
        carNumber: data.carNumber,
        carPhotoId: data.carPhotoId || undefined,
      },
      create: {
        tgId: BigInt(data.tgId),
        fullName: data.fullName,
        phone: data.phone,
        carNumber: data.carNumber,
        carPhotoId: data.carPhotoId || null,
        status: 'idle',
      },
    });
  }

  async getByTgId(tgId: number) {
    return this.prisma.driver.findUnique({ where: { tgId: BigInt(tgId) } });
  }

  async getById(id: number) {
    return this.prisma.driver.findUnique({ where: { id } });
  }

  async updateStatus(tgId: number, status: 'on_road' | 'idle' | 'not_working') {
    return this.prisma.driver.update({
      where: { tgId: BigInt(tgId) },
      data: { status },
    });
  }

  async updateProfile(tgId: number, data: Partial<{
    fullName: string;
    phone: string;
    carNumber: string;
    carPhotoId: string;
  }>) {
    return this.prisma.driver.update({
      where: { tgId: BigInt(tgId) },
      data,
    });
  }

  statusEmoji(status: string): string {
    switch (status) {
      case 'on_road': return '🚗';
      case 'idle': return '🅿️';
      case 'not_working': return '🔴';
      default: return '⚪';
    }
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'on_road': return 'Yo\'lda';
      case 'idle': return 'Bo\'sh';
      case 'not_working': return 'Ishlamayapti';
      default: return status;
    }
  }
}
