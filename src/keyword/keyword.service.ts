import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class KeywordService implements OnModuleInit {
    private clientKeywords: string[] = [];
    private driverKeywords: string[] = [];

    constructor(private prisma: PrismaService) {}

    async onModuleInit() {
        await this.reload();
    }

    async reload() {
        const all = await this.prisma.keyword.findMany();
        this.clientKeywords = all.filter(k => k.type === 'client').map(k => k.phrase);
        this.driverKeywords = all.filter(k => k.type === 'driver').map(k => k.phrase);
    }

    getClientKeywords(): string[] {
        return this.clientKeywords;
    }

    getDriverKeywords(): string[] {
        return this.driverKeywords;
    }

    async addKeyword(phrase: string, type: 'client' | 'driver') {
        const lower = phrase.toLowerCase().trim();
        if (!lower) throw new Error('Empty phrase');

        const kw = await this.prisma.keyword.upsert({
            where: { phrase: lower },
            update: { type },
            create: { phrase: lower, type },
        });
        await this.reload();
        return kw;
    }

    async removeKeyword(phrase: string) {
        const lower = phrase.toLowerCase().trim();
        await this.prisma.keyword.deleteMany({ where: { phrase: lower } });
        await this.reload();
    }

    async removeKeywordById(id: number) {
        await this.prisma.keyword.delete({ where: { id } }).catch(() => {});
        await this.reload();
    }

    async listKeywords(type?: 'client' | 'driver') {
        const where = type ? { type } : {};
        return this.prisma.keyword.findMany({ where, orderBy: { addedAt: 'desc' } });
    }
}
