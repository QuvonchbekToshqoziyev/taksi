import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Context } from 'telegraf';
import { Message } from 'typegram';

type TextContext = Context & {
    message: Message.TextMessage;
    chat: { id: number };
    from: {
        id: number;
        username?: string;
        first_name?: string;
        last_name?: string;
    };
};

@Injectable()
export class AdminService implements OnModuleInit {
    constructor(private readonly prisma: PrismaService) { }

    // 1. App ishga tushganda default superadmin yaratadi
    async onModuleInit() {
        const tgIdEnv = process.env.SUPERADMIN_TG_ID;

        if (!tgIdEnv) {
            console.warn('⚠️ SUPERADMIN_TG_ID env yo\'q');
            return;
        }

        const defaultTgId = BigInt(tgIdEnv);

        const exists = await this.prisma.botAdmin.findUnique({
            where: { tgId: defaultTgId },
        });

        if (!exists) {
            await this.prisma.botAdmin.create({
                data: {
                    tgId: defaultTgId,
                    username: 'superadmin',
                    fullName: 'Super Admin',
                    isSuper: true,
                },
            });

            console.log('✅ Default superadmin yaratildi');
        } else {
            console.log('ℹ️ Superadmin allaqachon mavjud');
        }
    }
    async isSuperAdmin(userId: number): Promise<boolean> {
        const admin = await this.prisma.botAdmin.findUnique({
            where: { tgId: BigInt(userId) },
        });
        return !!admin?.isSuper;
    }
    async isAdmin(ctx: TextContext): Promise<boolean> {
        // 1. Agar private chat bo‘lsa → faqat DB tekshiramiz
        if (ctx.chat.type === 'private') {
            const dbAdmin = await this.prisma.botAdmin.findUnique({
                where: { tgId: BigInt(ctx.from.id) },
            });
            return !!dbAdmin;
        }

        // 2. Agar group/channel bo‘lsa → Telegram + DB
        let isTgAdmin = false;
        try {
            const tgAdmins = await ctx.telegram.getChatAdministrators(ctx.chat.id);
            isTgAdmin = tgAdmins.some(a => a.user.id === ctx.from.id);
        } catch {
            isTgAdmin = false;
        }

        const dbAdmin = await this.prisma.botAdmin.findUnique({
            where: { tgId: BigInt(ctx.from.id) },
        });

        return isTgAdmin || !!dbAdmin;
    }


    // 3. DB admin yaratish yoki olish
    async getOrCreateAdmin(ctx: TextContext) {
        let admin = await this.prisma.botAdmin.findUnique({
            where: { tgId: BigInt(ctx.from.id) },
        });

        if (!admin) {
            admin = await this.prisma.botAdmin.create({
                data: {
                    tgId: BigInt(ctx.from.id),
                    username: ctx.from.username,
                    fullName: `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`,
                    isSuper: false,
                },
            });
        }

        return admin;
    }
}
