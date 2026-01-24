// import { Command, Ctx, On, Update } from 'nestjs-telegraf';
// import { Context } from 'telegraf';
// import { RedirectService } from '../redirect/redirect.service';
// import { AdminService } from 'src/admin/admin.service';

// type SafeContext = Context & {
//     chat: {
//         id: number;
//         type: 'private' | 'group' | 'supergroup' | 'channel';
//         title?: string;
//     };
//     from: {
//         id: number;
//         username?: string;
//         first_name?: string;
//     };
//     message: any;
// };

// @Update()
// export class BotUpdate {
//     constructor(
//         private readonly redirectService: RedirectService,
//         private readonly adminService: AdminService,
//     ) { }

//     private waitingRedirect = new Set<number>();

//     private waitingPhone = new Map<number, {
//         text: string;
//         chatId: number;
//         messageId: number;
//     }>();

//     // ================= START =================

//     @Command('start')
//     async start(@Ctx() ctx: SafeContext) {
//         if (ctx.chat.type !== 'private') return;

//         if (this.waitingPhone.has(ctx.from.id)) {
//             return ctx.telegram.sendMessage(
//                 ctx.chat.id,
//                 '📞 Telefon raqamingizni yuboring',
//                 {
//                     reply_markup: {
//                         keyboard: [
//                             [{ text: '📲 Raqamni yuborish', request_contact: true }]
//                         ],
//                         resize_keyboard: true,
//                         one_time_keyboard: true
//                     }
//                 }
//             );
//         }

//         if (await this.adminService.isAdmin(ctx)) {
//             return ctx.telegram.sendMessage(ctx.chat.id, '👋 Salom Admin!\n/admin yozib panelni oching.');
//         }

//         return ctx.telegram.sendMessage(ctx.chat.id, '👋 Salom! Taxi botga xush kelibsiz.');
//     }

//     // ================= ADMIN PANEL =================

//     @Command('admin')
//     async adminPanel(@Ctx() ctx: SafeContext) {
//         if (ctx.chat.type !== 'private') return;
//         if (!(await this.adminService.isAdmin(ctx))) return;

//         return ctx.telegram.sendMessage(
//             ctx.chat.id,
//             '🔧 Admin panel:',
//             {
//                 reply_markup: {
//                     keyboard: [
//                         [{ text: '➕ Redirect qo\'shish' }],
//                         [{ text: '➖ Redirect o\'chirish' }],
//                         [{ text: '🗑 Delete ON' }, { text: '📌 Delete OFF' }],
//                     ],
//                     resize_keyboard: true
//                 }
//             }
//         );
//     }

//     // ================= TEXT =================

//     @On('text')
//     async onText(@Ctx() ctx: SafeContext) {
//         const text = ctx.message.text;

//         // ===== ADMIN =====
//         if (ctx.chat.type === 'private' && (await this.adminService.isAdmin(ctx))) {

//             if (text === '➕ Redirect qo\'shish') {
//                 this.waitingRedirect.add(ctx.from.id);
//                 return ctx.telegram.sendMessage(ctx.chat.id, 'Guruh yoki kanal @username yuboring');
//             }

//             if (this.waitingRedirect.has(ctx.from.id)) {
//                 try {
//                     const chat = await ctx.telegram.getChat(text.trim());
//                     const title = (chat as any).title || (chat as any).username || 'No title';

//                     await this.redirectService.addGroup({
//                         chatId: String(chat.id),
//                         title,
//                         addedById: ctx.from.id,
//                     });

//                     this.waitingRedirect.delete(ctx.from.id);
//                     return ctx.telegram.sendMessage(ctx.chat.id, `✅ ${title} qo‘shildi`);
//                 } catch {
//                     return ctx.telegram.sendMessage(ctx.chat.id, '❌ Bot guruhda admin bo‘lishi shart');
//                 }
//             }
//         }

//         // ===== USER =====
//         if (ctx.chat.type === 'private') return;
//         if (!this.containsKeyword(text)) return;

//         const phone = this.extractPhone(text);

//         if (phone) {
//             await this.forwardAll(ctx, phone);
//             return;
//         }

//         this.waitingPhone.set(ctx.from.id, {
//             text,
//             chatId: ctx.chat.id,
//             messageId: ctx.message.message_id,
//         });

//         const botUsername = process.env.BOT_USERNAME;

//         await ctx.telegram.sendMessage(
//             ctx.chat.id,
//             `${ctx.from.first_name}, raqamingizni yuboring:`,
//             {
//                 reply_markup: {
//                     inline_keyboard: [
//                         [{ text: '📲 Raqamni yuborish', url: `https://t.me/${botUsername}?start=send_phone` }]
//                     ]
//                 }
//             }
//         );
//     }

