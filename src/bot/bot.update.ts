import { Command, Ctx, On, Update } from 'nestjs-telegraf';
import { AdminService } from 'src/admin/admin.service';
import { Context, Markup } from 'telegraf';
import { RedirectService } from '../redirect/redirect.service';

type SafeContext = Context & {
    chat: {
        id: number;
        type: 'private' | 'group' | 'supergroup' | 'channel';
        title?: string;
    };
    from: {
        id: number;
        username?: string;
        first_name?: string;
        last_name?: string;
    };
    message: any;
};

@Update()
export class BotUpdate {
    constructor(
        private readonly redirectService: RedirectService,
        private readonly adminService: AdminService,
    ) { }

    private waitingRedirect = new Set<number>();

    // ================= FILTER =================

    private DRIVER_WORDS = [
        // lotin
        'olamiz',
        'odam olamiz',
        'pochta olamiz',
        'yolovchi olamiz',
        'taksi bor',
        'taxi bor',
        'mashina bor',
        'mashina bormi',
        'bosh mashina bor',
        'bosh taksi bor',
        'kim ketadi',
        'kim boradi',

        // кирилл
        'оламиз',
        'одам оламиз',
        'почта оламиз',
        'йўловчи оламиз',
        'такси бор',
        'машина бор',
        'машина борми',
        'бош машина бор',
        'бош такси бор',
        'ким кетади',
        'ким боради',
    ];

    private CLIENT_WORDS = [
        // lotin
        'taksi kerak',
        'taxi kerak',
        'taksi kere',
        'taxi kere',
        'kerak',
        'kere',
        'kk',
        'zakaz',
        'zakaz bor',
        'odam bor',
        'kishi bor',
        'pochta bor',
        'srochni',
        'hozirga',
        'xozirga',

        // кирилл
        'такси керак',
        'такси кере',
        'керак',
        'кере',
        'кк',
        'заказ',
        'заказ бор',
        'одам бор',
        'киши бор',
        'почта бор',
        'срочни',
        'хозирга',
    ];


    private isTaxiOrder(text: string): boolean {
        const t = text.toLowerCase();

        // 1. DRIVER → butunlay blok
        for (const w of this.DRIVER_WORDS) {
            if (t.includes(w)) return false;
        }

        // 2. CLIENT → ruxsat
        for (const w of this.CLIENT_WORDS) {
            if (t.includes(w)) return true;
        }

        return false;
    }

    private extractPhone(text: string): string | null {
        const m = text.match(
            /(\+?998\d{9}|\b(90|91|93|94|95|97|98|99)\d{7}\b)/
        );
        return m?.[0] || null;
    }

    // ================= START =================

    @Command('start')
    async start(@Ctx() ctx: SafeContext) {
        if (ctx.chat.type !== 'private') return;

        if (await this.adminService.isAdmin(ctx)) {
            await ctx.reply('👋 Salom Admin!\n/admin yozing.');
            return;
        }

        await ctx.reply('Taxi bot ishga tushdi 🚕\n\nZakaz berish uchun xabar yuboring.');
    }

    // ================= ADMIN =================

    @Command('admin')
    async admin(@Ctx() ctx: SafeContext) {
        if (ctx.chat.type !== 'private') return;
        if (!(await this.adminService.isAdmin(ctx))) return;

        await ctx.reply(
            '🔧 Admin panel:',
            Markup.keyboard([
                ['➕ Redirect qo\'shish'],
                ['📋 Redirectlar'],
                ['🗑 Delete ON', '📌 Delete OFF'],
            ]).resize()
        );
    }

    // ================= TEXT =================

