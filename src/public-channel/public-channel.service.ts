import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PublicChannelService {
  private activeChannelsCache: Array<{ chatId: string; title: string; isActive: boolean }> | null = null;
  private activeChannelsCacheAt = 0;
  private readonly CACHE_TTL_MS = 5000;

  constructor(private readonly prisma: PrismaService) {}

  private invalidateCache() {
    this.activeChannelsCache = null;
    this.activeChannelsCacheAt = 0;
  }

  private async getCachedActiveChannels() {
    const now = Date.now();
    if (this.activeChannelsCache && now - this.activeChannelsCacheAt < this.CACHE_TTL_MS) {
      return this.activeChannelsCache;
    }

    const channels = await this.prisma.publicChannel.findMany({
      where: { isActive: true },
      select: { chatId: true, title: true, isActive: true },
    });
    this.activeChannelsCache = channels;
    this.activeChannelsCacheAt = now;
    return channels;
  }

  async addChannel(data: { chatId: string; title: string }) {
    const result = await this.prisma.publicChannel.upsert({
      where: { chatId: data.chatId },
      update: { title: data.title, isActive: true },
      create: { chatId: data.chatId, title: data.title },
    });
    this.invalidateCache();
    return result;
  }

  async removeChannel(chatId: string) {
    const result = await this.prisma.publicChannel.update({
      where: { chatId },
      data: { isActive: false },
    });
    this.invalidateCache();
    return result;
  }

  async getActiveChannels() {
    return this.getCachedActiveChannels();
  }

  async getAll() {
    return this.prisma.publicChannel.findMany();
  }

  async deleteByChatId(chatId: string) {
    const result = await this.prisma.publicChannel.delete({ where: { chatId } });
    this.invalidateCache();
    return result;
  }
}
