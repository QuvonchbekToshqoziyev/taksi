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
import { TargetService } from '../target/target.service';
import { KeywordService } from '../keyword/keyword.service';
import { LocationService } from '../location/location.service';
import { AdminLogService } from '../admin-log/admin-log.service';
import { RideOrderService } from '../ride-order/ride-order.service';

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
    private readonly targetService: TargetService,
    private readonly keywordService: KeywordService,
    private readonly locationService: LocationService,
    private readonly adminLogService: AdminLogService,
    private readonly rideOrderService: RideOrderService,
  ) {}

  private waitingRedirect = new Set<number>();
  private waitingTarget = new Set<number>();
  private waitingKeyword = new Map<number, 'client' | 'driver'>();
  private waitingLocationSub = new Map<number, number>(); // userId -> parentId

  // ---- User ride request state ----
  private rideState = new Map<number, {
    step: 'from' | 'to' | 'count' | 'phone' | 'confirm';
    fromId?: number;
    fromName?: string;
    toId?: number;
    toName?: string;
    count?: number;
    phone?: string;
  }>();

  // ---- Rate limiter: userId -> timestamp[] ----
  private rateLimits = new Map<number, number[]>();
  private readonly RATE_LIMIT_WINDOW = 10_000; // 10 seconds
  private readonly RATE_LIMIT_MAX = 5; // max actions per window

  private isRateLimited(userId: number): boolean {
    const now = Date.now();
    const timestamps = (this.rateLimits.get(userId) || []).filter(t => now - t < this.RATE_LIMIT_WINDOW);
    if (timestamps.length >= this.RATE_LIMIT_MAX) {
      this.rateLimits.set(userId, timestamps);
      return true;
    }
    timestamps.push(now);
    this.rateLimits.set(userId, timestamps);
    return false;
  }

  private readonly FORCE_CLIENT_PHRASES: string[] = [
    'gulistonga taxi bormi',
    'gulistonga taksi bormi',
    'toshkentdan kamsamolga taksi bormi',
    'gulistondan kamsamolga taxi bormi',
  ];

  // ================= FILTER =================
  private DRIVER_WORDS: string[] = [
    'olamiz', 'odam olamiz', 'pochta olamiz', 'yolovchi olamiz',
    'taksi bor', 'taxi bor', 'mashina bor', 'mashina bormi',
    'bosh mashina bor', 'bosh taksi bor', 'kim ketadi', 'kim boradi',
    'оламиз', 'одам оламиз', 'почта оламиз', 'йўловчи оламиз',
    'такси бор', 'машина бор', 'машина борми', 'бош машина бор',
    'бош такси бор', 'ким кетади', 'ким боради',
    'obketaman', 'olib ketaman', 'obketamiz',
    'bosh moshin', 'mowina bor', 'tel +',
    'обкетаман', 'олиб кетаман', 'бош мошин',
    'мошина бор',
  ];

  private CLIENT_WORDS_SINGLE: string[] = [
    'taksi kerak', 'taxi kerak', 'taksi kere', 'taxi kere',
    'kerak', 'kere', 'kk', 'zakaz', 'zakaz bor',
    'odam bor', 'kishi bor', 'pochta bor', 'srochni',
    'bormi', 'boraman', 'boramiz',
    'taksi bormi', 'taxi bormi', 'mashina bormi', 'moshina bormi',
    'srochna', 'dastavka bor', 'dostavka bor',
    'bir kishi', 'bir odam', '1 kishi', '1kishi', '2kishi', 'kishimiz',
    'kshi bor', 'kiwi bor', 'yolkira',
    'hozirga', 'xozirga',
    'такси керак', 'такси кере', 'такси борми', 'керак', 'кк', 'заказ', 'заказ бор',
    'одам бор', 'киши бор', 'почта bor', 'срочни', 'срочна', 'хозирга',
    'гулистонга бир киши', 'гулистонга 1 кши', 'шахарга бир киши',
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
    ['Towkenga ketadigan taksi bormi'],
    ['kamsamoldan', 'gulistonga', 'bormi'],
    ['kamsamoldan', 'gulistonga', 'boraman'],
    ['камсамолдан', 'гулистонга', 'борми'],
    ['lelndan', 'kamsamulga', 'pochta bor'],
    ['лелндан', 'камсамулга', 'почта бор'],
  ];

  private normalizeOrderText(text: string): string {
    return (text || '')
      .toLowerCase()
      .replace(/[ʻʼ''`']/g, '')
      .replace(/(\p{N})(\p{L})/gu, '$1 $2')
      .replace(/(\p{L})(\p{N})/gu, '$1 $2')
      .replace(/[.,!?;:()[\]{}"]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private hasPhrase(text: string, phrase: string): boolean {
    const p = this.normalizeOrderText(phrase);
    if (!p) return false;
    const body = this.escapeRegex(p).replace(/\s+/g, '\\s+');
    const re = new RegExp(`(^|\\s)${body}(?=\\s|$)`, 'u');
    return re.test(text);
  }

  private hasAnyPhrase(text: string, phrases: string[]): boolean {
    for (const phrase of phrases) {
      if (this.hasPhrase(text, phrase)) return true;
    }
    return false;
  }

  private isTaxiOrder(text: string): boolean {
    const t = this.normalizeOrderText(text);
    if (!t) return false;

    if (this.hasAnyPhrase(t, this.DRIVER_WORDS)) return false;
    if (this.hasAnyPhrase(t, this.keywordService.getDriverKeywords())) return false;
    if (this.hasAnyPhrase(t, this.FORCE_CLIENT_PHRASES)) return true;
    if (this.hasAnyPhrase(t, this.CLIENT_WORDS_SINGLE)) return true;
    if (this.hasAnyPhrase(t, this.keywordService.getClientKeywords())) return true;

    for (const pattern of this.CLIENT_WORDS_COMBO) {
      if (pattern.every(p => this.hasPhrase(t, p))) return true;
    }

    return false;
  }

  private extractPhone(text: string): string | null {
    const m = (text || '').match(/(\+?998\d{9}|\b(90|91|93|94|95|97|98|99)\d{7}\b)/);
    return m?.[0] || null;
  }

  // ================== SAFETY HELPERS (429 + DELAY) ==================

  private sleep(ms: number) {
    return new Promise(res => setTimeout(res, ms));
  }

  private async tgSafe<T>(fn: () => Promise<T>): Promise<T> {
    while (true) {
      try {
        return await fn();
      } catch (e: any) {
        const code = e?.response?.error_code;
        const retryAfter = e?.response?.parameters?.retry_after;

        if (code === 429 && retryAfter) {
          await this.sleep((retryAfter + 1) * 1000);
          continue;
        }
        throw e;
      }
    }
  }

  private async tgDelay() {
    await this.sleep(120);
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
    return d.includes('protected') || d.includes('content is protected');
  }

  private escapeHtml(v: any) {
    return String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private async safeSendMessage(ctx: any, chatId: number | string, text: string, extra?: any) {
    try {
      return await this.tgSafe(() => ctx.telegram.sendMessage(chatId, text, extra));
    } catch (e: any) {
      const d = this.getErrDesc(e).toLowerCase();
      if (d.includes('bot was blocked by the user') || d.includes('user is deactivated')) {
        return null;
      }
      throw e;
    }
  }

  private async safeForward(ctx: any, targetId: number | string, sourceId: number | string, messageId: number) {
    return this.tgSafe(() => ctx.telegram.forwardMessage(targetId, sourceId, messageId));
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
    if (tgResolveMatch) return `@${tgResolveMatch[1]}`;

    const linkMatch = value.match(/^(?:https?:\/\/)?(?:t|telegram)\.me\/([A-Za-z0-9_]+)(?:[/?].*)?$/i);
    if (linkMatch) return `@${linkMatch[1]}`;

    if (/^-?\d+$/.test(value)) return value;
    if (value.startsWith('@')) return value;
    if (/^[A-Za-z0-9_]{5,}$/.test(value)) return `@${value}`;

    return value;
  }

  private isRedirectTargetType(type?: string): boolean {
    return type === 'group' || type === 'supergroup' || type === 'channel';
  }

  // ================= BUILD SCOUT MESSAGE =================
  private async buildScoutMessage(ctx: SafeContext, originalText: string, sourceChatTitle?: string): Promise<string> {
    const name = this.escapeHtml(ctx.from?.first_name || '');
    const lastName = this.escapeHtml(ctx.from?.last_name || '');
    const fullName = `${name} ${lastName}`.trim() || 'Noma\'lum';
    const rawUsername = ctx.from?.username;
    const botUsername = (ctx as any).botInfo?.username;
    const username = rawUsername && rawUsername.toLowerCase() !== botUsername?.toLowerCase()
      ? `@${this.escapeHtml(rawUsername)}`
      : null;
    const userId = ctx.from.id;

    // 1) Phone from message text
    let phone = this.extractPhone(originalText);

    // 2) Phone from shared contact in message
    if (!phone) {
      const contact = (ctx.message as any)?.contact;
      if (contact?.phone_number) {
        phone = contact.phone_number;
      }
    }

    // 3) Phone from user's Telegram profile (getChat)
    if (!phone) {
      try {
        const userChat = await this.tgSafe(() => ctx.telegram.getChat(userId)) as any;
        if (userChat?.phone_number) {
          phone = userChat.phone_number;
        }
      } catch {
        // User profile not accessible — skip
      }
    }

    const text = this.escapeHtml(originalText);

    const contactLine = username
      ? `👤 <b>Ism-familiya:</b> <a href="tg://user?id=${userId}">${fullName}</a> (${username})`
      : `👤 <b>Ism-familiya:</b> <a href="tg://user?id=${userId}">mijoz ${userId}</a>`;

    const phoneLine = phone ? `\n📞 ${this.escapeHtml(phone)}` : '';
    const sourceLine = sourceChatTitle ? `\n📍 ${this.escapeHtml(sourceChatTitle)}` : '';

    return `🚕 <b>Yangi zakaz topildi!</b>${sourceLine}

${text}

${contactLine}${phoneLine}`;
  }

  // ================= MAIN MENU =================
  private async sendMainMenu(ctx: SafeContext, isSuperAdmin = false) {
    this.waitingRedirect.delete(ctx.from.id);
    this.waitingTarget.delete(ctx.from.id);
    this.waitingKeyword.delete(ctx.from.id);
    this.waitingLocationSub.delete(ctx.from.id);

    if (isSuperAdmin) {
      await this.tgSafe(() =>
        ctx.reply(
          '🔧 Admin panel:',
          Markup.keyboard([
            ['➕ Redirect qo\'shish', '📋 Redirectlar'],
            ['🎯 Target qo\'shish', '📋 Targetlar'],
            ['📗 Kalit soʻzlar', '📍 Joylashuvlar'],
            ['📜 Admin loglar'],
          ]).resize(),
        ),
      );
    } else {
      await this.tgSafe(() =>
        ctx.reply(
          '🔧 Admin panel:',
          Markup.keyboard([
            ['📍 Joylashuvlar'],
            ['🏠 Bosh sahifa'],
          ]).resize(),
        ),
      );
    }
  }

  // ================= USER HOME =================
  private async sendUserHome(ctx: SafeContext) {
    this.rideState.delete(ctx.from.id);
    await this.tgSafe(() =>
      ctx.reply(
        '🚕 Taksi botga xush kelibsiz!\nTaksi buyurtma berish uchun pastdagi tugmani bosing.',
        Markup.keyboard([['🚕 Taksi chaqirish', '📋 Zakazlarim']]).resize(),
      ),
    );
  }

  // ================= START =================
  @Command('start')
  async start(@Ctx() ctx: SafeContext) {
    if (ctx.chat.type !== 'private') return;

    if (await this.adminService.isSuperAdmin(ctx.from.id)) {
      await this.tgSafe(() => ctx.reply('👋 Salom Admin!\n/admin yozing.'));
      return;
    }

    await this.sendUserHome(ctx);
  }

  // ================= ADMIN =================
  @Command('admin')
  async admin(@Ctx() ctx: SafeContext) {
    if (ctx.chat.type !== 'private') return;
    const isSuperAdmin = await this.adminService.isSuperAdmin(ctx.from.id);
    const isAdmin = await this.adminService.isAdmin(ctx as any);
    if (!isSuperAdmin && !isAdmin) return;

    await this.sendMainMenu(ctx, isSuperAdmin);
  }

  // ================= GETID =================
  @Command('getid')
  async getId(@Ctx() ctx: any) {
    await this.tgSafe(() => ctx.reply(`Chat ID: ${ctx.chat.id}`));
  }

  // ================= TEXT =================
  @On('text')
  async onText(@Ctx() ctx: SafeContext) {
    const text = ctx.message?.text || '';
    const commandText = text.trim();

    if (/^\/getid(?:@\w+)?$/i.test(commandText)) {
      await this.tgSafe(() => ctx.reply(`Chat ID: ${ctx.chat.id}`));
      return;
    }

    // Rate limit private users
    if (ctx.chat.type === 'private' && this.isRateLimited(ctx.from.id)) {
      await this.tgSafe(() => ctx.reply('⚠️ Iltimos, sekinroq yozing.'));
      return;
    }

    /* ===== ADMIN (private) ===== */
    if (ctx.chat.type === 'private') {
      const isSuperAdmin = await this.adminService.isSuperAdmin(ctx.from.id);
      const isAdmin = isSuperAdmin || await this.adminService.isAdmin(ctx as any);

      if (isAdmin) {
        const handled = await this.handleAdminText(ctx, text, isSuperAdmin);
        if (handled) return;
      }

      /* ===== USER RIDE REQUEST (private, non-admin or unhandled) ===== */
      const handled = await this.handleUserText(ctx, text);
      if (handled) return;
    }

    /* ===== SCOUT MODE — monitor target groups ===== */
    const isPrivate = ctx.chat.type === 'private';
    if (!isPrivate) {
      const isTarget = await this.targetService.isTargetGroup(String(ctx.chat.id));
      if (isTarget) {
        await this.handleTargetGroupMessage(ctx, text);
        return;
      }

      // ===== DRIVER REPLY in redirect groups =====
      await this.handleDriverReply(ctx, text);
    }
  }

  // ================= ADMIN TEXT HANDLER =================
  private async handleAdminText(ctx: SafeContext, text: string, isSuperAdmin: boolean): Promise<boolean> {
    // --- 🏠 Bosh sahifa ---
    if (text === '🏠 Bosh sahifa') {
      await this.sendMainMenu(ctx, isSuperAdmin);
      return true;
    }

    // --- ❌ Bekor qilish ---
    if (text === '❌ Bekor qilish') {
      this.waitingRedirect.delete(ctx.from.id);
      this.waitingTarget.delete(ctx.from.id);
      this.waitingKeyword.delete(ctx.from.id);
      this.waitingLocationSub.delete(ctx.from.id);
      await this.sendMainMenu(ctx, isSuperAdmin);
      return true;
    }

    // --- Redirect qo'shish (superadmin only) ---
    if (text === '➕ Redirect qo\'shish' && isSuperAdmin) {
      this.waitingRedirect.add(ctx.from.id);
      this.waitingTarget.delete(ctx.from.id);
      this.waitingKeyword.delete(ctx.from.id);
      await this.tgSafe(() =>
        ctx.reply(
          'Guruh/kanal @username yoki chat ID yuboring (-100...).',
          Markup.keyboard([['❌ Bekor qilish', '🏠 Bosh sahifa']]).resize(),
        ),
      );
      return true;
    }

    if (text === '📋 Redirectlar' && isSuperAdmin) {
      const groups = await this.redirectService.getActiveGroups();
      if (!groups.length) {
        await this.tgSafe(() => ctx.reply('Redirect yo\'q'));
        return true;
      }
      const buttons = groups.map(g => [
        Markup.button.callback(`❌ ${g.title}`, `rm_redirect:${g.chatId}`),
      ]);
      await this.tgSafe(() => ctx.reply('Redirectlar (bosing o\'chirish uchun):', Markup.inlineKeyboard(buttons)));
      return true;
    }

    // --- Target qo'shish (superadmin only) ---
    if (text === '🎯 Target qo\'shish' && isSuperAdmin) {
      this.waitingTarget.add(ctx.from.id);
      this.waitingRedirect.delete(ctx.from.id);
      this.waitingKeyword.delete(ctx.from.id);
      await this.tgSafe(() =>
        ctx.reply(
          'Target guruh/kanal @username yoki chat ID yuboring (-100...).',
          Markup.keyboard([['❌ Bekor qilish', '🏠 Bosh sahifa']]).resize(),
        ),
      );
      return true;
    }

    if (text === '📋 Targetlar' && isSuperAdmin) {
      const groups = await this.targetService.getActiveGroups();
      if (!groups.length) {
        await this.tgSafe(() => ctx.reply('Target guruh yo\'q'));
        return true;
      }
      const buttons = groups.map(g => [
        Markup.button.callback(`❌ ${g.title}`, `rm_target:${g.chatId}`),
      ]);
      await this.tgSafe(() => ctx.reply('Target guruhlar (bosing o\'chirish uchun):', Markup.inlineKeyboard(buttons)));
      return true;
    }

    // --- Kalit so'zlar (superadmin only) ---
    if (text === '\uD83D\uDCD7 Kalit so\u02BBzlar' && isSuperAdmin) {
      this.waitingRedirect.delete(ctx.from.id);
      this.waitingTarget.delete(ctx.from.id);
      this.waitingKeyword.delete(ctx.from.id);
      await this.tgSafe(() =>
        ctx.reply(
          'Kalit so\u02BBzlar boshqaruvi:',
          Markup.keyboard([
            ['\uD83D\uDC64 Mijoz so\u02BBzlari', '\uD83D\uDE97 Haydovchi so\u02BBzlari'],
            ['\u2795 Mijoz so\u02BBz qo\u02BBshish', '\u2795 Haydovchi so\u02BBz qo\u02BBshish'],
            ['\uD83C\uDFE0 Bosh sahifa'],
          ]).resize(),
        ),
      );
      return true;
    }

    if (text === '\uD83D\uDC64 Mijoz so\u02BBzlari' && isSuperAdmin) {
      await this.showKeywords(ctx, 'client');
      return true;
    }

    if (text === '\uD83D\uDE97 Haydovchi so\u02BBzlari' && isSuperAdmin) {
      await this.showKeywords(ctx, 'driver');
      return true;
    }

    if (text === '\u2795 Mijoz so\u02BBz qo\u02BBshish' && isSuperAdmin) {
      this.waitingKeyword.set(ctx.from.id, 'client');
      this.waitingRedirect.delete(ctx.from.id);
      this.waitingTarget.delete(ctx.from.id);
      await this.tgSafe(() =>
        ctx.reply(
          'Yangi mijoz kalit so\u02BBzini yozing:',
          Markup.keyboard([['\u274c Bekor qilish', '\uD83C\uDFE0 Bosh sahifa']]).resize(),
        ),
      );
      return true;
    }

    if (text === '\u2795 Haydovchi so\u02BBz qo\u02BBshish' && isSuperAdmin) {
      this.waitingKeyword.set(ctx.from.id, 'driver');
      this.waitingRedirect.delete(ctx.from.id);
      this.waitingTarget.delete(ctx.from.id);
      await this.tgSafe(() =>
        ctx.reply(
          'Yangi haydovchi kalit so\u02BBzini yozing:',
          Markup.keyboard([['\u274c Bekor qilish', '\uD83C\uDFE0 Bosh sahifa']]).resize(),
        ),
      );
      return true;
    }

    // --- Waiting for keyword input ---
    if (this.waitingKeyword.has(ctx.from.id)) {
      const type = this.waitingKeyword.get(ctx.from.id)!;
      const phrase = text.toLowerCase().trim();
      try {
        const kw = await this.keywordService.addKeyword(phrase, type);
        await this.adminLogService.log({
          adminTgId: ctx.from.id, action: 'add', targetType: 'keyword',
          targetId: String(kw.id), details: `${type}: ${phrase}`,
        });
        this.waitingKeyword.delete(ctx.from.id);
        const label = type === 'client' ? 'Mijoz' : 'Haydovchi';
        await this.tgSafe(() => ctx.reply(`\u2705 ${label} kalit so\u02BBz qo\u02BBshildi: ${phrase}`));
        await this.sendMainMenu(ctx, isSuperAdmin);
      } catch {
        await this.tgSafe(() => ctx.reply('\u274c Xatolik yuz berdi'));
      }
      return true;
    }

    // --- 📍 Joylashuvlar (all admins) ---
    if (text === '📍 Joylashuvlar') {
      await this.showLocations(ctx);
      return true;
    }

    // --- Waiting for sub-location input ---
    if (this.waitingLocationSub.has(ctx.from.id)) {
      const parentId = this.waitingLocationSub.get(ctx.from.id)!;
      const name = text.trim();
      try {
        const loc = await this.locationService.addLocation(name, parentId);
        await this.adminLogService.log({
          adminTgId: ctx.from.id, action: 'add', targetType: 'location',
          targetId: String(loc.id), details: `${name} (parent: ${parentId})`,
        });
        this.waitingLocationSub.delete(ctx.from.id);
        await this.tgSafe(() => ctx.reply(`✅ Joylashuv qo'shildi: ${name}`));
        await this.showLocationChildren(ctx, parentId);
      } catch {
        await this.tgSafe(() => ctx.reply('❌ Xatolik yuz berdi (nomi takrorlanmasin)'));
      }
      return true;
    }

    // --- 📜 Admin loglar (superadmin only) ---
    if (text === '📜 Admin loglar' && isSuperAdmin) {
      await this.showAdminLogs(ctx);
      return true;
    }

    // --- Waiting for redirect input ---
    if (this.waitingRedirect.has(ctx.from.id)) {
      await this.processAddRedirect(ctx, text);
      return true;
    }

    // --- Waiting for target input ---
    if (this.waitingTarget.has(ctx.from.id)) {
      await this.processAddTarget(ctx, text);
      return true;
    }

    return false;
  }

  // ================= ADD REDIRECT =================
  private async processAddRedirect(ctx: SafeContext, text: string) {
    try {
      const forwardedChat = (ctx.message as any)?.forward_from_chat;
      let chatId = '';
      let title = '';

      if (forwardedChat?.id) {
        if (!this.isRedirectTargetType(forwardedChat.type)) {
          await this.tgSafe(() => ctx.reply('❌ Faqat guruh/superguruh/kanal redirectga qo\'shiladi.'));
          return;
        }
        chatId = String(forwardedChat.id);
        title = forwardedChat.title || chatId;
      } else {
        const ref = this.normalizeChatRef(text);
        const chat = await this.tgSafe(() => ctx.telegram.getChat(ref));
        if (!this.isRedirectTargetType((chat as any)?.type)) {
          await this.tgSafe(() => ctx.reply('❌ Faqat guruh/superguruh/kanal redirectga qo\'shiladi.'));
          return;
        }
        chatId = String((chat as any).id);
        title = (chat as any).title || ref;
      }

      await this.redirectService.addGroup({ chatId, title, addedById: ctx.from.id });
      await this.adminLogService.log({
        adminTgId: ctx.from.id, action: 'add', targetType: 'redirect',
        targetId: chatId, details: title,
      });
      this.waitingRedirect.delete(ctx.from.id);
      await this.tgSafe(() => ctx.reply(`✅ Redirect qo'shildi: ${title}`));
      await this.sendMainMenu(ctx, true);
    } catch (err: any) {
      const desc = this.getErrDesc(err).toLowerCase();
      if ((err as Error)?.message === 'INVITE_LINK_UNSUPPORTED') {
        await this.tgSafe(() => ctx.reply('❌ Invite link ishlamaydi. @username yoki chat ID yuboring.'));
        return;
      }
      if (desc.includes('chat not found') || desc.includes('bad request')) {
        await this.tgSafe(() => ctx.reply('❌ Chat topilmadi. Bot guruhga qo\'shilganmi?'));
        return;
      }
      await this.tgSafe(() => ctx.reply('❌ Xatolik yuz berdi'));
    }
  }

  // ================= ADD TARGET =================
  private async processAddTarget(ctx: SafeContext, text: string) {
    try {
      const forwardedChat = (ctx.message as any)?.forward_from_chat;
      let chatId = '';
      let title = '';

      if (forwardedChat?.id) {
        if (!this.isRedirectTargetType(forwardedChat.type)) {
          await this.tgSafe(() => ctx.reply('❌ Faqat guruh/superguruh/kanal target bo\'ladi.'));
          return;
        }
        chatId = String(forwardedChat.id);
        title = forwardedChat.title || chatId;
      } else {
        const ref = this.normalizeChatRef(text);
        const chat = await this.tgSafe(() => ctx.telegram.getChat(ref));
        if (!this.isRedirectTargetType((chat as any)?.type)) {
          await this.tgSafe(() => ctx.reply('❌ Faqat guruh/superguruh/kanal target bo\'ladi.'));
          return;
        }
        chatId = String((chat as any).id);
        title = (chat as any).title || ref;
      }

      await this.targetService.addGroup({ chatId, title });
      await this.adminLogService.log({
        adminTgId: ctx.from.id, action: 'add', targetType: 'target',
        targetId: chatId, details: title,
      });
      this.waitingTarget.delete(ctx.from.id);
      await this.tgSafe(() => ctx.reply(`✅ Target qo'shildi: ${title}`));
      await this.sendMainMenu(ctx, true);
    } catch (err: any) {
      const desc = this.getErrDesc(err).toLowerCase();
      if ((err as Error)?.message === 'INVITE_LINK_UNSUPPORTED') {
        await this.tgSafe(() => ctx.reply('❌ Invite link ishlamaydi. @username yoki chat ID yuboring.'));
        return;
      }
      if (desc.includes('chat not found') || desc.includes('bad request')) {
        await this.tgSafe(() => ctx.reply('❌ Chat topilmadi. Bot guruhga qo\'shilganmi?'));
        return;
      }
      await this.tgSafe(() => ctx.reply('❌ Xatolik yuz berdi'));
    }
  }

  // ================= SHOW KEYWORDS =================
  private async showKeywords(ctx: SafeContext, type: 'client' | 'driver') {
    const label = type === 'client' ? 'Mijoz' : 'Haydovchi';
    const keywords = await this.keywordService.listKeywords(type);

    // Built-in keywords (hardcoded)
    const builtIn = type === 'client' ? this.CLIENT_WORDS_SINGLE : this.DRIVER_WORDS;
    let msg = `<b>${label} kalit soʻzlari</b>\n\n`;
    msg += `<b>Doimiy (kodda):</b>\n${builtIn.map(w => `• ${this.escapeHtml(w)}`).join('\n')}\n\n`;

    if (keywords.length) {
      msg += `<b>Qoʻshilgan (DB):</b>\n${keywords.map(k => `• ${this.escapeHtml(k.phrase)}`).join('\n')}`;

      const buttons = keywords.map(k => [
        Markup.button.callback(`❌ ${k.phrase}`, `rm_keyword:${k.id}`),
      ]);
      await this.tgSafe(() => ctx.reply(msg, { parse_mode: 'HTML' }));
      await this.tgSafe(() => ctx.reply('Oʻchirish uchun bosing:', Markup.inlineKeyboard(buttons)));
    } else {
      msg += '<i>Qoʻshilgan soʻzlar yoʻq</i>';
      await this.tgSafe(() => ctx.reply(msg, { parse_mode: 'HTML' }));
    }
  }

  // ================= DRIVER REPLY: handle olindi/otmen in groups =================
  private async handleDriverReply(ctx: SafeContext, text: string) {
    const reply = ctx.message?.reply_to_message;
    if (!reply) return;

    const normalized = text.trim().toLowerCase();
    // Accept Latin and Cyrillic forms
    const isOlindi = normalized === 'olindi' || normalized === 'олинди';
    const isOtmen = normalized === 'otmen' || normalized === 'отмен';
    if (!isOlindi && !isOtmen) return;

    // Check if the replied message is from the bot
    const botInfo = await ctx.telegram.getMe();
    if (reply.from?.id !== botInfo.id) return;

    // Extract order ID from the replied message text
    const replyText = reply.text || reply.caption || '';
    const match = replyText.match(/#(\d+)/);
    if (!match) return;

    const orderId = parseInt(match[1], 10);
    const order = await this.rideOrderService.getById(orderId);
    if (!order) return;

    const driverFirstName = ctx.from.first_name || '';
    const driverLastName = ctx.from.last_name || '';
    const driverName = `${driverFirstName} ${driverLastName}`.trim() || 'Haydovchi';
    const driverUsername = ctx.from.username;

    // Try to get driver's phone number
    let driverPhone = '';
    try {
      const chat = await ctx.telegram.getChat(ctx.from.id);
      if ('bio' in chat && (chat as any).phone_number) {
        driverPhone = (chat as any).phone_number;
      }
    } catch { /* ignore */ }

    if (isOlindi) {
      if (order.status !== 'pending') {
        await this.tgSafe(() => ctx.reply('⚠️ Bu buyurtma allaqachon qabul qilingan yoki tugallangan.', { reply_parameters: { message_id: ctx.message.message_id } }));
        return;
      }
      await this.rideOrderService.updateStatus(orderId, 'active');
      await this.tgSafe(() => ctx.reply(
        `✅ Buyurtma #${orderId} qabul qilindi!\n👤 Haydovchi: ${this.escapeHtml(driverName)}`,
        { parse_mode: 'HTML', reply_parameters: { message_id: reply.message_id } },
      ));

      // Build driver info for the user
      let driverInfo =
        `✅ <b>Buyurtma #${orderId} qabul qilindi!</b>\n\n` +
        `🚗 <b>Haydovchi ma'lumotlari:</b>\n` +
        `👤 <b>Ism:</b> <a href="tg://user?id=${ctx.from.id}">${this.escapeHtml(driverName)}</a>\n`;
      if (driverUsername) {
        driverInfo += `📱 <b>Telegram:</b> @${this.escapeHtml(driverUsername)}\n`;
      }
      if (driverPhone) {
        driverInfo += `📞 <b>Telefon:</b> ${this.escapeHtml(driverPhone)}\n`;
      }
      driverInfo +=
        `\n📍 ${this.escapeHtml(order.fromName)} → ${this.escapeHtml(order.toName)}\n` +
        `👥 Yo'lovchilar: ${order.passengers}\n\n` +
        `Safar tugagach "📋 Zakazlarim" bo'limidan tugatishingiz mumkin.`;

      // Notify the user with driver details
      try {
        await ctx.telegram.sendMessage(Number(order.userTgId), driverInfo, { parse_mode: 'HTML' });
      } catch (err) {
        console.log('NOTIFY USER ERROR:', err);
      }
    }

    if (isOtmen) {
      if (order.status !== 'pending' && order.status !== 'active') {
        await this.tgSafe(() => ctx.reply('⚠️ Bu buyurtmani bekor qilib bo\'lmaydi.', { reply_parameters: { message_id: ctx.message.message_id } }));
        return;
      }
      await this.rideOrderService.updateStatus(orderId, 'cancelled');
      await this.tgSafe(() => ctx.reply(
        `❌ Buyurtma #${orderId} bekor qilindi.\n👤 ${this.escapeHtml(driverName)}`,
        { parse_mode: 'HTML', reply_parameters: { message_id: reply.message_id } },
      ));

      // Notify the user
      try {
        await ctx.telegram.sendMessage(
          Number(order.userTgId),
          `❌ <b>Buyurtma #${orderId} bekor qilindi.</b>\n\n` +
          `📍 ${this.escapeHtml(order.fromName)} → ${this.escapeHtml(order.toName)}\n` +
          `Yangi buyurtma berish uchun "🚕 Taksi chaqirish" tugmasini bosing.`,
          { parse_mode: 'HTML' },
        );
      } catch (err) {
        console.log('NOTIFY USER ERROR:', err);
      }
    }
  }

  // ================= SCOUT: handle target group message =================
  private async handleTargetGroupMessage(ctx: SafeContext, text: string) {
    // Skip messages from bots
    if ((ctx.from as any)?.is_bot) return;

    if (!this.isTaxiOrder(text)) return;

    const groups = await this.redirectService.getActiveGroups();
    if (!groups.length) return;

    const sourceChatTitle = ctx.chat.title || String(ctx.chat.id);
    const scoutMsg = await this.buildScoutMessage(ctx, text, sourceChatTitle);

    let success = 0;

    for (const g of groups) {
      const target = g.chatId;

      // Try forward first, then copy fallback
      try {
        await this.safeForward(ctx, target, ctx.chat.id, ctx.message.message_id);

        // Send scout info as a follow-up
        await this.safeSendMessage(ctx, target, scoutMsg, { parse_mode: 'HTML' });
        success++;
      } catch {
        // Forward failed (protected etc) — send copy
        try {
          await this.safeSendMessage(ctx, target, scoutMsg, { parse_mode: 'HTML' });
          success++;
        } catch (err: any) {
          if (this.isWriteForbidden(err)) {
            console.log('SCOUT WRITE FORBIDDEN:', g.title);
          } else if (this.isProtectedError(err)) {
            console.log('SCOUT PROTECTED:', g.title);
          } else {
            console.log('SCOUT ERROR:', g.title, this.getErrDesc(err));
          }
        }
      }

      await this.tgDelay();
    }

    // Message deletion commented out — scout mode, we don't delete from target groups
    // if (success > 0) {
    //   try {
    //     await this.tgSafe(() => ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id));
    //   } catch {}
    // }

    if (success > 0) {
      console.log(`🔍 Scout: zakaz topildi va ${success} ta redirect ga yuborildi`);
    }
  }

  // ================= USER TEXT HANDLER =================
  private async handleUserText(ctx: SafeContext, text: string): Promise<boolean> {
    // 🚕 Taksi chaqirish — start ride wizard
    if (text === '🚕 Taksi chaqirish') {
      const locations = await this.locationService.getTopLevelLocations();
      if (!locations.length) {
        await this.tgSafe(() => ctx.reply('Hozircha joylashuvlar mavjud emas.'));
        return true;
      }
      this.rideState.set(ctx.from.id, { step: 'from' });
      const buttons = locations.map(l => [
        Markup.button.callback(l.name, `ride_from:${l.id}`),
      ]);
      await this.tgSafe(() =>
        ctx.reply('📍 Qayerdan?', Markup.inlineKeyboard(buttons)),
      );
      return true;
    }

    // ❌ Bekor qilish — always go home
    if (text === '❌ Bekor qilish') {
      this.rideState.delete(ctx.from.id);
      await this.sendUserHome(ctx);
      return true;
    }

    // 📋 Zakazlarim — show user's rides
    if (text === '📋 Zakazlarim') {
      await this.showUserOrders(ctx);
      return true;
    }

    // User is on phone step — accept typed number or forwarded contact text
    const state = this.rideState.get(ctx.from.id);
    if (state?.step === 'phone') {
      const phone = this.extractPhone(text);
      if (phone) {
        state.phone = phone;
        state.step = 'confirm';
        await this.showRideConfirm(ctx, state);
        return true;
      }
      // Try raw digits (user might type just numbers)
      const raw = text.replace(/[\s\-()]/g, '');
      if (/^\+?\d{9,13}$/.test(raw)) {
        state.phone = raw;
        state.step = 'confirm';
        await this.showRideConfirm(ctx, state);
        return true;
      }
      await this.tgSafe(() =>
        ctx.reply('❌ Raqam noto\'g\'ri. Masalan: +998901234567'),
      );
      return true;
    }

    return false;
  }

  // ================= CONTACT HANDLER (phone share) =================
  @On('contact')
  async onContact(@Ctx() ctx: SafeContext) {
    if (ctx.chat.type !== 'private') return;
    const contact = (ctx.message as any)?.contact;
    if (!contact?.phone_number) return;

    const state = this.rideState.get(ctx.from.id);
    if (state?.step === 'phone') {
      state.phone = contact.phone_number;
      state.step = 'confirm';
      await this.showRideConfirm(ctx, state);
    }
  }

  // ================= RIDE: show confirmation =================
  private async showRideConfirm(ctx: SafeContext, state: any) {
    const msg =
      `🚕 <b>Buyurtma ma'lumotlari:</b>\n\n` +
      `📍 <b>Qayerdan:</b> ${this.escapeHtml(state.fromName)}\n` +
      `📍 <b>Qayerga:</b> ${this.escapeHtml(state.toName)}\n` +
      `👥 <b>Yo'lovchilar:</b> ${state.count}\n` +
      `📞 <b>Telefon:</b> ${this.escapeHtml(state.phone)}\n`;

    await this.tgSafe(() =>
      ctx.reply(msg, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('✅ Tasdiqlash', 'ride_confirm')],
          [Markup.button.callback('❌ Bekor qilish', 'ride_cancel')],
        ]),
      }),
    );
  }

  // ================= RIDE: send order to redirect channels =================
  private async sendRideOrder(ctx: any, state: any, order?: any) {
    const userId = ctx.callbackQuery?.from?.id || ctx.from?.id;
    const firstName = ctx.callbackQuery?.from?.first_name || ctx.from?.first_name || '';
    const lastName = ctx.callbackQuery?.from?.last_name || ctx.from?.last_name || '';
    const username = ctx.callbackQuery?.from?.username || ctx.from?.username;
    const fullName = `${this.escapeHtml(firstName)} ${this.escapeHtml(lastName)}`.trim() || 'Noma\'lum';

    const contactLine = `👤 <b>Ism-familiya:</b> <a href="tg://user?id=${userId}">${fullName}</a>`;
    const statusLine = order ? `\n${this.rideOrderService.statusEmoji(order.status)}` : '';
    const orderIdLine = order ? `\n📋 <b>Buyurtma:</b> #${order.id}` : '';

    const msg =
      `🚕 <b>Yangi buyurtma!</b>\n\n` +
      contactLine + `\n` +
      `📞 <b>Telefon:</b> ${this.escapeHtml(state.phone)}\n\n` +
      `📍 <b>Qayerdan:</b> ${this.escapeHtml(state.fromName)}\n` +
      `📍 <b>Qayerga:</b> ${this.escapeHtml(state.toName)}\n` +
      `👥 <b>Yo'lovchilar:</b> ${state.count}` +
      orderIdLine +
      statusLine;

    const groups = await this.redirectService.getActiveGroups();
    let success = 0;
    for (const g of groups) {
      try {
        await this.safeSendMessage(ctx, g.chatId, msg, { parse_mode: 'HTML' });
        success++;
      } catch (err: any) {
        console.log('RIDE ORDER SEND ERROR:', g.title, this.getErrDesc(err));
      }
      await this.tgDelay();
    }
    return success;
  }

  // ================= USER ORDERS (Zakazlarim) =================
  private async showUserOrders(ctx: SafeContext) {
    const orders = await this.rideOrderService.getByUser(ctx.from.id);
    if (!orders.length) {
      await this.tgSafe(() => ctx.reply('📋 Sizda hali buyurtmalar yoʻq.'));
      return;
    }

    await this.tgSafe(() => ctx.reply('📋 <b>Sizning buyurtmalaringiz:</b>', { parse_mode: 'HTML' }));

    for (const o of orders) {
      const emoji = this.rideOrderService.statusEmoji(o.status);
      const label = this.rideOrderService.statusLabel(o.status);
      const date = o.createdAt.toLocaleDateString('uz-UZ');

      const msg =
        `${emoji}\n\n` +
        `📍 <b>${this.escapeHtml(o.fromName)}</b> → <b>${this.escapeHtml(o.toName)}</b>\n` +
        `👥 Yo'lovchilar: ${o.passengers}\n` +
        `📞 ${this.escapeHtml(o.phone)}\n` +
        `📅 ${date}\n\n` +
        `📌 <b>Holat:</b> ${label}`;

      const buttons: any[][] = [];
      if (o.status === 'active') {
        buttons.push([Markup.button.callback('✅ Safar tugadi', `ride_complete:${o.id}`)]);
        buttons.push([Markup.button.callback('❌ Bekor qilish', `ride_cancel_order:${o.id}`)]);
      }
      if (o.status === 'pending') {
        buttons.push([Markup.button.callback('❌ Bekor qilish', `ride_cancel_order:${o.id}`)]);
      }

      await this.tgSafe(() =>
        ctx.reply(msg, {
          parse_mode: 'HTML',
          ...(buttons.length ? Markup.inlineKeyboard(buttons) : {}),
        }),
      );
      await this.tgDelay();
    }
  }

  // ================= SHOW LOCATIONS =================
  private async showLocations(ctx: SafeContext) {
    const topLevel = await this.locationService.getTopLevelLocations();
    if (!topLevel.length) {
      await this.tgSafe(() => ctx.reply('Joylashuvlar yoʻq'));
      return;
    }
    const buttons = topLevel.map(l => [
      Markup.button.callback(`📍 ${l.name}`, `loc_view:${l.id}`),
    ]);
    await this.tgSafe(() =>
      ctx.reply('📍 Joylashuvlar (viloyat tanlang):', Markup.inlineKeyboard(buttons)),
    );
  }

  private async showLocationChildren(ctx: any, parentId: number) {
    const parent = await this.locationService.getById(parentId);
    const children = await this.locationService.getChildren(parentId);
    const parentName = parent?.name || `#${parentId}`;

    let msg = `📍 <b>${this.escapeHtml(parentName)}</b> ichidagi joylar:\n\n`;
    if (children.length) {
      msg += children.map(c => `• ${this.escapeHtml(c.name)}`).join('\n');
    } else {
      msg += '<i>Hozircha joylar yoʻq</i>';
    }

    const buttons: any[][] = children.map(c => [
      Markup.button.callback(`❌ ${c.name}`, `rm_loc:${c.id}`),
    ]);
    buttons.push([Markup.button.callback(`➕ Joy qoʻshish`, `add_loc:${parentId}`)]);

    await this.tgSafe(() => ctx.reply(msg, { parse_mode: 'HTML' }));
    await this.tgSafe(() =>
      ctx.reply('Boshqarish:', Markup.inlineKeyboard(buttons)),
    );
  }

  // ================= SHOW ADMIN LOGS =================
  private async showAdminLogs(ctx: SafeContext) {
    const logs = await this.adminLogService.getRecentLogs(20);
    if (!logs.length) {
      await this.tgSafe(() => ctx.reply('Admin loglar yoʻq'));
      return;
    }

    let msg = '<b>📜 Oxirgi admin loglar:</b>\n\n';
    for (const log of logs) {
      const date = log.createdAt.toISOString().slice(0, 16).replace('T', ' ');
      const adminId = log.adminTgId.toString();
      msg += `<b>${this.escapeHtml(log.action)}</b> | ${this.escapeHtml(log.targetType)} | ${this.escapeHtml(log.details || '-')}\n`;
      msg += `  👤 ${adminId} | 🕐 ${date}\n\n`;
    }

    const restorableLogs = logs.filter(l => l.action === 'remove');
    if (restorableLogs.length) {
      const buttons = restorableLogs.map(l => [
        Markup.button.callback(
          `♻️ ${l.targetType}: ${(l.details || '').slice(0, 30)}`,
          `restore_log:${l.id}`,
        ),
      ]);
      await this.tgSafe(() => ctx.reply(msg, { parse_mode: 'HTML' }));
      await this.tgSafe(() =>
        ctx.reply('Qayta tiklash uchun bosing:', Markup.inlineKeyboard(buttons)),
      );
    } else {
      await this.tgSafe(() => ctx.reply(msg, { parse_mode: 'HTML' }));
    }
  }

  // ================= CALLBACK =================
  @On('callback_query')
  async onCallback(@Ctx() ctx: any) {
    const data = ctx.callbackQuery?.data;
    if (!data) return;
    const userId = ctx.callbackQuery?.from?.id;

    // Rate limit callback queries
    if (userId && this.isRateLimited(userId)) {
      await this.tgSafe(() => ctx.answerCbQuery('⚠️ Sekinroq bosing.'));
      return;
    }

    if (data.startsWith('rm_redirect:')) {
      const chatId = data.replace('rm_redirect:', '');
      const groups = await this.redirectService.getActiveGroups();
      const group = groups.find(g => g.chatId === chatId);
      await this.redirectService.removeGroup(chatId);
      await this.adminLogService.log({
        adminTgId: userId, action: 'remove', targetType: 'redirect',
        targetId: chatId, details: group?.title || chatId,
        previousValue: JSON.stringify(group),
      });
      await this.tgSafe(() => ctx.answerCbQuery('O\'chirildi'));
      await this.tgSafe(() => ctx.editMessageText('❌ Redirect o\'chirildi'));
    }

    if (data.startsWith('rm_target:')) {
      const chatId = data.replace('rm_target:', '');
      const groups = await this.targetService.getActiveGroups();
      const group = groups.find(g => g.chatId === chatId);
      await this.targetService.removeGroup(chatId);
      await this.adminLogService.log({
        adminTgId: userId, action: 'remove', targetType: 'target',
        targetId: chatId, details: group?.title || chatId,
        previousValue: JSON.stringify(group),
      });
      await this.tgSafe(() => ctx.answerCbQuery('Oʻchirildi'));
      await this.tgSafe(() => ctx.editMessageText('❌ Target oʻchirildi'));
    }

    if (data.startsWith('rm_keyword:')) {
      const id = parseInt(data.replace('rm_keyword:', ''), 10);
      if (!isNaN(id)) {
        const kws = await this.keywordService.listKeywords();
        const kw = kws.find(k => k.id === id);
        await this.keywordService.removeKeywordById(id);
        await this.adminLogService.log({
          adminTgId: userId, action: 'remove', targetType: 'keyword',
          targetId: String(id), details: kw ? `${kw.type}: ${kw.phrase}` : String(id),
          previousValue: JSON.stringify(kw),
        });
        await this.tgSafe(() => ctx.answerCbQuery('Oʻchirildi'));
        await this.tgSafe(() => ctx.editMessageText('❌ Kalit soʻz oʻchirildi'));
      }
    }

    // --- Location: view children ---
    if (data.startsWith('loc_view:')) {
      const parentId = parseInt(data.replace('loc_view:', ''), 10);
      if (!isNaN(parentId)) {
        await this.tgSafe(() => ctx.answerCbQuery());
        await this.showLocationChildren(ctx, parentId);
      }
    }

    // --- Location: add sub-location ---
    if (data.startsWith('add_loc:')) {
      const parentId = parseInt(data.replace('add_loc:', ''), 10);
      if (!isNaN(parentId)) {
        this.waitingLocationSub.set(userId, parentId);
        const parent = await this.locationService.getById(parentId);
        await this.tgSafe(() => ctx.answerCbQuery());
        await this.tgSafe(() =>
          ctx.reply(
            `📍 ${parent?.name || ''} ichiga yangi joy nomini yozing:`,
            Markup.keyboard([['❌ Bekor qilish', '🏠 Bosh sahifa']]).resize(),
          ),
        );
      }
    }

    // --- Location: remove ---
    if (data.startsWith('rm_loc:')) {
      const id = parseInt(data.replace('rm_loc:', ''), 10);
      if (!isNaN(id)) {
        const loc = await this.locationService.getById(id);
        await this.locationService.removeLocation(id);
        await this.adminLogService.log({
          adminTgId: userId, action: 'remove', targetType: 'location',
          targetId: String(id), details: loc?.name || String(id),
          previousValue: JSON.stringify(loc),
        });
        await this.tgSafe(() => ctx.answerCbQuery('Oʻchirildi'));
        await this.tgSafe(() => ctx.editMessageText(`❌ ${loc?.name || ''} oʻchirildi`));
      }
    }

    // --- Admin log: restore ---
    if (data.startsWith('restore_log:')) {
      if (!(await this.adminService.isSuperAdmin(userId))) {
        await this.tgSafe(() => ctx.answerCbQuery('Faqat superadmin'));
        return;
      }
      const logId = parseInt(data.replace('restore_log:', ''), 10);
      if (!isNaN(logId)) {
        const log = await this.adminLogService.getLogById(logId);
        if (!log || log.restoredAt) {
          await this.tgSafe(() => ctx.answerCbQuery('Allaqachon tiklangan'));
          return;
        }
        await this.restoreFromLog(log);
        await this.adminLogService.markRestored(logId);
        await this.tgSafe(() => ctx.answerCbQuery('Tiklandi'));
        await this.tgSafe(() =>
          ctx.editMessageText(`♻️ Tiklandi: ${log.targetType} — ${log.details || log.targetId}`),
        );
      }
    }

    // --- Ride: pick origin ---
    if (data.startsWith('ride_from:')) {
      const id = parseInt(data.replace('ride_from:', ''), 10);
      if (isNaN(id)) return;
      const loc = await this.locationService.getById(id);
      if (!loc) return;

      const state = this.rideState.get(userId) || { step: 'from' as const };
      state.fromId = id;
      state.fromName = loc.name;
      state.step = 'to';
      this.rideState.set(userId, state);

      const locations = await this.locationService.getTopLevelLocations();
      const remaining = locations.filter(l => l.id !== id);

      if (!remaining.length) {
        await this.tgSafe(() => ctx.answerCbQuery('Boshqa joy yoʻq'));
        return;
      }

      const buttons = remaining.map(l => [
        Markup.button.callback(l.name, `ride_to:${l.id}`),
      ]);
      await this.tgSafe(() => ctx.answerCbQuery());
      await this.tgSafe(() =>
        ctx.editMessageText('📍 Qayerga?', Markup.inlineKeyboard(buttons)),
      );
    }

    // --- Ride: pick destination ---
    if (data.startsWith('ride_to:')) {
      const id = parseInt(data.replace('ride_to:', ''), 10);
      if (isNaN(id)) return;
      const loc = await this.locationService.getById(id);
      if (!loc) return;

      const state = this.rideState.get(userId);
      if (!state || state.step !== 'to') return;

      state.toId = id;
      state.toName = loc.name;
      state.step = 'count';
      this.rideState.set(userId, state);

      const buttons = [
        [
          Markup.button.callback('1', 'ride_count:1'),
          Markup.button.callback('2', 'ride_count:2'),
          Markup.button.callback('3', 'ride_count:3'),
          Markup.button.callback('4', 'ride_count:4'),
        ],
      ];
      await this.tgSafe(() => ctx.answerCbQuery());
      await this.tgSafe(() =>
        ctx.editMessageText('👥 Necha kishi?', Markup.inlineKeyboard(buttons)),
      );
    }

    // --- Ride: pick passenger count ---
    if (data.startsWith('ride_count:')) {
      const count = parseInt(data.replace('ride_count:', ''), 10);
      if (isNaN(count)) return;

      const state = this.rideState.get(userId);
      if (!state || state.step !== 'count') return;

      state.count = count;
      state.step = 'phone';
      this.rideState.set(userId, state);

      await this.tgSafe(() => ctx.answerCbQuery());
      await this.tgSafe(() =>
        ctx.editMessageText(`✅ ${count} kishi tanlandi.`),
      );
      await this.tgSafe(() =>
        ctx.reply(
          '📞 Telefon raqamingizni yozing yoki kontakt yuboring:',
          Markup.keyboard([
            [Markup.button.contactRequest('📞 Kontakt yuborish')],
            ['❌ Bekor qilish'],
          ]).resize(),
        ),
      );
    }

    // --- Ride: confirm ---
    if (data === 'ride_confirm') {
      const state = this.rideState.get(userId);
      if (!state || state.step !== 'confirm') return;

      await this.tgSafe(() => ctx.answerCbQuery());

      // Save ride order to DB
      let order: any = null;
      try {
        order = await this.rideOrderService.create({
          userTgId: userId,
          fromName: state.fromName!,
          toName: state.toName!,
          passengers: state.count!,
          phone: state.phone!,
        });
      } catch (err) {
        console.log('RIDE ORDER DB SAVE ERROR:', err);
      }

      const success = await this.sendRideOrder(ctx, state, order);
      this.rideState.delete(userId);

      if (success > 0) {
        await this.tgSafe(() =>
          ctx.editMessageText('✅ Buyurtmangiz qabul qilindi! Tez orada haydovchi siz bilan bogʻlanadi.'),
        );
      } else {
        await this.tgSafe(() =>
          ctx.editMessageText('❌ Hozircha buyurtma qabul qilib boʻlmadi. Keyinroq urinib koʻring.'),
        );
      }
      // Restore user home keyboard
      await this.tgSafe(() =>
        ctx.reply(
          '🚕 Yana taksi chaqirish uchun tugmani bosing.',
          Markup.keyboard([['🚕 Taksi chaqirish', '📋 Zakazlarim']]).resize(),
        ),
      );
    }

    // --- Ride: cancel ---
    if (data === 'ride_cancel') {
      this.rideState.delete(userId);
      await this.tgSafe(() => ctx.answerCbQuery('Bekor qilindi'));
      await this.tgSafe(() => ctx.editMessageText('❌ Buyurtma bekor qilindi.'));
      await this.tgSafe(() =>
        ctx.reply(
          '🚕 Yana taksi chaqirish uchun tugmani bosing.',
          Markup.keyboard([['🚕 Taksi chaqirish', '📋 Zakazlarim']]).resize(),
        ),
      );
    }

    // --- Ride: cancel existing order from Zakazlarim ---
    if (data.startsWith('ride_cancel_order:')) {
      const orderId = parseInt(data.replace('ride_cancel_order:', ''), 10);
      if (isNaN(orderId)) return;

      const order = await this.rideOrderService.getById(orderId);
      if (!order || Number(order.userTgId) !== userId) {
        await this.tgSafe(() => ctx.answerCbQuery('Buyurtma topilmadi'));
        return;
      }
      if (order.status !== 'pending' && order.status !== 'active') {
        await this.tgSafe(() => ctx.answerCbQuery('Buyurtma allaqachon tugallangan'));
        return;
      }

      await this.rideOrderService.updateStatus(orderId, 'cancelled');
      await this.tgSafe(() => ctx.answerCbQuery('Bekor qilindi'));
      await this.tgSafe(() =>
        ctx.editMessageText('❌ Buyurtma #' + orderId + ' bekor qilindi.'),
      );
    }

    // --- Ride: complete (user finishes ride) ---
    if (data.startsWith('ride_complete:')) {
      const orderId = parseInt(data.replace('ride_complete:', ''), 10);
      if (isNaN(orderId)) return;

      const order = await this.rideOrderService.getById(orderId);
      if (!order || Number(order.userTgId) !== userId) {
        await this.tgSafe(() => ctx.answerCbQuery('Buyurtma topilmadi'));
        return;
      }
      if (order.status !== 'active') {
        await this.tgSafe(() => ctx.answerCbQuery('Faqat faol buyurtmani tugatish mumkin'));
        return;
      }

      await this.rideOrderService.updateStatus(orderId, 'completed');
      await this.tgSafe(() => ctx.answerCbQuery('Tugallandi'));
      await this.tgSafe(() =>
        ctx.editMessageText('✅ Buyurtma #' + orderId + ' tugallandi. Rahmat!'),
      );
    }
  }

  // ================= RESTORE FROM LOG =================
  private async restoreFromLog(log: any) {
    const prev = log.previousValue ? JSON.parse(log.previousValue) : null;
    switch (log.targetType) {
      case 'redirect':
        if (prev) {
          try {
            await this.redirectService.addGroup({
              chatId: prev.chatId, title: prev.title, addedById: Number(prev.addedById),
            });
          } catch { /* already exists */ }
        }
        break;
      case 'target':
        if (prev) {
          try {
            await this.targetService.addGroup({ chatId: prev.chatId, title: prev.title });
          } catch { /* already exists */ }
        }
        break;
      case 'keyword':
        if (prev) {
          try {
            await this.keywordService.addKeyword(prev.phrase, prev.type);
          } catch { /* already exists */ }
        }
        break;
      case 'location':
        try {
          await this.locationService.restoreLocation(parseInt(log.targetId, 10));
        } catch { /* not found */ }
        break;
    }
  }
}
