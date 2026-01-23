import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RedirectService {
    constructor(private prisma: PrismaService) { }

    getActiveGroups() {
        return this.prisma.redirectGroup.findMany({
            where: { isActive: true },
        });
    }

    async addGroup(data: {
        chatId: string;
        title: string;
        addedById: number;
    }) {
        return this.prisma.redirectGroup.upsert({
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
        return this.prisma.redirectGroup.updateMany({
            where: { chatId },
            data: {
                isActive: false,
                removedAt: new Date(),
            },
        });
    }

    // MUHIM: update emas, updateMany
    async setDeleteFlag(chatId: string, value: boolean) {
        return this.prisma.redirectGroup.updateMany({
            where: { chatId },
            data: { deleteOriginal: value },
        });
    }
}