//     // ================= CONTACT =================

//     @On('contact')
//     async onContact(@Ctx() ctx: any) {
//         if (ctx.chat.type !== 'private') return;

//         const contact = ctx.message.contact;

//         if (contact.user_id !== ctx.from.id) {
//             return ctx.telegram.sendMessage(ctx.chat.id, '❌ Faqat o‘zingizning raqamingizni yuboring');
//         }

//         const data = this.waitingPhone.get(ctx.from.id);
//         if (!data) return;

//         this.waitingPhone.delete(ctx.from.id);

//         await this.forwardAll(ctx, contact.phone_number, data);
//     }

//     // ================= CORE FORWARD =================

//     private async forwardAll(
//         ctx: any,
//         phone: string,
//         data?: { chatId: number; messageId: number }
//     ) {
//         const groups = await this.redirectService.getActiveGroups();
//         let success = 0;

//         for (const group of groups) {
//             try {
//                 const targetChatId = Number(group.chatId);

//                 const fwd = await ctx.telegram.forwardMessage(
//                     targetChatId,
//                     data ? data.chatId : ctx.chat.id,
//                     data ? data.messageId : ctx.message.message_id
//                 );

//                 const name = ctx.from.first_name || 'User';
//                 const username = ctx.from.username ? `@${ctx.from.username}` : 'username yo‘q';

//                 await ctx.telegram.sendMessage(
//                     targetChatId,
//                     `👤 ${name}\n${username}\n📞 ${phone}`,
//                     { reply_to_message_id: fwd.message_id }
//                 );

//                 success++;
//             } catch (e) {
//                 console.log('XATO:', group.title, e.message);
//             }
//         }

//         if (success > 0) {
//             await ctx.telegram.sendMessage(
//                 data ? data.chatId : ctx.chat.id,
//                 `✅ Buyurtmangiz ${success} ta taxi kanalga yuborildi`
//             );
//         }
//     }

//     // ================= UTILS =================

//     private containsKeyword(text: string) {
//         return /(taxi|taksi|такси)/i.test(text);
//     }