    @On('text')
    async onText(@Ctx() ctx: SafeContext) {
        const text = ctx.message.text;

        /* ===== ADMIN ===== */
        if (ctx.chat.type === 'private' && (await this.adminService.isAdmin(ctx))) {

            if (text === '➕ Redirect qo\'shish') {
                this.waitingRedirect.add(ctx.from.id);
                await ctx.reply('Guruh yoki kanal @username yuboring');
                return;
            }

            if (text === '📋 Redirectlar') {
                const groups = await this.redirectService.getActiveGroups();
                if (!groups.length) {
                    await ctx.reply('Redirect yo\'q');
                    return;
                }

                const buttons = groups.map(g => [
                    Markup.button.callback(g.title, `remove:${g.chatId}`)
                ]);

                await ctx.reply('Redirectlar:', Markup.inlineKeyboard(buttons));
                return;
            }

            if (text === '🗑 Delete ON' || text === '📌 Delete OFF') {
                const groups = await this.redirectService.getActiveGroups();
                const buttons = groups.map(g => [
                    Markup.button.callback(
                        g.title,
                        `delete:${g.chatId}:${text === '🗑 Delete ON' ? 'on' : 'off'}`
                    )
                ]);

                await ctx.reply('Qaysi redirect?', Markup.inlineKeyboard(buttons));
                return;
            }

            if (this.waitingRedirect.has(ctx.from.id)) {
                try {
                    let chatId: string;
                    try {
                        const chat = await ctx.telegram.getChat(text.trim());
                        chatId = String(chat.id);
                    } catch (err) {
                        await ctx.reply(
                            '⚠️ Private guruh bo\'lsa, bot guruhga qo\'shilgan bo\'lishi va biror xabar yuborilishi kerak. ' +
                            'Keyin /getid yuboring va ID sini yuboring.'
                        );
                        return;
                    }

                    await this.redirectService.addGroup({
                        chatId,
                        title: (ctx.message.chat?.title || text.trim()),
                        addedById: ctx.from.id,
                    });

                    this.waitingRedirect.delete(ctx.from.id);
                    await ctx.reply('✅ Redirect qo\'shildi');
                } catch {
                    await ctx.reply('❌ Bot redirect kanalida admin emas yoki xatolik yuz berdi');
                }
                return;
            }
        }


        /* ===== USER ===== */

        // ✅ Private chatda ham zakaz qabul qilish
        const isPrivate = ctx.chat.type === 'private';
        const isAdmin = await this.adminService.isAdmin(ctx);

        // Agar private va admin bo'lsa - yuqoridagi admin komandalar ishlaydi
        if (isPrivate && isAdmin) {
            return; // Admin komandalar bajarilgan
        }

        // redirect joylarda jim (faqat guruh/kanal uchun)
        if (!isPrivate) {
            const groups = await this.redirectService.getActiveGroups();
            const redirectIds = groups.map(g => String(g.chatId));
            if (redirectIds.includes(String(ctx.chat.id))) return;
        }

        // ✅ Zakaz tekshirish
        if (!this.isTaxiOrder(text)) {
            // ✅ Private chatda zakaz so'zi bo'lmasa ham qabul qilish
            if (!isPrivate) return;
        }

        const phone = this.extractPhone(text);

        // ✅ Raqam bor yoki yo'qligidan qat'iy nazar - forward qilish
        if (phone) {
            await this.forwardAll(ctx, phone);
        } else {
            await this.forwardOrderWithoutPhone(ctx);
        }
    }

    // ================= FORWARD =================

    private async forwardAll(ctx: any, phone: string, data?: any) {
        const groups = await this.redirectService.getActiveGroups();
        let success = 0;
        let protected_count = 0;

        const sourceChatId = data ? data.chatId : ctx.chat.id;
        const originalText = data ? data.text : (ctx.message.text || '');

        for (const g of groups) {
            const target = Number(g.chatId);

            if (data) {
                // ✅ NOMERSIZ - COPY MODE
                try {
                    await ctx.telegram.sendMessage(
                        target,
                        `${originalText}

👤 ${ctx.from.first_name || ''}
@${ctx.from.username || 'no_username'}
📞 ${phone}`
                    );
                    success++;
                } catch (e: any) {
                    if (e.description?.includes('CHAT_WRITE_FORBIDDEN') ||
                        e.description?.includes('protected')) {
                        console.log('PROTECTED GROUP:', g.title);
                        protected_count++;
                    } else {
                        console.log('COPY ERROR:', g.title, e.message);
                    }
                }
            } else {
                // ✅ NOMER BILAN - FORWARD MODE
                try {
                    const fwd = await ctx.telegram.forwardMessage(
                        target,
                        sourceChatId,
                        ctx.message.message_id
                    );

                    await ctx.telegram.sendMessage(
                        target,
                        `👤 ${ctx.from.first_name || ''}\n@${ctx.from.username || 'no_username'}\n📞 ${phone}`,
                        { reply_to_message_id: fwd.message_id }
                    );

                    success++;
                } catch (e: any) {
                    // Forward ishlamasa - copy
                    try {
                        await ctx.telegram.sendMessage(
                            target,
                            `${originalText}

👤 ${ctx.from.first_name || ''}
@${ctx.from.username || 'no_username'}
📞 ${phone}`
                        );
                        success++;
                    } catch (err: any) {
                        if (err.description?.includes('CHAT_WRITE_FORBIDDEN') ||
                            err.description?.includes('protected')) {
                            console.log('PROTECTED GROUP:', g.title);
                            protected_count++;
                        } else {
                            console.log('BOTH FAILED:', g.title);
                        }
                    }
                }
            }
        }

        // ✅ Faqat NOMER BILAN buyurtmada o'chirish
        if (!data && success > 0) {
            try {
                await ctx.telegram.deleteMessage(
                    sourceChatId,
                    ctx.message.message_id
                );
            } catch (e) {
                console.log('DELETE ERROR: bot admin emas');
            }
        }

        // ✅ Javob
        let message = '';
        if (success > 0) {
            message = `✅ ${ctx.from.first_name || 'Foydalanuvchi'}, xabaringiz ${success} ta kanalga yuborildi`;
            if (protected_count > 0) {
                message += `\n⚠️ ${protected_count} ta himoyalangan guruhga yuborilmadi (botni admin qiling)`;
            }
        } else {
            message = `❌ ${ctx.from.first_name || 'Foydalanuvchi'}, hech qaysi kanalga ketmadi`;
            if (protected_count > 0) {
                message += `\n⚠️ ${protected_count} ta guruh himoyalangan (botni admin qiling)`;
            }
        }

        const sentMessage = await ctx.telegram.sendMessage(
            sourceChatId,
            message,
            { parse_mode: 'HTML' }
        );

        setTimeout(async () => {
            try {
                await ctx.telegram.deleteMessage(
                    sourceChatId,
                    sentMessage.message_id
                );
            } catch (e) {
                console.log('AUTO DELETE ERROR:', e.message);
            }
        }, 5000);
    }

