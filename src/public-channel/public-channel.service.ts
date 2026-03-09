import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PublicChannelService {
  constructor(private readonly prisma: PrismaService) {}

  async addChannel(data: { chatId: string; title: string }) {
    return this.prisma.publicChannel.upsert({
      where: { chatId: data.chatId },
      update: { title: data.title, isActive: true },
      create: { chatId: data.chatId, title: data.title },
    });
  }

  async removeChannel(chatId: string) {
    return this.prisma.publicChannel.update({
      where: { chatId },
      data: { isActive: false },
    });
  }

  async getActiveChannels() {
    return this.prisma.publicChannel.findMany({ where: { isActive: true } });
  }

  async getAll() {
    return this.prisma.publicChannel.findMany({ where: { isActive: true } });
  }

  async deleteByChatId(chatId: string) {
    return this.prisma.publicChannel.delete({ where: { chatId } });
  }
}
