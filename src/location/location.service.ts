import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class LocationService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaults();
  }

  private async seedDefaults() {
    const defaults = ['Toshkent', 'Fargʻona'];
    for (const name of defaults) {
      const exists = await this.prisma.location.findFirst({
        where: { name, parentId: null },
      });
      if (!exists) {
        await this.prisma.location.create({ data: { name } });
        console.log(`📍 Default joylashuv yaratildi: ${name}`);
      }
    }
  }

  async getTopLevelLocations() {
    return this.prisma.location.findMany({
      where: { parentId: null, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async getChildren(parentId: number) {
    return this.prisma.location.findMany({
      where: { parentId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async getById(id: number) {
    return this.prisma.location.findUnique({ where: { id } });
  }

  async addLocation(name: string, parentId?: number) {
    return this.prisma.location.create({
      data: { name, parentId: parentId ?? null },
    });
  }

  async removeLocation(id: number) {
    return this.prisma.location.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async restoreLocation(id: number) {
    return this.prisma.location.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async getLocationWithParent(id: number) {
    return this.prisma.location.findUnique({
      where: { id },
      include: { parent: true },
    });
  }
}
