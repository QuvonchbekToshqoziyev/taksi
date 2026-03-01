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

type PendingPhoneOrder = {
  chatId: number | string;
  userId: number;
  fullName: string;
  text: string;
  sourceMessageId: number;
  promptMessageId?: number;
};

@Update()
export class BotUpdate {
  constructor(
    private readonly redirectService: RedirectService,
    private readonly adminService: AdminService,
  ) {}

  private waitingRedirect = new Set<number>();
  private pendingPhoneOrders = new Map<string, PendingPhoneOrder>();
  private readonly BOT_DELETE_MS = 20_000;
  private readonly FORCE_CLIENT_PHRASES: string[] = [
    'gulistonga taxi bormi',
    'gulistonga taksi bormi',
  ];

  // ================= FILTER =================
private DRIVER_WORDS: string[] = [
  // Mavjud so'zlar...
  'olamiz', 'odam olamiz', 'pochta olamiz', 'yolovchi olamiz',
  'taksi bor', 'taxi bor', 'mashina bor', 'mashina bormi',
  'bosh mashina bor', 'bosh taksi bor', 'kim ketadi', 'kim boradi',
  'оламиз', 'одам оламиз', 'почта оламиз', 'йўловчи оламиз',
  'такси бор', 'машина бор', 'машина борми', 'бош машина бор',
  'бош такси бор', 'ким кетади', 'ким боради',

  // Yangi qo'shilgan variantlar (Xabarlardan olingan)
  'obketaman', 'olib ketaman', 'zakaz bor', 'zakazga', 'zakazga mashina',
  'pochta zakaz', 'bosh moshin', 'mowina bor', 'tel +', 'obketamiz',
  'обкетаман', 'олиб кетаман', 'заказ бор', 'заказга', 'бош мошин',
  'мошина бор', 'почта заказ'
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
    ['kamsamoldan ped istutga 1 kishi bor'],
    ['Towkenga ketadigan taksi bormi']
  ];

