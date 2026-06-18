import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TargetService {
    private activeGroupsCache: Array<{ chatId: string; title: string; isActive: boolean }> | null = null;
    private activeGroupsCacheAt = 0;
    private readonly CACHE_TTL_MS = 5000;

    constructor(private prisma: PrismaService) {}

    private invalidateCache() {
        this.activeGroupsCache = null;
        this.activeGroupsCacheAt = 0;
    }

    private async getCachedActiveGroups() {
        const now = Date.now();
        if (this.activeGroupsCache && now - this.activeGroupsCacheAt < this.CACHE_TTL_MS) {
            return this.activeGroupsCache;
        }

        const groups = await this.prisma.targetGroup.findMany({
            where: { isActive: true },
            select: { chatId: true, title: true, isActive: true },
        });
        this.activeGroupsCache = groups;
        this.activeGroupsCacheAt = now;
        return groups;
    }

    async getActiveGroups() {
        return this.getCachedActiveGroups();
    }

    async addGroup(data: { chatId: string; title: string }) {
        const result = await this.prisma.targetGroup.upsert({
            where: { chatId: data.chatId },
            update: {
                title: data.title,
                isActive: true,
                removedAt: null,
            },
            create: data,
        });
        this.invalidateCache();
        return result;
    }

    async removeGroup(chatId: string) {
        const result = await this.prisma.targetGroup.updateMany({
            where: { chatId },
            data: {
                isActive: false,
                removedAt: new Date(),
            },
        });
        this.invalidateCache();
        return result;
    }

    async isTargetGroup(chatId: string): Promise<boolean> {
        const groups = await this.getCachedActiveGroups();
        return groups.some(g => g.chatId === chatId);
    }
}
