import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DriverPostService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    driverId: number;
    fromName: string;
    toName: string;
    seats: number;
    price?: string;
    note?: string;
    channelMsgId?: number;
  }) {
    return this.prisma.driverPost.create({
      data: {
        driverId: data.driverId,
        fromName: data.fromName,
        toName: data.toName,
        seats: data.seats,
        price: data.price || null,
        note: data.note || null,
        channelMsgId: data.channelMsgId || null,
        status: 'active',
      },
    });
  }

  async getByDriver(driverId: number) {
    return this.prisma.driverPost.findMany({
      where: { driverId, status: 'active' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { driver: true },
    });
  }

  async getById(id: number) {
    return this.prisma.driverPost.findUnique({
      where: { id },
      include: { driver: true },
    });
  }

  async closePost(id: number) {
    return this.prisma.driverPost.update({
      where: { id },
      data: { status: 'closed' },
    });
  }
}