//     private extractPhone(text: string): string | null {
//         const match = text.match(/\+?998\d{9}/);
//         return match ? match[0] : null;
//     }
// }import { Command, Ctx, On, Update } from 'nestjs-telegraf';
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
    private waitingPhone = new Map<number, {
        chatId: number;
        messageId: number;
    }>();
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

        await ctx.reply('Taxi bot ishga tushdi 🚕');
    }

    // ================= ADMIN =================

    @Command('admin')
    async admin(@Ctx() ctx: SafeContext) {
        if (ctx.chat.type !== 'private') return;
        if (!(await this.adminService.isAdmin(ctx))) return;

        await ctx.reply(
            '🔧 Admin panel:',
            Markup.keyboard([
                ['➕ Redirect qo‘shish'],
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

            if (text === '➕ Redirect qo‘shish') {
                this.waitingRedirect.add(ctx.from.id);
                await ctx.reply('Guruh yoki kanal @username yuboring');
                return;
            }

            if (text === '📋 Redirectlar') {
                const groups = await this.redirectService.getActiveGroups();
                if (!groups.length) {
                    await ctx.reply('Redirect yo‘q');
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
                    const chat = await ctx.telegram.getChat(text.trim());

                    await this.redirectService.addGroup({
                        chatId: String(chat.id),
                        title: (chat as any).title || (chat as any).username,
                        addedById: ctx.from.id,
                    });

                    this.waitingRedirect.delete(ctx.from.id);
                    await ctx.reply('✅ Redirect qo‘shildi');
                } catch {
                    await ctx.reply('❌ Bot redirect kanalida admin emas');
                }
                return;
            }
        }

        /* ===== USER ===== */

        if (ctx.chat.type === 'private') return;

        // redirect joylarda jim
        const groups = await this.redirectService.getActiveGroups();
        const redirectIds = groups.map(g => String(g.chatId));
        if (redirectIds.includes(String(ctx.chat.id))) return;

        // 1️⃣ agar user raqam yuborgan bo‘lsa
        const phoneFromText = this.extractPhone(text);
        const waiting = this.waitingPhone.get(ctx.from.id);

        if (phoneFromText && waiting) {
            this.waitingPhone.delete(ctx.from.id);

            // Telefon xabarini o'chirish
            try {
                await ctx.telegram.deleteMessage(
                    ctx.chat.id,
                    ctx.message.message_id
                );
            } catch (e) {
                console.log('DELETE PHONE ERROR:', e.message);
            }

            await this.forwardAll(ctx, phoneFromText, waiting);
            return;
        }

        // 2️⃣ agar bu yangi zakaz bo‘lsa
        if (!this.isTaxiOrder(text)) return;

        const phone = this.extractPhone(text);

        if (phone) {
            await this.forwardAll(ctx, phone);
            return;
        }

        try {
            await ctx.telegram.deleteMessage(
                ctx.chat.id,
                ctx.message.message_id
            );
        } catch (e) {
            console.log('DELETE ORIGINAL ERROR:', e.message);
        }

        this.waitingPhone.set(ctx.from.id, {
            chatId: ctx.chat.id,
            messageId: ctx.message.message_id,
        });

        await ctx.reply(
            `${ctx.from.first_name}, raqamingizni yozib yuboring:`
        );

    }

    // ================= PHONE =================

    @On('contact')
    async onContact(@Ctx() ctx: any) {
        const data = this.waitingPhone.get(ctx.from.id);
        if (!data) return;

        this.waitingPhone.delete(ctx.from.id);
        await this.forwardAll(ctx, ctx.message.contact.phone_number, data);
    }

    @On('text')
    async onPhoneText(@Ctx() ctx: any) {
        const phone = this.extractPhone(ctx.message.text);
        if (!phone) return;

        const data = this.waitingPhone.get(ctx.from.id);
        if (!data) return;

        this.waitingPhone.delete(ctx.from.id);
        try {
            await ctx.telegram.deleteMessage(
                ctx.chat.id,
                ctx.message.message_id
            );
        } catch {

        }

        await this.forwardAll(ctx, phone, data);
    }
    // ================= FORWARD =================

    private async forwardAll(ctx: any, phone: string, data?: any) {
        const groups = await this.redirectService.getActiveGroups();
        let success = 0;

        // source har doim user yozgan joy
        const sourceChatId = data ? data.chatId : ctx.chat.id;
        const sourceMessageId = data ? data.messageId : ctx.message.message_id;
        const originalText = ctx.message.text || '';

        for (const g of groups) {
            const target = Number(g.chatId);

            try {
                // 1. oddiy forward
                const fwd = await ctx.telegram.forwardMessage(
                    target,
                    sourceChatId,
                    sourceMessageId
                );

                await ctx.telegram.sendMessage(
                    target,
                    `👤 ${ctx.from.first_name || ''}\n@${ctx.from.username || 'no_username'}\n📞 ${phone}`,
                    { reply_to_message_id: fwd.message_id }
                );

                success++;

            } catch (e) {

                // 2. agar protected bo‘lsa → copy mode
                try {
                    await ctx.telegram.sendMessage(
                        target,
                        `${originalText}

👤 ${ctx.from.first_name || ''}
@${ctx.from.username || 'no_username'}
📞 ${phone}`
                    );
                    success++;
                } catch (err) {
                    console.log('COPY ERROR:', g.title);
                }
            }
        }

        // 🔥 ORIGINAL E’LONNI O‘CHIRISH
        if (success > 0) {
            try {
                await ctx.telegram.deleteMessage(
                    sourceChatId,
                    sourceMessageId
                );
            } catch (e) {
                console.log('DELETE ERROR: bot admin emas yoki huquq yo‘q');
            }
        }

        // const mention = `<a href="tg://user?id=${ctx.from.id}">${ctx.from.first_name || 'Foydalanuvchi'}</a>`;

        await ctx.telegram.sendMessage(
            sourceChatId,
            success > 0
                ? `✅ ${ctx.from.first_name || 'Foydalanuvchi'}, xabaringiz taksistlarga yuborildi, tez orada sizga bog'lanishadi`
                : `❌ ${ctx.from.first_name || 'Foydalanuvchi'}, hech qaysi kanalga ketmadi`,
            {
                parse_mode: 'HTML'
            }
        );


    }


    // ================= CALLBACK =================

    @On('callback_query')
    async onCallback(@Ctx() ctx: any) {
        const data = ctx.callbackQuery.data;

        if (data.startsWith('remove:')) {
            const chatId = data.split(':')[1];
            await this.redirectService.removeGroup(chatId);
            await ctx.answerCbQuery('O‘chirildi');
            await ctx.editMessageText('❌ Redirect o‘chirildi');
        }

        if (data.startsWith('delete:')) {
            const [, chatId, mode] = data.split(':');
            await this.redirectService.setDeleteFlag(chatId, mode === 'on');
            await ctx.answerCbQuery('Saqlanди');
            await ctx.editMessageText('✅ O‘zgartirildi');
        }
    }
}
