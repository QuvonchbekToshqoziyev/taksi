// import { Command, Ctx, On, Update } from 'nestjs-telegraf';
// import { AdminService } from 'src/admin/admin.service';
// import { Context, Markup } from 'telegraf';
// import { RedirectService } from '../redirect/redirect.service';

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
//         last_name?: string;
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

//     // ================= FILTER =================
//     private DRIVER_WORDS: string[] = [
//         'olamiz', 'odam olamiz', 'pochta olamiz', 'yolovchi olamiz',
//         'taksi bor', 'taxi bor', 'mashina bor', 'mashina bormi',
//         'bosh mashina bor', 'bosh taksi bor', 'kim ketadi', 'kim boradi',
//         'оламиз', 'одам оламиз', 'почта оламиз', 'йўловчи оламиз',
//         'такси бор', 'машина бор', 'машина борми', 'бош машина бор',
//         'бош такси бор', 'ким кетади', 'ким боради'
//     ];

//     private CLIENT_WORDS_SINGLE: string[] = [
//         'taksi kerak', 'taxi kerak', 'taksi kere', 'taxi kere',
//         'kerak', 'kere', 'kk', 'zakaz', 'zakaz bor',
//         'odam bor', 'kishi bor', 'pochta bor', 'srochni',
//         'hozirga', 'xozirga',
//         'такси керак', 'такси кере', 'керак', 'кк', 'заказ', 'заказ бор',
//         'одам бор', 'киши бор', 'почта бор', 'срочни', 'хозирга'
//     ];

//     private CLIENT_WORDS_COMBO: string[][] = [
//         ['dandi oldida', '1 kishi'],
//         ['balnisani oldida', '2 kishi'],
//         ['stamatologia oldida', '1 kishi'],
//         ['eski xalq bank oldida', 'bir kishi'],
//         ['yangi bozorda', 'pochta bor'],
//         ['данди олдида', '1 киши'],
//         ['балнисанӣ олдида', '2 киши'],
//         ['стаматология олдида', '1 киши'],
//         ['эски халқ банк олдида', 'бир киши'],
//         ['янги бозорда', 'почта бор'],
//     ];

//     private isTaxiOrder(text: string): boolean {
//         const t = text.toLowerCase();

//         for (const w of this.DRIVER_WORDS) {
//             if (t.includes(w)) return false;
//         }

//         for (const w of this.CLIENT_WORDS_SINGLE) {
//             if (t.includes(w)) return true;
//         }

//         for (const pattern of this.CLIENT_WORDS_COMBO) {
//             if (pattern.every(p => t.includes(p))) return true;
//         }

//         return false;
//     }

//     private extractPhone(text: string): string | null {
//         const m = text.match(
//             /(\+?998\d{9}|\b(90|91|93|94|95|97|98|99)\d{7}\b)/
//         );
//         return m?.[0] || null;
//     }

//     // ================= START =================

//     @Command('start')
//     async start(@Ctx() ctx: SafeContext) {
//         if (ctx.chat.type !== 'private') return;

//         if (await this.adminService.isAdmin(ctx)) {
//             await ctx.reply('👋 Salom Admin!\n/admin yozing.');
//             return;
//         }

//         await ctx.reply('Taxi bot ishga tushdi 🚕\n\nZakaz berish uchun xabar yuboring.');
//     }

//     // ================= ADMIN =================

//     @Command('admin')
//     async admin(@Ctx() ctx: SafeContext) {
//         if (ctx.chat.type !== 'private') return;
//         if (!(await this.adminService.isAdmin(ctx))) return;

//         await ctx.reply(
//             '🔧 Admin panel:',
//             Markup.keyboard([
//                 ['➕ Redirect qo\'shish'],
//                 ['📋 Redirectlar'],
//                 ['🗑 Delete ON', '📌 Delete OFF'],
//             ]).resize()
//         );
//     }

//     // ================= TEXT =================

//     @On('text')
//     async onText(@Ctx() ctx: SafeContext) {
//         const text = ctx.message.text;

//         /* ===== ADMIN ===== */
//         if (ctx.chat.type === 'private' && (await this.adminService.isAdmin(ctx))) {

