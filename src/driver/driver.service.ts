import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StateManager } from '../core/state/state.manager';
import { DriverState } from '../core/state/state.types';

@Injectable()
export class DriverService {
  private readonly logger = new Logger(DriverService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stateManager: StateManager,
  ) {}

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
        status: DriverState.OFFLINE,
        seatsAvailable: 4,
        features: [],
      },
    });
  }

  async getByTgId(tgId: number) {
    return this.prisma.driver.findUnique({ where: { tgId: BigInt(tgId) } });
  }

  async getById(id: number) {
    return this.prisma.driver.findUnique({ where: { id } });
  }

  async getPendingApproval() {
    return this.prisma.driver.findMany({
      where: { isApproved: false },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
  }

  async setApproval(id: number, isApproved: boolean) {
    return this.prisma.driver.update({
      where: { id },
      data: {
        isApproved,
        status: DriverState.OFFLINE,
      },
    });
  }

  async updateState(tgId: number, newState: DriverState): Promise<boolean> {
    const driver = await this.getByTgId(tgId);
    if (!driver) {
      this.logger.warn(`Driver not found: ${tgId}`);
      return false;
    }

    const isValid = this.stateManager.transitionDriverState(
      driver.status as DriverState,
      newState,
    );

    if (!isValid) {
      this.logger.warn(
        `Invalid state transition for driver ${tgId}: ${driver.status} -> ${newState}`,
      );
      return false;
    }

    await this.prisma.driver.update({
      where: { tgId: BigInt(tgId) },
      data: {
        status: newState,
        lastActive: new Date(),
      },
    });

    this.logger.log(`Driver ${tgId} state changed to ${newState}`);
    return true;
  }

  async updateProfile(
    tgId: number,
    data: Partial<{
      fullName: string;
      phone: string;
      carNumber: string;
      carPhotoId: string;
    }>,
  ) {
    return this.prisma.driver.update({
      where: { tgId: BigInt(tgId) },
      data,
    });
  }

  statusEmoji(status: string): string {
    switch (status) {
      case DriverState.AVAILABLE:
        return '🟢';
      case DriverState.FULL:
        return '🔴';
      case DriverState.EN_ROUTE:
        return '🚗';
      case DriverState.OFFLINE:
        return '⚫';
      default:
        return '⚪';
    }
  }

  statusLabel(status: string): string {
    switch (status) {
      case DriverState.AVAILABLE:
        return "Bo'sh";
      case DriverState.FULL:
        return "To'la";
      case DriverState.EN_ROUTE:
        return "Yo'lda";
      case DriverState.OFFLINE:
        return "O'chirilgan";
      default:
        return status;
    }
  }

  async updateRoute(
    tgId: number,
    fromLocation: string,
    toLocation: string,
  ): Promise<boolean> {
    const driver = await this.getByTgId(tgId);
    if (!driver) return false;

    await this.prisma.driver.update({
      where: { tgId: BigInt(tgId) },
      data: {
        fromLocation,
        toLocation,
        lastActive: new Date(),
      },
    });

    this.logger.log(
      `Driver ${tgId} route updated: ${fromLocation} -> ${toLocation}`,
    );
    return true;
  }

  async updateSeats(tgId: number, seats: number): Promise<boolean> {
    const driver = await this.getByTgId(tgId);
    if (!driver) return false;

    await this.prisma.driver.update({
      where: { tgId: BigInt(tgId) },
      data: {
        seatsAvailable: Math.max(0, Math.min(9, seats)),
        lastActive: new Date(),
      },
    });

    this.logger.log(`Driver ${tgId} seats updated to ${seats}`);
    return true;
  }

  async updateFeatures(tgId: number, features: string[]): Promise<boolean> {
    const driver = await this.getByTgId(tgId);
    if (!driver) return false;

    await this.prisma.driver.update({
      where: { tgId: BigInt(tgId) },
      data: {
        features,
        lastActive: new Date(),
      },
    });

    this.logger.log(`Driver ${tgId} features updated: ${features.join(', ')}`);
    return true;
  }

  async getAvailableDrivers() {
    return this.prisma.driver.findMany({
      where: {
        status: DriverState.AVAILABLE,
        isApproved: true,
        seatsAvailable: { gt: 0 },
      },
      orderBy: {
        lastActive: 'desc',
      },
    });
  }
}