  private isTaxiOrder(text: string): boolean {
    const t = (text || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

    for (const phrase of this.FORCE_CLIENT_PHRASES) {
      if (t.includes(phrase)) return true;
    }

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

  private getPrankReply(text: string): string | null {
    const t = (text || '').toLowerCase().replace(/\s+/g, ' ').trim();

    if (/(^|\s)ketmiman(\s|$)|(^|\s)ketmayman(\s|$)/.test(t)) {
      return 'Boshqa prikol qilma';
    }

    if (/(^|\s)prikol(\s|$)|(^|\s)hazil(\s|$)/.test(t)) {
      return 'Prikolni keyin qilamiz, zakaz bo‘lsa yozing';
    }

    if (/(^|\s)lol(\s|$)|(^|\s)haha(\s|$)|(^|\s)hehe(\s|$)/.test(t)) {
      return 'Yaxshi, endi zakaz bo‘lsa yozing';
    }

    return null;
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

  private isBlockedByUserError(e: any): boolean {
    const d = this.getErrDesc(e).toLowerCase();
    return d.includes('bot was blocked by the user') || d.includes('user is deactivated');
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
  private async safeSendMessage(ctx: any, chatId: number | string, text: string, extra?: any) {
    try {
      return await this.tgSafe(() => ctx.telegram.sendMessage(chatId, text, extra));
    } catch (e: any) {
      if (this.isBlockedByUserError(e)) {
        return null;
      }
      throw e;
    }
  }

  /**
   * Forward ham 429 bilan himoyalangan
   */
  private async safeForward(ctx: any, targetId: number | string, sourceId: number | string, messageId: number) {
    return this.tgSafe(() => ctx.telegram.forwardMessage(targetId, sourceId, messageId));
  }

  /**
   * Delete ham 429 bilan himoyalangan
   */
  private async safeDelete(ctx: any, chatId: number | string, messageId: number) {
    return this.tgSafe(() => ctx.telegram.deleteMessage(chatId, messageId));
  }

  private pendingPhoneKey(chatId: number | string, userId: number) {
    return `${chatId}:${userId}`;
  }

  private async safeDeleteSilently(ctx: any, chatId: number | string, messageId?: number) {
    if (!messageId) return;
    try {
      await this.safeDelete(ctx, chatId, messageId);
    } catch {
      // jim
    }
  }

  private buildPhonePrompt(fullName: string, first: boolean) {
    const name = this.escapeHtml(fullName || 'Mijoz');
    if (first) {
      return `${name}, Assalomu alaykum, sizga taxi yuborishim uchun nomerizni yuboring`;
    }
    return `${name}, Rahmat, sizga taxi yuborishim uchun nomerizni yuboring`;
  }

  private isStopPendingText(text: string): boolean {
    const t = (text || '').toLowerCase().replace(/\s+/g, ' ').trim();
    return /k(e|i)rak\s*mas|kerakmas|kere\s*mas|keremas|kerak emas/.test(t);
  }

  private async sendAutoDeleteMessage(
    ctx: any,
    chatId: number | string,
    text: string,
    extra?: any,
  ) {
    const sent = await this.safeSendMessage(ctx, chatId, text, extra) as any;
    setTimeout(async () => {
      await this.safeDeleteSilently(ctx, chatId, sent?.message_id);
    }, this.BOT_DELETE_MS);
    return sent;
  }

  private clearPendingPhoneOrder(key: string) {
    this.pendingPhoneOrders.delete(key);
  }

  private async askPhoneAndStore(ctx: SafeContext, originalText: string) {
    const key = this.pendingPhoneKey(ctx.chat.id, ctx.from.id);
    const prev = this.pendingPhoneOrders.get(key);

    if (prev?.promptMessageId) {
      await this.safeDeleteSilently(ctx, ctx.chat.id, prev.promptMessageId);
    }

    const fullName =
      `${ctx.from?.first_name || ''} ${ctx.from?.last_name || ''}`.trim() ||
      ctx.from?.username ||
      'Mijoz';

    const prompt = await this.sendAutoDeleteMessage(
      ctx,
      ctx.chat.id,
      this.buildPhonePrompt(fullName, true),
      { parse_mode: 'HTML' },
    ) as any;

    this.clearPendingPhoneOrder(key);

    this.pendingPhoneOrders.set(key, {
      chatId: ctx.chat.id,
      userId: ctx.from.id,
      fullName,
      text: originalText,
      sourceMessageId: ctx.message.message_id,
      promptMessageId: prompt?.message_id,
    });
  }

  private async handlePendingPhoneReply(ctx: SafeContext, text: string): Promise<boolean> {
    const key = this.pendingPhoneKey(ctx.chat.id, ctx.from.id);
    const pending = this.pendingPhoneOrders.get(key);
    if (!pending) return false;

    if (this.isStopPendingText(text)) {
      this.clearPendingPhoneOrder(key);
      await this.sendAutoDeleteMessage(ctx, ctx.chat.id, 'Xop');
      return true;
    }

    const phone = this.extractPhone(text);
    if (!phone) {
      const prankReply = this.getPrankReply(text);
      if (prankReply) {
        await this.sendAutoDeleteMessage(ctx, ctx.chat.id, prankReply);
      }

      const sent = await this.sendAutoDeleteMessage(
        ctx,
        ctx.chat.id,
        this.buildPhonePrompt(pending.fullName, false),
        { parse_mode: 'HTML' },
      ) as any;

      pending.promptMessageId = sent?.message_id;
      this.pendingPhoneOrders.set(key, pending);
      return true;
    }

    await this.forwardAll(ctx, phone, {
      chatId: pending.chatId,
      text: pending.text,
      sourceMessageId: pending.sourceMessageId,
      phoneMessageId: ctx.message.message_id,
      promptMessageId: pending.promptMessageId,
    });

    this.clearPendingPhoneOrder(key);
    return true;
  }

  private normalizeChatRef(raw: string): string {
    const token =
      (raw || '')
        .trim()
        .match(
          /(@[A-Za-z0-9_]{5,}|-?\d{5,}|(?:https?:\/\/)?(?:t|telegram)\.me\/[^\s]+|tg:\/\/resolve\?domain=[^\s]+)/i,
        )?.[0] || (raw || '').trim();

    const value = token.replace(/[.,;!?]+$/, '');
    if (!value) return value;

    if (
      value.includes('t.me/+') ||
      value.includes('telegram.me/+') ||
      value.includes('t.me/joinchat/') ||
      value.includes('telegram.me/joinchat/')
    ) {
      throw new Error('INVITE_LINK_UNSUPPORTED');
    }

    const tgResolveMatch = value.match(/^tg:\/\/resolve\?domain=([A-Za-z0-9_]+)$/i);
    if (tgResolveMatch) {
      return `@${tgResolveMatch[1]}`;
    }

    const linkMatch = value.match(/^(?:https?:\/\/)?(?:t|telegram)\.me\/([A-Za-z0-9_]+)(?:[/?].*)?$/i);
    if (linkMatch) {
      return `@${linkMatch[1]}`;
    }

    if (/^-?\d+$/.test(value)) return value;
    if (value.startsWith('@')) return value;
    if (/^[A-Za-z0-9_]{5,}$/.test(value)) return `@${value}`;

    return value;
  }

  private isRedirectTargetType(type?: string): boolean {
    return type === 'group' || type === 'supergroup' || type === 'channel';
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
    const commandText = text.trim();

    // /getid har doim ishlasin (group/private), hatto umumiy text handler ichida ham
    if (/^\/getid(?:@\w+)?$/i.test(commandText)) {
      await this.tgSafe(() => ctx.reply(`Guruh ID: ${ctx.chat.id}`));
      return;
    }

    /* ===== ADMIN ===== */
    if (ctx.chat.type === 'private' && (await this.adminService.isAdmin(ctx))) {
      if (text === '➕ Redirect qo\'shish') {
        this.waitingRedirect.add(ctx.from.id);
        await this.tgSafe(() =>
          ctx.reply(
            'Guruh/kanal @username yoki chat ID yuboring (-100...).\n' +
              'Private bo‘lsa, o‘sha joydan bitta xabarni botga forward ham qilishingiz mumkin.',
          ),
        );
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
          const forwardedChat = (ctx.message as any)?.forward_from_chat;
          let chatId = '';
          let title = '';

          if (forwardedChat?.id) {
            if (!this.isRedirectTargetType(forwardedChat.type)) {
              await this.tgSafe(() =>
                ctx.reply('❌ Faqat guruh/superguruh/kanal redirectga qo‘shiladi.'),
              );
              return;
            }
            chatId = String(forwardedChat.id);
            title = forwardedChat.title || chatId;
          } else {
            const ref = this.normalizeChatRef(text);
            const chat = await this.tgSafe(() => ctx.telegram.getChat(ref));

            if (!this.isRedirectTargetType((chat as any)?.type)) {
              await this.tgSafe(() =>
                ctx.reply('❌ Faqat guruh/superguruh/kanal redirectga qo‘shiladi.'),
              );
              return;
            }

            chatId = String((chat as any).id);
            title = (chat as any).title || ref;
          }

          await this.redirectService.addGroup({
            chatId,
            title,
            addedById: ctx.from.id,
          });

          this.waitingRedirect.delete(ctx.from.id);
          await this.tgSafe(() => ctx.reply('✅ Redirect qo\'shildi'));
        } catch (err: any) {
          const desc = this.getErrDesc(err).toLowerCase();

          if ((err as Error)?.message === 'INVITE_LINK_UNSUPPORTED') {
            await this.tgSafe(() =>
              ctx.reply('❌ Invite link ishlamaydi. @username yoki chat ID yuboring (-100...).'),
            );
            return;
          }

          if (
            desc.includes('chat not found') ||
            desc.includes('chat_id is empty') ||
            desc.includes('bad request')
          ) {
            await this.tgSafe(() =>
              ctx.reply(
                '❌ Chat topilmadi.\n' +
                  'Private joy bo‘lsa: botni admin qiling va chat ID yuboring (-100...) yoki shu chatdan xabarni botga forward qiling.',
              ),
            );
            return;
          }

          await this.tgSafe(() =>
            ctx.reply('❌ Bot redirect kanal/guruhida admin emas yoki xatolik yuz berdi'),
          );
        }
        return;
      }
    }

    /* ===== USER ===== */
    const isPrivate = ctx.chat.type === 'private';
    if (isPrivate) {
      const isAdmin = await this.adminService.isAdmin(ctx);
      if (isAdmin) return;
    }

    // redirect joylarda jim (faqat guruh/kanal uchun)
    if (!isPrivate) {
      const groups = await this.redirectService.getActiveGroups();
      const redirectIds = groups.map(g => String(g.chatId));
      if (redirectIds.includes(String(ctx.chat.id))) return;
    }

    if (await this.handlePendingPhoneReply(ctx, text)) return;

    // Zakaz tekshirish
    if (!this.isTaxiOrder(text)) {
      const prankReply = this.getPrankReply(text);
      if (prankReply) {
        await this.sendAutoDeleteMessage(ctx, ctx.chat.id, prankReply);
      }

      if (!isPrivate) return;
    }

    const phone = this.extractPhone(text);

    if (phone) {
      await this.forwardAll(ctx, phone);
    } else {
      await this.forwardOrderWithoutPhone(ctx, { suppressAck: true });
      await this.askPhoneAndStore(ctx, text);
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
  private async forwardAll(
    ctx: any,
    phone: string,
    data?: {
      chatId: number | string;
      text: string;
      sourceMessageId?: number;
      phoneMessageId?: number;
      promptMessageId?: number;
    },
  ) {
    const groups = await this.redirectService.getActiveGroups();
    let success = 0;
    let protected_count = 0;
    let writeForbidden = 0;

    const sourceChatId = data ? data.chatId : ctx.chat.id;
    const originalText = data ? data.text : (ctx.message.text || '');

    for (const g of groups) {
      const target = g.chatId;

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

    // ✅ Muvaffaqiyatli bo'lsa client xabarlarini ham o'chirishga urinadi
    if (success > 0) {
      if (data) {
        await this.safeDeleteSilently(ctx, sourceChatId, data.sourceMessageId);
        await this.safeDeleteSilently(ctx, sourceChatId, data.phoneMessageId);
        await this.safeDeleteSilently(ctx, sourceChatId, data.promptMessageId);
      } else {
        await this.safeDeleteSilently(ctx, sourceChatId, ctx.message.message_id);
      }
    }

    // ✅ Javob
    let message = '';
    if (success > 0) {
      if (data?.phoneMessageId) {
        message = 'Rahmat, 3 minutda sizga ishonchli taksi jonataman';
      } else {
        message = 'Assalomu alaykum, 3 minutda sizga ishonchli taksi jonataman';
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
    if (sentMessage?.message_id) {
      setTimeout(async () => {
        try {
          await this.safeDelete(ctx, sourceChatId, sentMessage.message_id);
        } catch {}
      }, this.BOT_DELETE_MS);
    }
  }

  // ================= FORWARD WITHOUT PHONE =================
  /**
   * Phone yo'q bo'lsa ham xuddi shunday:
   * - forward -> bo'lmasa copy
   * - 429-safe
   * - delay
   */
  private async forwardOrderWithoutPhone(ctx: any, options?: { suppressAck?: boolean }) {
    const groups = await this.redirectService.getActiveGroups();
    let success = 0;
    let protected_count = 0;
    let writeForbidden = 0;

    for (const g of groups) {
      const target = g.chatId;

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

    if (options?.suppressAck) {
      return;
    }

    // ✅ Javob
    let message = '';
    if (success > 0) {
      message = 'Assalomu alaykum, 3 minutda sizga ishonchli taksi jonataman';
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
    if (sentMessage?.message_id) {
      setTimeout(async () => {
        try {
          await this.safeDelete(ctx, ctx.chat.id, sentMessage.message_id);
        } catch {}
      }, this.BOT_DELETE_MS);
    }
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