//             if (text === '➕ Redirect qo\'shish') {
//                 this.waitingRedirect.add(ctx.from.id);
//                 await ctx.reply('Guruh yoki kanal @username yuboring');
//                 return;
//             }

//             if (text === '📋 Redirectlar') {
//                 const groups = await this.redirectService.getActiveGroups();
//                 if (!groups.length) {
//                     await ctx.reply('Redirect yo\'q');
//                     return;
//                 }

//                 const buttons = groups.map(g => [
//                     Markup.button.callback(g.title, `remove:${g.chatId}`)
//                 ]);

//                 await ctx.reply('Redirectlar:', Markup.inlineKeyboard(buttons));
//                 return;
//             }

//             if (text === '🗑 Delete ON' || text === '📌 Delete OFF') {
//                 const groups = await this.redirectService.getActiveGroups();
//                 const buttons = groups.map(g => [
//                     Markup.button.callback(
//                         g.title,
//                         `delete:${g.chatId}:${text === '🗑 Delete ON' ? 'on' : 'off'}`
//                     )
//                 ]);

//                 await ctx.reply('Qaysi redirect?', Markup.inlineKeyboard(buttons));
//                 return;
//             }

//             if (this.waitingRedirect.has(ctx.from.id)) {
//                 try {
//                     let chatId: string;
//                     try {
//                         const chat = await ctx.telegram.getChat(text.trim());
//                         chatId = String(chat.id);
//                     } catch (err) {
//                         await ctx.reply(
//                             '⚠️ Private guruh bo\'lsa, bot guruhga qo\'shilgan bo\'lishi va biror xabar yuborilishi kerak. ' +
//                             'Keyin /getid yuboring va ID sini yuboring.'
//                         );
//                         return;
//                     }

//                     await this.redirectService.addGroup({
//                         chatId,
//                         title: (ctx.message.chat?.title || text.trim()),
//                         addedById: ctx.from.id,
//                     });

//                     this.waitingRedirect.delete(ctx.from.id);
//                     await ctx.reply('✅ Redirect qo\'shildi');
//                 } catch {
//                     await ctx.reply('❌ Bot redirect kanalida admin emas yoki xatolik yuz berdi');
//                 }
//                 return;
//             }
//         }


//         /* ===== USER ===== */

//         // ✅ Private chatda ham zakaz qabul qilish
//         const isPrivate = ctx.chat.type === 'private';
//         const isAdmin = await this.adminService.isAdmin(ctx);

//         // Agar private va admin bo'lsa - yuqoridagi admin komandalar ishlaydi
//         if (isPrivate && isAdmin) {
//             return; // Admin komandalar bajarilgan
//         }

//         // redirect joylarda jim (faqat guruh/kanal uchun)
//         if (!isPrivate) {
//             const groups = await this.redirectService.getActiveGroups();
//             const redirectIds = groups.map(g => String(g.chatId));
//             if (redirectIds.includes(String(ctx.chat.id))) return;
//         }

//         // ✅ Zakaz tekshirish
//         if (!this.isTaxiOrder(text)) {
//             // ✅ Private chatda zakaz so'zi bo'lmasa ham qabul qilish
//             if (!isPrivate) return;
//         }

//         const phone = this.extractPhone(text);

//         // ✅ Raqam bor yoki yo'qligidan qat'iy nazar - forward qilish
//         if (phone) {
//             await this.forwardAll(ctx, phone);
//         } else {
//             await this.forwardOrderWithoutPhone(ctx);
//         }
//     }

//     // ================= FORWARD =================

//     private async forwardAll(ctx: any, phone: string, data?: any) {
//         const groups = await this.redirectService.getActiveGroups();
//         let success = 0;
//         let protected_count = 0;

//         const sourceChatId = data ? data.chatId : ctx.chat.id;
//         const originalText = data ? data.text : (ctx.message.text || '');

//         for (const g of groups) {
//             const target = Number(g.chatId);

//             if (data) {
//                 // ✅ NOMERSIZ - COPY MODE
//                 try {
//                     await ctx.telegram.sendMessage(
//                         target,
//                         `${originalText}