    // ================= FORWARD WITHOUT PHONE =================

    private async forwardOrderWithoutPhone(ctx: any) {
        const groups = await this.redirectService.getActiveGroups();
        let success = 0;
        let protected_count = 0;

        for (const g of groups) {
            const target = Number(g.chatId);

            try {
                // ✅ Try forward first
                await ctx.telegram.forwardMessage(
                    target,
                    ctx.chat.id,
                    ctx.message.message_id
                );
                success++;
            } catch (e: any) {
                // Forward ishlamasa - copy
                try {
                    await ctx.telegram.sendMessage(
                        target,
                        `${ctx.message.text}

👤 ${ctx.from.first_name || ''}
@${ctx.from.username || 'no_username'}`
                    );
                    success++;
                } catch (err: any) {
                    if (err.description?.includes('CHAT_WRITE_FORBIDDEN') ||
                        err.description?.includes('protected')) {
                        console.log('PROTECTED GROUP:', g.title);
                        protected_count++;
                    } else {
                        console.log('BOTH FAILED:', g.title);
                    }
                }
            }
        }

        // ✅ Original xabarni o'chirish
        if (success > 0) {
            try {
                await ctx.telegram.deleteMessage(
                    ctx.chat.id,
                    ctx.message.message_id
                );
            } catch (e) {
                console.log('DELETE ERROR: bot admin emas');
            }
        }

        // ✅ Javob
        let message = '';
        if (success > 0) {
            message = `✅ ${ctx.from.first_name || 'Foydalanuvchi'}, xabaringiz ${success} ta kanalga yuborildi`;
            if (protected_count > 0) {
                message += `\n⚠️ ${protected_count} ta himoyalangan guruhga yuborilmadi (botni admin qiling)`;
            }
        } else {
            message = `❌ ${ctx.from.first_name || 'Foydalanuvchi'}, hech qaysi kanalga ketmadi`;
            if (protected_count > 0) {
                message += `\n⚠️ ${protected_count} ta guruh himoyalangan (botni admin qiling)`;
            }
        }

        const sentMessage = await ctx.telegram.sendMessage(
            ctx.chat.id,
            message,
            { parse_mode: 'HTML' }
        );

        setTimeout(async () => {
            try {
                await ctx.telegram.deleteMessage(
                    ctx.chat.id,
                    sentMessage.message_id
                );
            } catch (e) {
                console.log('AUTO DELETE ERROR:', e.message);
            }
        }, 5000);
    }
    @Command('getid')
    async getId(@Ctx() ctx: any) {
        await ctx.reply(`Guruh ID: ${ctx.chat.id}`);
        console.log('Guruh chat ID:', ctx.chat.id);
    }

    // ================= CALLBACK =================

    @On('callback_query')
    async onCallback(@Ctx() ctx: any) {
        const data = ctx.callbackQuery.data;

        if (data.startsWith('remove:')) {
            const chatId = data.split(':')[1];
            await this.redirectService.removeGroup(chatId);
            await ctx.answerCbQuery('O\'chirildi');
            await ctx.editMessageText('❌ Redirect o\'chirildi');
        }

        if (data.startsWith('delete:')) {
            const [, chatId, mode] = data.split(':');
            await this.redirectService.setDeleteFlag(chatId, mode === 'on');
            await ctx.answerCbQuery('Saqlandi');
            await ctx.editMessageText('✅ O\'zgartirildi');
        }
    }
}