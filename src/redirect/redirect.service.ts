import { Injectable } from '@nestjs/common';
import { RedirectGroup } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RedirectService {
    constructor(private prisma: PrismaService) { }

    // Default: faqat bitta redirect guruh/kanal ishlaydi
    private readonly SINGLE_REDIRECT_MODE = true;
    private readonly SINGLE_REDIRECT_CHAT_ID = '-1003872057304';
    private readonly SINGLE_REDIRECT_TITLE = 'Taksichi Bollar';

    private buildSingleRedirect(): RedirectGroup {
        return {
            id: 0,
            chatId: this.SINGLE_REDIRECT_CHAT_ID,
            title: this.SINGLE_REDIRECT_TITLE,
            isActive: true,
            deleteOriginal: false,
            addedById: BigInt(0),
            addedAt: new Date(0),
            removedAt: null,
        };
    }

    getActiveGroups() {
        if (this.SINGLE_REDIRECT_MODE) {
            return Promise.resolve([this.buildSingleRedirect()]);
        }

        return this.prisma.redirectGroup.findMany({
            where: { isActive: true },
        });
    }

    async addGroup(data: {
        chatId: string;
        title: string;
        addedById: number;
    }) {
        if (this.SINGLE_REDIRECT_MODE) {
            return this.buildSingleRedirect();
        }

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
        if (this.SINGLE_REDIRECT_MODE) {
            return { count: 1 };
        }

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
        if (this.SINGLE_REDIRECT_MODE) {
            return { count: 1 };
        }

        return this.prisma.redirectGroup.updateMany({
            where: { chatId },
            data: { deleteOriginal: value },
        });
    }
}