// 👤 ${ctx.from.first_name || ''}
// @${ctx.from.username || 'no_username'}
// 📞 ${phone}`
//                     );
//                     success++;
//                 } catch (e: any) {
//                     if (e.description?.includes('CHAT_WRITE_FORBIDDEN') ||
//                         e.description?.includes('protected')) {
//                         console.log('PROTECTED GROUP:', g.title);
//                         protected_count++;
//                     } else {
//                         console.log('COPY ERROR:', g.title, e.message);
//                     }
//                 }
//             } else {
//                 // ✅ NOMER BILAN - FORWARD MODE
//                 try {
//                     const fwd = await ctx.telegram.forwardMessage(
//                         target,
//                         sourceChatId,
//                         ctx.message.message_id
//                     );

//                     await ctx.telegram.sendMessage(
//                         target,
//                         `👤 ${ctx.from.first_name || ''}\n@${ctx.from.username || 'no_username'}\n📞 ${phone}`,
//                         { reply_to_message_id: fwd.message_id }
//                     );

//                     success++;
//                 } catch (e: any) {
//                     // Forward ishlamasa - copy
//                     try {
//                         await ctx.telegram.sendMessage(
//                             target,
//                             `${originalText}

// 👤 ${ctx.from.first_name || ''}
// @${ctx.from.username || 'no_username'}
// 📞 ${phone}`
//                         );
//                         success++;
//                     } catch (err: any) {
//                         if (err.description?.includes('CHAT_WRITE_FORBIDDEN') ||
//                             err.description?.includes('protected')) {
//                             console.log('PROTECTED GROUP:', g.title);
//                             protected_count++;
//                         } else {
//                             console.log('BOTH FAILED:', g.title);
//                         }
//                     }
//                 }
//             }
//         }

//         // ✅ Faqat NOMER BILAN buyurtmada o'chirish
//         if (!data && success > 0) {
//             try {
//                 await ctx.telegram.deleteMessage(
//                     sourceChatId,
//                     ctx.message.message_id
//                 );
//             } catch (e) {
//                 console.log('DELETE ERROR: bot admin emas');
//             }
//         }

//         // ✅ Javob
//         let message = '';
//         if (success > 0) {
//             message = `✅ ${ctx.from.first_name || 'Foydalanuvchi'}, xabaringiz ${success} ta kanalga yuborildi`;
//             if (protected_count > 0) {
//                 message += `\n⚠️ ${protected_count} ta himoyalangan guruhga yuborilmadi (botni admin qiling)`;
//             }
//         } else {
//             message = `❌ ${ctx.from.first_name || 'Foydalanuvchi'}, hech qaysi kanalga ketmadi`;
//             if (protected_count > 0) {
//                 message += `\n⚠️ ${protected_count} ta guruh himoyalangan (botni admin qiling)`;
//             }
//         }

//         const sentMessage = await ctx.telegram.sendMessage(
//             sourceChatId,
//             message,
//             { parse_mode: 'HTML' }
//         );

//         setTimeout(async () => {
//             try {
//                 await ctx.telegram.deleteMessage(
//                     sourceChatId,
//                     sentMessage.message_id
//                 );
//             } catch (e) {
//                 console.log('AUTO DELETE ERROR:', e.message);
//             }
//         }, 5000);
//     }

//     // ================= FORWARD WITHOUT PHONE =================

//     private async forwardOrderWithoutPhone(ctx: any) {
//         const groups = await this.redirectService.getActiveGroups();
//         let success = 0;
//         let protected_count = 0;

//         for (const g of groups) {
//             const target = Number(g.chatId);

//             try {
//                 // ✅ Try forward first
//                 await ctx.telegram.forwardMessage(
//                     target,
//                     ctx.chat.id,
//                     ctx.message.message_id
//                 );
//                 success++;
//             } catch (e: any) {
//                 // Forward ishlamasa - copy
//                 try {
//                     await ctx.telegram.sendMessage(
//                         target,
//                         `${ctx.message.text}

