import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TargetService {
    constructor(private prisma: PrismaService) {}

    getActiveGroups() {
        return this.prisma.targetGroup.findMany({
            where: { isActive: true },
        });
    }

    async addGroup(data: { chatId: string; title: string }) {
        return this.prisma.targetGroup.upsert({
            where: { chatId: data.chatId },
            update: {
                title: data.title,
                isActive: true,
                removedAt: null,
            },
            create: data,
        });
    }

    async removeGroup(chatId: string) {
        return this.prisma.targetGroup.updateMany({
            where: { chatId },
            data: {
                isActive: false,
                removedAt: new Date(),
            },
        });
    }

    async isTargetGroup(chatId: string): Promise<boolean> {
        const group = await this.prisma.targetGroup.findUnique({
            where: { chatId },
        });
        return !!group?.isActive;
    }
}