// 👤 ${ctx.from.first_name || ''}
// @${ctx.from.username || 'no_username'}`
//                     );
//                     success++;
//                 } catch (err: any) {
//                     if (err.description?.includes('CHAT_WRITE_FORBIDDEN') ||
//                         err.description?.includes('protected')) {
//                         console.log('PROTECTED GROUP:', g.title);
//                         protected_count++;
//                     } else {
//                         console.log('BOTH FAILED:', g.title);
//                     }
//                 }
//             }
//         }

//         // ✅ Original xabarni o'chirish
//         if (success > 0) {
//             try {
//                 await ctx.telegram.deleteMessage(
//                     ctx.chat.id,
//                     ctx.message.message_id
//                 );
//             } catch (e) {
//                 console.log('DELETE ERROR: bot admin emas');
//             }
//         }

//         // ✅ Javob
//         let message = '';
//         if (success > 0) {
//             message = `✅ ${ctx.from.first_name || 'Foydalanuvchi'}, xabaringiz ${success} ta kanalga yuborildi`;
//             if (protected_count > 0) {
//                 message += `\n⚠️ ${protected_count} ta himoyalangan guruhga yuborilmadi (botni admin qiling)`;
//             }
//         } else {
//             message = `❌ ${ctx.from.first_name || 'Foydalanuvchi'}, hech qaysi kanalga ketmadi`;
//             if (protected_count > 0) {
//                 message += `\n⚠️ ${protected_count} ta guruh himoyalangan (botni admin qiling)`;
//             }
//         }

//         const sentMessage = await ctx.telegram.sendMessage(
//             ctx.chat.id,
//             message,
//             { parse_mode: 'HTML' }
//         );

//         setTimeout(async () => {
//             try {
//                 await ctx.telegram.deleteMessage(
//                     ctx.chat.id,
//                     sentMessage.message_id
//                 );
//             } catch (e) {
//                 console.log('AUTO DELETE ERROR:', e.message);
//             }
//         }, 5000);
//     }
//     @Command('getid')
//     async getId(@Ctx() ctx: any) {
//         await ctx.reply(`Guruh ID: ${ctx.chat.id}`);
//         console.log('Guruh chat ID:', ctx.chat.id);
//     }

//     // ================= CALLBACK =================

//     @On('callback_query')
//     async onCallback(@Ctx() ctx: any) {
//         const data = ctx.callbackQuery.data;

//         if (data.startsWith('remove:')) {
//             const chatId = data.split(':')[1];
//             await this.redirectService.removeGroup(chatId);
//             await ctx.answerCbQuery('O\'chirildi');
//             await ctx.editMessageText('❌ Redirect o\'chirildi');
//         }

//         if (data.startsWith('delete:')) {
//             const [, chatId, mode] = data.split(':');
//             await this.redirectService.setDeleteFlag(chatId, mode === 'on');
//             await ctx.answerCbQuery('Saqlandi');
//             await ctx.editMessageText('✅ O\'zgartirildi');
//         }
//     }
// }
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
  ) {}

  private waitingRedirect = new Set<number>();

  // ================= FILTER =================
  private DRIVER_WORDS: string[] = [
    'olamiz', 'odam olamiz', 'pochta olamiz', 'yolovchi olamiz',
    'taksi bor', 'taxi bor', 'mashina bor', 'mashina bormi',
    'bosh mashina bor', 'bosh taksi bor', 'kim ketadi', 'kim boradi',
    'оламиз', 'одам оламиз', 'почта оламиз', 'йўловчи оламиз',
    'такси бор', 'машина бор', 'машина борми', 'бош машина бор',
    'бош такси бор', 'ким кетади', 'ким боради'
  ];

  private CLIENT_WORDS_SINGLE: string[] = [
    'taksi kerak', 'taxi kerak', 'taksi kere', 'taxi kere',
    'kerak', 'kere', 'kk', 'zakaz', 'zakaz bor',
    'odam bor', 'kishi bor', 'pochta bor', 'srochni',
    'hozirga', 'xozirga',
    'такси керак', 'такси кере', 'керак', 'кк', 'заказ', 'заказ бор',
    'одам бор', 'киши бор', 'почта bor', 'срочни', 'хозирга'
  ];

  private CLIENT_WORDS_COMBO: string[][] = [
    ['dandi oldida', '1 kishi'],
    ['balnisani oldida', '2 kishi'],
    ['stamatologia oldida', '1 kishi'],
    ['eski xalq bank oldida', 'bir kishi'],
    ['yangi bozorda', 'pochta bor'],
    ['данди олдида', '1 киши'],
    ['балнисанӣ олдида', '2 киши'],
    ['стаматология олдида', '1 киши'],
    ['эски халқ банк олдида', 'бир киши'],
    ['янги бозорда', 'pochta bor'],
  ];

  private isTaxiOrder(text: string): boolean {
    const t = (text || '').toLowerCase();

    for (const w of this.DRIVER_WORDS) {
      if (t.includes(w)) return false;
    }

    for (const w of this.CLIENT_WORDS_SINGLE) {
      if (t.includes(w)) return true;
    }

    for (const pattern of this.CLIENT_WORDS_COMBO) {
      if (pattern.every(p => t.includes(p))) return true;
    }

    return false;
  }

  private extractPhone(text: string): string | null {
    const m = (text || '').match(/(\+?998\d{9}|\b(90|91|93|94|95|97|98|99)\d{7}\b)/);
    return m?.[0] || null;
  }

  // ================== SAFETY HELPERS (429 + DELAY + ERROR CHECK) ==================

  private sleep(ms: number) {
    return new Promise(res => setTimeout(res, ms));
  }

  /**
   * 429 bo'lsa retry_after ga ko'ra kutib qayta urinish.
   * Boshqa error bo'lsa tashlab yuboradi.
   */
  private async tgSafe<T>(fn: () => Promise<T>): Promise<T> {
    while (true) {
      try {
        return await fn();
      } catch (e: any) {
        const code = e?.response?.error_code;
        const retryAfter = e?.response?.parameters?.retry_after;

        if (code === 429 && retryAfter) {
          // Telegram aytgan sekund + 1s zaxira
          await this.sleep((retryAfter + 1) * 1000);
          continue;
        }
        throw e;
      }
    }
  }

  /**
   * Juda tez yubormaslik uchun kichik delay
   */
  private async tgDelay() {
    await this.sleep(120); // 120-250ms yaxshi
  }

  private getErrDesc(e: any): string {
    return e?.response?.description || e?.description || e?.message || '';
  }

  private isWriteForbidden(e: any): boolean {
    const d = this.getErrDesc(e);
    return (
      d.includes('CHAT_WRITE_FORBIDDEN') ||
      d.includes('Forbidden') ||
      d.includes('bot was kicked') ||
      d.includes('not a member')
    );
  }

  private isProtectedError(e: any): boolean {
    const d = this.getErrDesc(e).toLowerCase();
    // telegram textlar har xil bo'lishi mumkin
    return d.includes('protected') || d.includes('content is protected');
  }

  private escapeHtml(v: any) {
    return String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private buildCopyText(ctx: any, originalText: string, phone?: string) {
    const name = this.escapeHtml(ctx.from?.first_name || '');
    const username = ctx.from?.username ? `@${this.escapeHtml(ctx.from.username)}` : 'no_username';
    const text = this.escapeHtml(originalText || '');

    return `${text}

👤 ${name}
${username}${phone ? `\n📞 ${this.escapeHtml(phone)}` : ''}`;
  }

  /**
   * SendMessage ham 429 bilan himoyalangan
   */
  private async safeSendMessage(ctx: any, chatId: number, text: string, extra?: any) {
    return this.tgSafe(() => ctx.telegram.sendMessage(chatId, text, extra));
  }

  /**
   * Forward ham 429 bilan himoyalangan
   */
  private async safeForward(ctx: any, targetId: number, sourceId: number, messageId: number) {
    return this.tgSafe(() => ctx.telegram.forwardMessage(targetId, sourceId, messageId));
  }

  /**
   * Delete ham 429 bilan himoyalangan
   */
  private async safeDelete(ctx: any, chatId: number, messageId: number) {
    return this.tgSafe(() => ctx.telegram.deleteMessage(chatId, messageId));
  }

  // ================= START =================
  @Command('start')
  async start(@Ctx() ctx: SafeContext) {
    if (ctx.chat.type !== 'private') return;

    if (await this.adminService.isAdmin(ctx)) {
      await this.tgSafe(() => ctx.reply('👋 Salom Admin!\n/admin yozing.'));
      return;
    }

    await this.tgSafe(() => ctx.reply('Taxi bot ishga tushdi 🚕\n\nZakaz berish uchun xabar yuboring.'));
  }

  // ================= ADMIN =================
  @Command('admin')
  async admin(@Ctx() ctx: SafeContext) {
    if (ctx.chat.type !== 'private') return;
    if (!(await this.adminService.isAdmin(ctx))) return;

    await this.tgSafe(() =>
      ctx.reply(
        '🔧 Admin panel:',
        Markup.keyboard([
          ['➕ Redirect qo\'shish'],
          ['📋 Redirectlar'],
          ['🗑 Delete ON', '📌 Delete OFF'],
        ]).resize(),
      ),
    );
  }

  // ================= TEXT =================
  @On('text')
  async onText(@Ctx() ctx: SafeContext) {
    const text = ctx.message?.text || '';

    /* ===== ADMIN ===== */
    if (ctx.chat.type === 'private' && (await this.adminService.isAdmin(ctx))) {
      if (text === '➕ Redirect qo\'shish') {
        this.waitingRedirect.add(ctx.from.id);
        await this.tgSafe(() => ctx.reply('Guruh yoki kanal @username yuboring'));
        return;
      }

      if (text === '📋 Redirectlar') {
        const groups = await this.redirectService.getActiveGroups();
        if (!groups.length) {
          await this.tgSafe(() => ctx.reply('Redirect yo\'q'));
          return;
        }

        const buttons = groups.map(g => [
          Markup.button.callback(g.title, `remove:${g.chatId}`),
        ]);

        await this.tgSafe(() => ctx.reply('Redirectlar:', Markup.inlineKeyboard(buttons)));
        return;
      }

      if (text === '🗑 Delete ON' || text === '📌 Delete OFF') {
        const groups = await this.redirectService.getActiveGroups();
        const buttons = groups.map(g => [
          Markup.button.callback(
            g.title,
            `delete:${g.chatId}:${text === '🗑 Delete ON' ? 'on' : 'off'}`,
          ),
        ]);

        await this.tgSafe(() => ctx.reply('Qaysi redirect?', Markup.inlineKeyboard(buttons)));
        return;
      }

      if (this.waitingRedirect.has(ctx.from.id)) {
        try {
          let chatId: string;

          try {
            const chat = await this.tgSafe(() => ctx.telegram.getChat(text.trim()));
            chatId = String(chat.id);
          } catch (err) {
            await this.tgSafe(() =>
              ctx.reply(
                '⚠️ Private guruh bo\'lsa, bot guruhga qo\'shilgan bo\'lishi va biror xabar yuborilishi kerak. ' +
                  'Keyin /getid yuboring va ID sini yuboring.',
              ),
            );
            return;
          }

          await this.redirectService.addGroup({
            chatId,
            title: (ctx.message.chat?.title || text.trim()),
            addedById: ctx.from.id,
          });

          this.waitingRedirect.delete(ctx.from.id);
          await this.tgSafe(() => ctx.reply('✅ Redirect qo\'shildi'));
        } catch {
          await this.tgSafe(() => ctx.reply('❌ Bot redirect kanalida admin emas yoki xatolik yuz berdi'));
        }
        return;
      }
    }

    /* ===== USER ===== */
    const isPrivate = ctx.chat.type === 'private';
    const isAdmin = await this.adminService.isAdmin(ctx);

    if (isPrivate && isAdmin) return;

    // redirect joylarda jim (faqat guruh/kanal uchun)
    if (!isPrivate) {
      const groups = await this.redirectService.getActiveGroups();
      const redirectIds = groups.map(g => String(g.chatId));
      if (redirectIds.includes(String(ctx.chat.id))) return;
    }

    // Zakaz tekshirish
    if (!this.isTaxiOrder(text)) {
      if (!isPrivate) return;
    }

    const phone = this.extractPhone(text);

    if (phone) {
      await this.forwardAll(ctx, phone);
    } else {
      await this.forwardOrderWithoutPhone(ctx);
    }
  }

  // ================= FORWARD =================
  /**
   * Maqsad:
   * - Avval forward qilib ko'radi
   * - Forward bo'lmasa (protected bo'lsa yoki boshqa), COPY (sendMessage) bilan yuboradi
   * - 429 bo'lsa kutib qayta urinadi
   * - Har yuborishda delay
   */
  private async forwardAll(ctx: any, phone: string, data?: any) {
    const groups = await this.redirectService.getActiveGroups();
    let success = 0;
    let protected_count = 0;
    let writeForbidden = 0;

    const sourceChatId = data ? data.chatId : ctx.chat.id;
    const originalText = data ? data.text : (ctx.message.text || '');

    for (const g of groups) {
      const target = Number(g.chatId);

      // 1) data bo'lsa (senda oldin "copy mode" edi) — shuni saqlaymiz
      if (data) {
        const msg = this.buildCopyText(ctx, originalText, phone);

        try {
          await this.safeSendMessage(ctx, target, msg, {
            parse_mode: 'HTML',
            disable_web_page_preview: true,
          });
          success++;
        } catch (e: any) {
          if (this.isWriteForbidden(e)) {
            writeForbidden++;
          } else if (this.isProtectedError(e)) {
            protected_count++;
          } else {
            console.log('COPY ERROR:', g.title, this.getErrDesc(e));
          }
        }

        await this.tgDelay();
        continue;
      }

      // 2) Oddiy holatda: forward -> reply metadata
      try {
        const fwd = await this.safeForward(ctx, target, sourceChatId, ctx.message.message_id) as any;

        // reply bilan telefon yuborish ham 429-safeli
        await this.safeSendMessage(
          ctx,
          target,
          `👤 ${this.escapeHtml(ctx.from.first_name || '')}\n@${this.escapeHtml(ctx.from.username || 'no_username')}\n📞 ${this.escapeHtml(phone)}`,
          { reply_to_message_id: fwd.message_id, parse_mode: 'HTML' },
        );

        success++;
      } catch (e: any) {
        // Forward bo'lmadi -> COPY fallback
        const msg = this.buildCopyText(ctx, originalText, phone);

        try {
          await this.safeSendMessage(ctx, target, msg, {
            parse_mode: 'HTML',
            disable_web_page_preview: true,
          });
          success++;
        } catch (err: any) {
          if (this.isWriteForbidden(err)) {
            writeForbidden++;
          } else if (this.isProtectedError(err)) {
            protected_count++;
          } else {
            console.log('BOTH FAILED:', g.title, this.getErrDesc(err));
          }
        }
      }

      await this.tgDelay();
    }

    // ✅ Faqat NOMER BILAN buyurtmada o'chirish
    if (!data && success > 0) {
      try {
        await this.safeDelete(ctx, sourceChatId, ctx.message.message_id);
      } catch {
        // jim
      }
    }

    // ✅ Javob
    let message = '';
    if (success > 0) {
      message = `✅ ${ctx.from.first_name || 'Foydalanuvchi'}, xabaringiz ${success} ta kanalga yuborildi`;
      if (protected_count > 0) {
        message += `\n⚠️ ${protected_count} ta joy “protected” yoki cheklangan bo‘lishi mumkin (forward bo‘lmadi, copy ham bo‘lmasligi mumkin)`;
      }
      if (writeForbidden > 0) {
        message += `\n⛔ ${writeForbidden} ta joyga bot yozolmaydi (botni admin qiling / guruhga qo‘shing)`;
      }
    } else {
      message = `❌ ${ctx.from.first_name || 'Foydalanuvchi'}, hech qaysi kanalga ketmadi`;
      if (protected_count > 0) {
        message += `\n⚠️ ${protected_count} ta joy “protected/cheklangan”`;
      }
      if (writeForbidden > 0) {
        message += `\n⛔ ${writeForbidden} ta joyga bot yozolmaydi`;
      }
    }

    const sentMessage = await this.safeSendMessage(ctx, sourceChatId, message, { parse_mode: 'HTML' }) as any;

    setTimeout(async () => {
      try {
        await this.safeDelete(ctx, sourceChatId, sentMessage.message_id);
      } catch {}
    }, 5000);
  }

  // ================= FORWARD WITHOUT PHONE =================
  /**
   * Phone yo'q bo'lsa ham xuddi shunday:
   * - forward -> bo'lmasa copy
   * - 429-safe
   * - delay
   */
  private async forwardOrderWithoutPhone(ctx: any) {
    const groups = await this.redirectService.getActiveGroups();
    let success = 0;
    let protected_count = 0;
    let writeForbidden = 0;

    for (const g of groups) {
      const target = Number(g.chatId);

      try {
        await this.safeForward(ctx, target, ctx.chat.id, ctx.message.message_id);
        success++;
      } catch (e: any) {
        // forward bo'lmasa copy
        const msg = this.buildCopyText(ctx, ctx.message.text, undefined);

        try {
          await this.safeSendMessage(ctx, target, msg, {
            parse_mode: 'HTML',
            disable_web_page_preview: true,
          });
          success++;
        } catch (err: any) {
          if (this.isWriteForbidden(err)) {
            writeForbidden++;
          } else if (this.isProtectedError(err)) {
            protected_count++;
          } else {
            console.log('BOTH FAILED:', g.title, this.getErrDesc(err));
          }
        }
      }

      await this.tgDelay();
    }

    // ✅ Original xabarni o'chirish
    if (success > 0) {
      try {
        await this.safeDelete(ctx, ctx.chat.id, ctx.message.message_id);
      } catch {
        // jim
      }
    }

    // ✅ Javob
    let message = '';
    if (success > 0) {
      message = `✅ ${ctx.from.first_name || 'Foydalanuvchi'}, xabaringiz ${success} ta kanalga yuborildi`;
      if (protected_count > 0) {
        message += `\n⚠️ ${protected_count} ta joy “protected/cheklangan”`;
      }
      if (writeForbidden > 0) {
        message += `\n⛔ ${writeForbidden} ta joyga bot yozolmaydi (botni admin qiling / guruhga qo‘shing)`;
      }
    } else {
      message = `❌ ${ctx.from.first_name || 'Foydalanuvchi'}, hech qaysi kanalga ketmadi`;
      if (protected_count > 0) {
        message += `\n⚠️ ${protected_count} ta joy “protected/cheklangan”`;
      }
      if (writeForbidden > 0) {
        message += `\n⛔ ${writeForbidden} ta joyga bot yozolmaydi`;
      }
    }

    const sentMessage = await this.safeSendMessage(ctx, ctx.chat.id, message, { parse_mode: 'HTML' }) as any;

    setTimeout(async () => {
      try {
        await this.safeDelete(ctx, ctx.chat.id, sentMessage.message_id);
      } catch {}
    }, 5000);
  }

  @Command('getid')
  async getId(@Ctx() ctx: any) {
    await this.tgSafe(() => ctx.reply(`Guruh ID: ${ctx.chat.id}`));
    console.log('Guruh chat ID:', ctx.chat.id);
  }

  // ================= CALLBACK =================
  @On('callback_query')
  async onCallback(@Ctx() ctx: any) {
    const data = ctx.callbackQuery.data;

    if (data.startsWith('remove:')) {
      const chatId = data.split(':')[1];
      await this.redirectService.removeGroup(chatId);
      await this.tgSafe(() => ctx.answerCbQuery('O\'chirildi'));
      await this.tgSafe(() => ctx.editMessageText('❌ Redirect o\'chirildi'));
    }

    if (data.startsWith('delete:')) {
      const [, chatId, mode] = data.split(':');
      await this.redirectService.setDeleteFlag(chatId, mode === 'on');
      await this.tgSafe(() => ctx.answerCbQuery('Saqlandi'));
      await this.tgSafe(() => ctx.editMessageText('✅ O\'zgartirildi'));
    }
  }
}