/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
import { AdminService } from '../../admin/admin.service';
import { Markup } from 'telegraf';
import { RedirectService } from '../../redirect/redirect.service';
import { TargetService } from '../../target/target.service';
import { KeywordService } from '../../keyword/keyword.service';
import { LocationService } from '../../location/location.service';
import { AdminLogService } from '../../admin-log/admin-log.service';
import { RideOrderService } from '../../ride-order/ride-order.service';
import { DriverService } from '../../driver/driver.service';
import { DriverPostService } from '../../driver-post/driver-post.service';
import { PublicChannelService } from '../../public-channel/public-channel.service';
import { UserClientService } from '../../user-client/user-client.service';
import { DriverBotService } from '../services/driver-bot.service';
import { ClientBotService } from '../services/client-bot.service';
import { AdminBotService } from '../services/admin-bot.service';
import { ParsingEngine } from '../../core/parsing/parsing.engine';
import { ScoringEngine } from '../../core/scoring/scoring.engine';
import { ClientRequestState } from '../../core/state/state.types';
import { Logger } from '@nestjs/common';
import type {
  BotAudience,
  DriverPostFlowState,
  DriverRegFlowState,
  RideFlowState,
  SafeContext,
} from './bot-update.types';
import {
  CLIENT_WORDS_SINGLE,
  DRIVER_WORDS,
  extractUzPhone,
  isTaxiOrderText,
} from './order-filter.util';
import {
  escapeHtml,
  isRedirectTargetType,
  normalizeChatRef,
} from './telegram-format.util';
import { handleAdminText } from './handlers/handle-admin-text';
import { handleUserText } from './handlers/handle-user-text';
import { handleCallback } from './handlers/handle-callback';
import { handleDriverReply } from './handlers/handle-driver-reply';
import { handleTargetGroupMessage } from './handlers/handle-target-group-message';

export class BotUpdateBase {
  private readonly logger = new Logger(BotUpdateBase.name);
  private readonly botAudience: BotAudience;

  constructor(
    private readonly redirectService: RedirectService,
    private readonly adminService: AdminService,
    private readonly targetService: TargetService,
    private readonly keywordService: KeywordService,
    private readonly locationService: LocationService,
    private readonly adminLogService: AdminLogService,
    private readonly rideOrderService: RideOrderService,
    private readonly driverService: DriverService,
    private readonly driverPostService: DriverPostService,
    private readonly publicChannelService: PublicChannelService,
    private readonly userClientService: UserClientService,
    private readonly driverBotService: DriverBotService,
    private readonly clientBotService: ClientBotService,
    private readonly adminBotService: AdminBotService,
    private readonly parsingEngine: ParsingEngine,
    private readonly scoringEngine: ScoringEngine,
    audience: BotAudience = 'all',
  ) {
    this.botAudience = audience;
  }

  private waitingRedirect = new Set<number>();
  private waitingTarget = new Set<number>();
  private waitingKeyword = new Map<number, 'client' | 'driver'>();
  private waitingLocationSub = new Map<number, number>(); // userId -> parentId

  // ---- User ride request state ----
  private rideState = new Map<number, RideFlowState>();

  // ---- Driver registration state ----
  private driverRegState = new Map<number, DriverRegFlowState>();

  // ---- Driver post state ----
  private driverPostState = new Map<number, DriverPostFlowState>();

  // ---- Waiting for public channel input ----
  private waitingPublicChannel = new Set<number>();

  // ---- Rate limiter: userId -> timestamp[] ----
  private rateLimits = new Map<number, number[]>();
  private readonly RATE_LIMIT_WINDOW = 10_000; // 10 seconds
  private readonly RATE_LIMIT_MAX = 5; // max actions per window
  private readonly actionLocks = new Map<string, number>();
  private readonly ACTION_LOCK_TTL_MS = 8_000;

  private isRateLimited(userId: number): boolean {
    const now = Date.now();
    const timestamps = (this.rateLimits.get(userId) || []).filter(
      (t) => now - t < this.RATE_LIMIT_WINDOW,
    );
    if (timestamps.length >= this.RATE_LIMIT_MAX) {
      this.rateLimits.set(userId, timestamps);
      return true;
    }
    timestamps.push(now);
    this.rateLimits.set(userId, timestamps);
    return false;
  }

  private readonly forceClientPhrases: string[] = [];

  protected inlineTextKeyboard(rows: string[][]) {
    return Markup.inlineKeyboard(
      rows.map((row) =>
        row.map((label) =>
          Markup.button.callback(label, `txt:${encodeURIComponent(label)}`),
        ),
      ),
    );
  }

  public isAdminAudience(): boolean {
    return this.botAudience === 'all' || this.botAudience === 'admin';
  }

  public isClientAudience(): boolean {
    return this.botAudience === 'all' || this.botAudience === 'client';
  }

  public isDriverAudience(): boolean {
    return this.botAudience === 'all' || this.botAudience === 'driver';
  }

  private tryAcquireActionLock(key: string): boolean {
    const now = Date.now();
    const lockUntil = this.actionLocks.get(key) || 0;
    if (lockUntil > now) return false;
    this.actionLocks.set(key, now + this.ACTION_LOCK_TTL_MS);
    return true;
  }

  private logEvent(event: string, meta: Record<string, unknown>) {
    this.logger.log(JSON.stringify({ event, ...meta }));
  }

  private isTaxiOrder(text: string): boolean {
    return isTaxiOrderText({
      text,
      driverKeywords: this.keywordService.getDriverKeywords(),
      clientKeywords: this.keywordService.getClientKeywords(),
      forceClientPhrases: this.forceClientPhrases,
    });
  }

  private extractPhone(text: string): string | null {
    return extractUzPhone(text);
  }

  private normalizeChatRef(raw: string): string {
    return normalizeChatRef(raw);
  }

  private isRedirectTargetType(type?: string): boolean {
    return isRedirectTargetType(type);
  }

  private escapeHtml(v: any) {
    return escapeHtml(v);
  }

  // ================== SAFETY HELPERS (429 + DELAY) ==================

  private sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
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

  private async safeSendMessage(
    ctx: any,
    chatId: number | string,
    text: string,
    extra?: any,
  ) {
    try {
      return await this.tgSafe(() =>
        ctx.telegram.sendMessage(chatId, text, extra),
      );
    } catch (e: any) {
      const d = this.getErrDesc(e).toLowerCase();
      if (
        d.includes('bot was blocked by the user') ||
        d.includes('user is deactivated')
      ) {
        return null;
      }
      throw e;
    }
  }

  private async safeForward(
    ctx: any,
    targetId: number | string,
    sourceId: number | string,
    messageId: number,
  ) {
    return this.tgSafe(() =>
      ctx.telegram.forwardMessage(targetId, sourceId, messageId),
    );
  }

  // ================= BUILD SCOUT MESSAGE =================
  private async buildScoutMessage(
    ctx: SafeContext,
    originalText: string,
    sourceChatTitle?: string,
  ): Promise<string> {
    const name = this.escapeHtml(ctx.from?.first_name || '');
    const lastName = this.escapeHtml(ctx.from?.last_name || '');
    const fullName = `${name} ${lastName}`.trim() || "Noma'lum";
    const rawUsername = ctx.from?.username;
    const botUsername = (ctx as any).botInfo?.username;
    const username =
      rawUsername && rawUsername.toLowerCase() !== botUsername?.toLowerCase()
        ? `@${this.escapeHtml(rawUsername)}`
        : null;
    const userId = ctx.from.id;

    // 1) Phone from message text
    let phone = this.extractPhone(originalText);

    // 2) Phone from shared contact in message
    if (!phone) {
      const contact = ctx.message?.contact;
      if (contact?.phone_number) {
        phone = contact.phone_number;
      }
    }

    // 3) Phone from user's Telegram profile (getChat)
    if (!phone) {
      try {
        const userChat = (await this.tgSafe(() =>
          ctx.telegram.getChat(userId),
        )) as any;
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
    const sourceLine = sourceChatTitle
      ? `\n📍 ${this.escapeHtml(sourceChatTitle)}`
      : '';

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
    this.waitingPublicChannel.delete(ctx.from.id);

    if (isSuperAdmin) {
      await this.tgSafe(() =>
        ctx.reply(
          '🔧 Admin panel:',
          this.inlineTextKeyboard([
            ["➕ Redirect qo'shish", '📋 Redirectlar'],
            ["📥 Client guruh qo'shish", '📋 Client guruhlar'],
            ['📗 Kalit soʻzlar', '📍 Joylashuvlar'],
            ['📢 Ommaviy kanal', '📜 Admin loglar'],
          ]),
        ),
      );
    } else {
      await this.tgSafe(() =>
        ctx.reply(
          '🔧 Admin panel:',
          this.inlineTextKeyboard([['📍 Joylashuvlar'], ['🏠 Bosh sahifa']]),
        ),
      );
    }
  }

  // ================= USER HOME =================
  private async sendUserHome(ctx: SafeContext) {
    this.rideState.delete(ctx.from.id);
    this.driverRegState.delete(ctx.from.id);
    this.driverPostState.delete(ctx.from.id);
    await this.tgSafe(() =>
      ctx.reply(
        '🚕 Taksi botga xush kelibsiz!\nTaksi buyurtma berish yoki haydovchi sifatida roʻyxatdan oʻtish uchun pastdagi tugmani bosing.',
        this.inlineTextKeyboard(
          this.isDriverAudience()
            ? [['🚕 Taksi chaqirish', '📋 Zakazlarim'], ['🚗 Haydovchi']]
            : [['🚕 Taksi chaqirish', '📋 Zakazlarim']],
        ),
      ),
    );
  }

  // ================= START =================
  async start(ctx: SafeContext) {
    if (ctx.chat.type !== 'private') return;

    if (this.botAudience === 'admin') {
      const isSuperAdmin = await this.adminService.isSuperAdmin(ctx.from.id);
      const isAdmin =
        isSuperAdmin || (await this.adminService.isAdmin(ctx as any));
      if (!isAdmin) {
        await this.tgSafe(() => ctx.reply('⛔ Bu bot faqat adminlar uchun.'));
        return;
      }
      await this.sendMainMenu(ctx, isSuperAdmin);
      return;
    }

    if (this.botAudience === 'driver') {
      await this.sendDriverMenu(ctx);
      return;
    }

    if (await this.adminService.isSuperAdmin(ctx.from.id)) {
      await this.tgSafe(() => ctx.reply('👋 Salom Admin!\n/admin yozing.'));
      return;
    }

    await this.sendUserHome(ctx);
  }

  // ================= ADMIN =================
  async admin(ctx: SafeContext) {
    if (ctx.chat.type !== 'private') return;
    if (!this.isAdminAudience()) return;
    const isSuperAdmin = await this.adminService.isSuperAdmin(ctx.from.id);
    const isAdmin = await this.adminService.isAdmin(ctx as any);
    if (!isSuperAdmin && !isAdmin) return;

    await this.sendMainMenu(ctx, isSuperAdmin);
  }

  // ================= GETID =================
  async getId(ctx: any) {
    await this.tgSafe(() => ctx.reply(`Chat ID: ${ctx.chat.id}`));
  }

  // ================= TEXT =================
  async onText(ctx: SafeContext) {
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
      if (this.isAdminAudience()) {
        const isSuperAdmin = await this.adminService.isSuperAdmin(ctx.from.id);
        const isAdmin =
          isSuperAdmin || (await this.adminService.isAdmin(ctx as any));

        if (isAdmin) {
          const handled = await this.handleAdminText(ctx, text, isSuperAdmin);
          if (handled) return;
        }

        if (this.botAudience === 'admin') {
          if (!isAdmin) {
            await this.tgSafe(() =>
              ctx.reply('⛔ Bu bot faqat adminlar uchun.'),
            );
          }
          return;
        }
      }

      /* ===== USER RIDE REQUEST (private, non-admin or unhandled) ===== */
      if (this.isClientAudience() || this.isDriverAudience()) {
        const handled = await this.handleUserText(ctx, text);
        if (handled) return;
      }
    }

    /* ===== SCOUT MODE — monitor target/public groups ===== */
    const isPrivate = ctx.chat.type === 'private';
    if (!isPrivate) {
      if (!this.isAdminAudience()) return;

      const chatId = String(ctx.chat.id);
      const isTarget = await this.targetService.isTargetGroup(chatId);
      if (isTarget) {
        if (!this.userClientService.isConnected()) {
          await this.handleTargetGroupMessage(ctx, text);
        } else {
          this.logEvent('target_message_skipped_bot_scout', {
            reason: 'user_client_connected',
            chatId,
          });
        }
        return;
      }

      const isPaidDriverGroup =
        await this.redirectService.isRedirectGroup(chatId);
      if (isPaidDriverGroup) {
        await this.handleDriverReply(ctx, text);
        return;
      }

      // Other groups are intentionally ignored.
    }
  }

  // ================= ADMIN TEXT HANDLER =================
  private async handleAdminText(
    ctx: SafeContext,
    text: string,
    isSuperAdmin: boolean,
  ): Promise<boolean> {
    return handleAdminText(this, ctx, text, isSuperAdmin);
  }

  // ================= ADD REDIRECT =================
  private async processAddRedirect(ctx: SafeContext, text: string) {
    try {
      const forwardedChat = ctx.message?.forward_from_chat;
      let chatId = '';
      let title = '';

      if (forwardedChat?.id) {
        if (!this.isRedirectTargetType(forwardedChat.type)) {
          await this.tgSafe(() =>
            ctx.reply("❌ Faqat guruh/superguruh/kanal redirectga qo'shiladi."),
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
            ctx.reply("❌ Faqat guruh/superguruh/kanal redirectga qo'shiladi."),
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
      await this.adminLogService.log({
        adminTgId: ctx.from.id,
        action: 'add',
        targetType: 'redirect',
        targetId: chatId,
        details: title,
      });
      this.waitingRedirect.delete(ctx.from.id);
      await this.tgSafe(() => ctx.reply(`✅ Redirect qo'shildi: ${title}`));
      await this.sendMainMenu(ctx, true);
    } catch (err: any) {
      const desc = this.getErrDesc(err).toLowerCase();
      if ((err as Error)?.message === 'INVITE_LINK_UNSUPPORTED') {
        await this.tgSafe(() =>
          ctx.reply(
            '❌ Invite link ishlamaydi. @username yoki chat ID yuboring.',
          ),
        );
        return;
      }
      if (desc.includes('chat not found') || desc.includes('bad request')) {
        await this.tgSafe(() =>
          ctx.reply("❌ Chat topilmadi. Bot guruhga qo'shilganmi?"),
        );
        return;
      }
      await this.tgSafe(() => ctx.reply('❌ Xatolik yuz berdi'));
    }
  }

  // ================= ADD TARGET =================
  private async processAddTarget(ctx: SafeContext, text: string) {
    try {
      const forwardedChat = ctx.message?.forward_from_chat;
      let chatId = '';
      let title = '';

      if (forwardedChat?.id) {
        if (!this.isRedirectTargetType(forwardedChat.type)) {
          await this.tgSafe(() =>
            ctx.reply("❌ Faqat guruh/superguruh/kanal target bo'ladi."),
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
            ctx.reply("❌ Faqat guruh/superguruh/kanal target bo'ladi."),
          );
          return;
        }
        chatId = String((chat as any).id);
        title = (chat as any).title || ref;
      }

      await this.targetService.addGroup({ chatId, title });
      await this.adminLogService.log({
        adminTgId: ctx.from.id,
        action: 'add',
        targetType: 'target',
        targetId: chatId,
        details: title,
      });
      this.waitingTarget.delete(ctx.from.id);
      await this.tgSafe(() => ctx.reply(`✅ Target qo'shildi: ${title}`));
      await this.sendMainMenu(ctx, true);
    } catch (err: any) {
      const desc = this.getErrDesc(err).toLowerCase();
      if ((err as Error)?.message === 'INVITE_LINK_UNSUPPORTED') {
        await this.tgSafe(() =>
          ctx.reply(
            '❌ Invite link ishlamaydi. @username yoki chat ID yuboring.',
          ),
        );
        return;
      }
      if (desc.includes('chat not found') || desc.includes('bad request')) {
        await this.tgSafe(() =>
          ctx.reply("❌ Chat topilmadi. Bot guruhga qo'shilganmi?"),
        );
        return;
      }
      await this.tgSafe(() => ctx.reply('❌ Xatolik yuz berdi'));
    }
  }

  // ================= ADD PUBLIC CHANNEL =================
  private async processAddPublicChannel(ctx: SafeContext, text: string) {
    try {
      const ref = this.normalizeChatRef(text);
      const chat = (await this.tgSafe(() => ctx.telegram.getChat(ref))) as any;
      if (!chat || !['channel', 'supergroup', 'group'].includes(chat.type)) {
        await this.tgSafe(() =>
          ctx.reply("❌ Faqat kanal yoki guruhni qo'shish mumkin."),
        );
        return;
      }
      const chatId = String(chat.id);
      const title = chat.title || ref;

      await this.publicChannelService.addChannel({ chatId, title });
      this.waitingPublicChannel.delete(ctx.from.id);
      await this.tgSafe(() =>
        ctx.reply(`✅ Ommaviy kanal qo'shildi: ${title}`),
      );
      await this.sendMainMenu(ctx, true);
    } catch (err: any) {
      const desc = this.getErrDesc(err).toLowerCase();
      if (desc.includes('chat not found') || desc.includes('bad request')) {
        await this.tgSafe(() =>
          ctx.reply("❌ Kanal topilmadi. Bot kanalga qo'shilganmi?"),
        );
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
    const builtIn = type === 'client' ? CLIENT_WORDS_SINGLE : DRIVER_WORDS;
    let msg = `<b>${label} kalit soʻzlari</b>\n\n`;
    msg += `<b>Doimiy (kodda):</b>\n${builtIn.map((w) => `• ${this.escapeHtml(w)}`).join('\n')}\n\n`;

    if (keywords.length) {
      msg += `<b>Qoʻshilgan (DB):</b>\n${keywords.map((k) => `• ${this.escapeHtml(k.phrase)}`).join('\n')}`;

      const buttons = keywords.map((k) => [
        Markup.button.callback(`❌ ${k.phrase}`, `rm_keyword:${k.id}`),
      ]);
      await this.tgSafe(() => ctx.reply(msg, { parse_mode: 'HTML' }));
      await this.tgSafe(() =>
        ctx.reply('Oʻchirish uchun bosing:', Markup.inlineKeyboard(buttons)),
      );
    } else {
      msg += '<i>Qoʻshilgan soʻzlar yoʻq</i>';
      await this.tgSafe(() => ctx.reply(msg, { parse_mode: 'HTML' }));
    }
  }

  // ================= DRIVER REPLY: handle olindi/otmen in groups =================
  private async handleDriverReply(ctx: SafeContext, text: string) {
    return handleDriverReply(this, ctx, text);
  }

  // ================= SCOUT: handle target group message =================
  private async handleTargetGroupMessage(ctx: SafeContext, text: string) {
    return handleTargetGroupMessage(this, ctx, text);
  }

  // ================= USER TEXT HANDLER =================
  private async handleUserText(
    ctx: SafeContext,
    text: string,
  ): Promise<boolean> {
    return handleUserText(this, ctx, text);
  }

  // ================= CONTACT HANDLER (phone share) =================
  async onContact(ctx: SafeContext) {
    if (ctx.chat.type !== 'private') return;
    if (!this.isClientAudience() && !this.isDriverAudience()) return;
    const contact = ctx.message?.contact;
    if (!contact?.phone_number) return;

    // Driver registration phone step
    const driverReg = this.driverRegState.get(ctx.from.id);
    if (driverReg?.step === 'phone') {
      driverReg.phone = contact.phone_number;
      driverReg.step = 'carNumber';
      await this.tgSafe(() =>
        ctx.reply(
          '🚙 Mashina raqamini kiriting (masalan: 01A123BC):',
          this.inlineTextKeyboard([['❌ Bekor qilish']]),
        ),
      );
      return;
    }

    const state = this.rideState.get(ctx.from.id);
    if (state?.step === 'phone') {
      state.phone = contact.phone_number;
      state.step = 'confirm';
      await this.showRideConfirm(ctx, state);
    }
  }

  // ================= PHOTO HANDLER (car photo for driver registration) =================
  async onPhoto(ctx: SafeContext) {
    if (ctx.chat.type !== 'private') return;
    if (!this.isDriverAudience()) return;
    const driverReg = this.driverRegState.get(ctx.from.id);
    if (!driverReg || driverReg.step !== 'carPhoto') return;

    const photos = ctx.message?.photo;
    if (!photos?.length) return;

    // Get the highest resolution photo
    const photo = photos[photos.length - 1];
    driverReg.carPhotoId = photo.file_id;
    await this.finishDriverRegistration(ctx, driverReg);
  }

  // ================= RIDE: show confirmation =================
  private async showRideConfirm(ctx: SafeContext, state: RideFlowState) {
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
  private async sendRideOrder(
    ctx: any,
    state: RideFlowState,
    order?: { id: number; status: string } | null,
  ) {
    const userId = ctx.callbackQuery?.from?.id || ctx.from?.id;
    const firstName =
      ctx.callbackQuery?.from?.first_name || ctx.from?.first_name || '';
    const lastName =
      ctx.callbackQuery?.from?.last_name || ctx.from?.last_name || '';
    const username = ctx.callbackQuery?.from?.username || ctx.from?.username;
    const fullName =
      `${this.escapeHtml(firstName)} ${this.escapeHtml(lastName)}`.trim() ||
      "Noma'lum";

    const contactLine = `👤 <b>Ism-familiya:</b> <a href="tg://user?id=${userId}">${fullName}</a>`;
    const statusLine = order
      ? `\n${this.rideOrderService.statusEmoji(order.status)}`
      : '';
    const orderIdLine = order ? `\n📋 <b>Buyurtma:</b> #${order.id}` : '';

    const msg =
      `🚕 <b>Yangi buyurtma!</b>\n\n` +
      contactLine +
      `\n` +
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
        this.logEvent('ride_order_send_error', {
          groupTitle: g.title,
          error: this.getErrDesc(err),
        });
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

    await this.tgSafe(() =>
      ctx.reply('📋 <b>Sizning buyurtmalaringiz:</b>', { parse_mode: 'HTML' }),
    );

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

      const buttons: Array<Array<ReturnType<typeof Markup.button.callback>>> =
        [];
      if (o.status === ClientRequestState.MATCHED) {
        buttons.push([
          Markup.button.callback('✅ Safar tugadi', `ride_complete:${o.id}`),
        ]);
        buttons.push([
          Markup.button.callback(
            '❌ Bekor qilish',
            `ride_cancel_order:${o.id}`,
          ),
        ]);
      }
      if (o.status === ClientRequestState.NEW) {
        buttons.push([
          Markup.button.callback(
            '❌ Bekor qilish',
            `ride_cancel_order:${o.id}`,
          ),
        ]);
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

  // ================= DRIVER MENU =================
  private async sendDriverMenu(ctx: SafeContext) {
    this.driverRegState.delete(ctx.from.id);
    this.driverPostState.delete(ctx.from.id);

    const driver = await this.driverService.getByTgId(ctx.from.id);

    if (!driver) {
      await this.tgSafe(() =>
        ctx.reply(
          "🚗 Haydovchi bo'limiga xush kelibsiz!\nAvval ro'yxatdan o'tishingiz kerak.",
          this.inlineTextKeyboard([["📝 Ro'yxatdan o'tish"], ['🔙 Orqaga']]),
        ),
      );
      return;
    }

    const statusEmoji = this.driverService.statusEmoji(driver.status);
    const statusLabel = this.driverService.statusLabel(driver.status);

    await this.tgSafe(() =>
      ctx.reply(
        `🚗 <b>Haydovchi paneli</b>\n\n` +
          `👤 ${this.escapeHtml(driver.fullName)}\n` +
          `📞 ${this.escapeHtml(driver.phone)}\n` +
          `🚙 ${this.escapeHtml(driver.carNumber)}\n` +
          `${statusEmoji} Holat: <b>${statusLabel}</b>`,
        {
          parse_mode: 'HTML',
          ...this.inlineTextKeyboard([
            ["📢 E'lon berish", "📋 Mening e'lonlarim"],
            ["🅿️ Bo'sh", "🚗 Yo'lda", '🔴 Ishlamayapti'],
            ["✏️ Ma'lumotlarni o'zgartirish"],
            ['🔙 Orqaga'],
          ]),
        },
      ),
    );
  }

  // ================= DRIVER REGISTRATION STEPS =================
  private async handleDriverRegStep(
    ctx: SafeContext,
    text: string,
    state: DriverRegFlowState,
  ): Promise<boolean> {
    if (state.step === 'fullName') {
      state.fullName = text;
      state.step = 'phone';
      await this.tgSafe(() =>
        ctx.reply(
          '📞 Telefon raqamingizni kiriting:',
          this.inlineTextKeyboard([['✍️ Raqamni yozing'], ['❌ Bekor qilish']]),
        ),
      );
      return true;
    }

    if (state.step === 'phone') {
      const phone = this.extractPhone(text);
      const raw = text.replace(/[\s\-()]/g, '');
      const validPhone = phone || (/^\+?\d{9,13}$/.test(raw) ? raw : null);
      if (!validPhone) {
        await this.tgSafe(() =>
          ctx.reply("❌ Raqam noto'g'ri. Masalan: +998901234567"),
        );
        return true;
      }
      state.phone = validPhone;
      state.step = 'carNumber';
      await this.tgSafe(() =>
        ctx.reply(
          '🚙 Mashina raqamini kiriting (masalan: 01A123BC):',
          this.inlineTextKeyboard([['❌ Bekor qilish']]),
        ),
      );
      return true;
    }

    if (state.step === 'carNumber') {
      state.carNumber = text.toUpperCase();
      state.step = 'carPhoto';
      await this.tgSafe(() =>
        ctx.reply(
          '📸 Mashina rasmini yuboring (ixtiyoriy):',
          this.inlineTextKeyboard([
            ["⏩ O'tkazib yuborish", '❌ Bekor qilish'],
          ]),
        ),
      );
      return true;
    }

    if (state.step === 'carPhoto') {
      if (text === "⏩ O'tkazib yuborish") {
        await this.finishDriverRegistration(ctx, state);
        return true;
      }
      await this.tgSafe(() =>
        ctx.reply(
          '📸 Rasm yuboring yoki "⏩ O\'tkazib yuborish" tugmasini bosing.',
        ),
      );
      return true;
    }

    return false;
  }

  private async finishDriverRegistration(
    ctx: SafeContext,
    state: DriverRegFlowState,
  ) {
    try {
      if (!state.fullName || !state.phone || !state.carNumber) {
        await this.tgSafe(() =>
          ctx.reply("❌ Ma'lumotlar to'liq emas. Qaytadan urinib ko'ring."),
        );
        return;
      }

      await this.driverService.register({
        tgId: ctx.from.id,
        fullName: state.fullName,
        phone: state.phone,
        carNumber: state.carNumber,
        carPhotoId: state.carPhotoId,
      });
      this.driverRegState.delete(ctx.from.id);
      await this.tgSafe(() =>
        ctx.reply("✅ Ro'yxatdan muvaffaqiyatli o'tdingiz!"),
      );
      await this.sendDriverMenu(ctx);
    } catch (err) {
      this.logEvent('driver_registration_error', {
        error: this.getErrDesc(err),
      });
      await this.tgSafe(() => ctx.reply('❌ Xatolik yuz berdi.'));
    }
  }

  // ================= DRIVER POST CONFIRM =================
  private async showDriverPostConfirm(
    ctx: SafeContext,
    state: DriverPostFlowState,
  ) {
    const priceText = state.price
      ? `💰 <b>Narx:</b> ${this.escapeHtml(state.price)}\n`
      : '';
    const noteText = state.note
      ? `📝 <b>Izoh:</b> ${this.escapeHtml(state.note)}\n`
      : '';

    const msg =
      `🚗 <b>E'lon ma'lumotlari:</b>\n\n` +
      `📍 <b>Qayerdan:</b> ${this.escapeHtml(state.fromName)}\n` +
      `📍 <b>Qayerga:</b> ${this.escapeHtml(state.toName)}\n` +
      `💺 <b>Bo'sh joy:</b> ${state.seats}\n` +
      priceText +
      noteText;

    await this.tgSafe(() =>
      ctx.reply(msg, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback("✅ E'lon berish", 'dpost_confirm')],
          [Markup.button.callback('❌ Bekor qilish', 'dpost_cancel')],
        ]),
      }),
    );
  }

  // ================= SEND DRIVER POST TO PUBLIC CHANNELS =================
  private async sendDriverPostToChannels(
    ctx: any,
    driver: any,
    post: any,
  ): Promise<number> {
    const fullName = this.escapeHtml(driver.fullName);
    const username = ctx.callbackQuery?.from?.username || ctx.from?.username;
    const userId = ctx.callbackQuery?.from?.id || ctx.from?.id;
    const usernameText = username ? ` (@${this.escapeHtml(username)})` : '';
    const priceText = post.price
      ? `\n💰 <b>Narx:</b> ${this.escapeHtml(post.price)}`
      : '';
    const noteText = post.note ? `\n📝 ${this.escapeHtml(post.note)}` : '';

    const msg =
      `🚗 <b>Haydovchi e'loni</b>\n\n` +
      `📍 ${this.escapeHtml(post.fromName)} → ${this.escapeHtml(post.toName)}\n` +
      `💺 <b>Bo'sh joy:</b> ${post.seats}` +
      priceText +
      noteText +
      `\n\n` +
      `👤 <a href="tg://user?id=${userId}">${fullName}</a>${usernameText}\n` +
      `📞 ${this.escapeHtml(driver.phone)}\n` +
      `🚙 ${this.escapeHtml(driver.carNumber)}`;

    const channels = await this.publicChannelService.getActiveChannels();
    let success = 0;

    for (const ch of channels) {
      try {
        const sent = await this.safeSendMessage(ctx, ch.chatId, msg, {
          parse_mode: 'HTML',
        });
        if (sent && post.id) {
          try {
            await this.driverPostService.closePost(post.id);
            // Reopen with channel message id
            // For simplicity we just store it
          } catch {}
        }
        success++;
      } catch (err: any) {
        this.logEvent('driver_post_send_error', {
          channelTitle: ch.title,
          error: this.getErrDesc(err),
        });
      }
      await this.tgDelay();
    }
    return success;
  }

  // ================= SHOW DRIVER POSTS =================
  private async showDriverPosts(ctx: SafeContext) {
    const driver = await this.driverService.getByTgId(ctx.from.id);
    if (!driver) {
      await this.tgSafe(() => ctx.reply("Siz hali ro'yxatdan o'tmagansiz."));
      return;
    }

    const posts = await this.driverPostService.getByDriver(driver.id);
    if (!posts.length) {
      await this.tgSafe(() => ctx.reply("📋 Sizda hali e'lonlar yo'q."));
      return;
    }

    await this.tgSafe(() =>
      ctx.reply("📋 <b>Sizning e'lonlaringiz:</b>", { parse_mode: 'HTML' }),
    );

    for (const p of posts) {
      const date = p.createdAt.toLocaleDateString('uz-UZ');
      const priceText = p.price ? `\n💰 Narx: ${this.escapeHtml(p.price)}` : '';

      const msg =
        `📍 <b>${this.escapeHtml(p.fromName)}</b> → <b>${this.escapeHtml(p.toName)}</b>\n` +
        `💺 Bo'sh joy: ${p.seats}` +
        priceText +
        `\n📅 ${date}`;

      await this.tgSafe(() =>
        ctx.reply(msg, {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback(
                "❌ E'lonni yopish",
                `dpost_close:${p.id}`,
              ),
            ],
          ]),
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
    const buttons = topLevel.map((l) => [
      Markup.button.callback(`📍 ${l.name}`, `loc_view:${l.id}`),
    ]);
    await this.tgSafe(() =>
      ctx.reply(
        '📍 Joylashuvlar (viloyat tanlang):',
        Markup.inlineKeyboard(buttons),
      ),
    );
  }

  private async showLocationChildren(ctx: any, parentId: number) {
    const parent = await this.locationService.getById(parentId);
    const children = await this.locationService.getChildren(parentId);
    const parentName = parent?.name || `#${parentId}`;

    let msg = `📍 <b>${this.escapeHtml(parentName)}</b> ichidagi joylar:\n\n`;
    if (children.length) {
      msg += children.map((c) => `• ${this.escapeHtml(c.name)}`).join('\n');
    } else {
      msg += '<i>Hozircha joylar yoʻq</i>';
    }

    const buttons: any[][] = children.map((c) => [
      Markup.button.callback(`❌ ${c.name}`, `rm_loc:${c.id}`),
    ]);
    buttons.push([
      Markup.button.callback(`➕ Joy qoʻshish`, `add_loc:${parentId}`),
    ]);

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

    const restorableLogs = logs.filter((l) => l.action === 'remove');
    if (restorableLogs.length) {
      const buttons = restorableLogs.map((l) => [
        Markup.button.callback(
          `♻️ ${l.targetType}: ${(l.details || '').slice(0, 30)}`,
          `restore_log:${l.id}`,
        ),
      ]);
      await this.tgSafe(() => ctx.reply(msg, { parse_mode: 'HTML' }));
      await this.tgSafe(() =>
        ctx.reply(
          'Qayta tiklash uchun bosing:',
          Markup.inlineKeyboard(buttons),
        ),
      );
    } else {
      await this.tgSafe(() => ctx.reply(msg, { parse_mode: 'HTML' }));
    }
  }

  // ================= CALLBACK =================
  async onCallback(ctx: any) {
    return handleCallback(this, ctx);
  }

  // ================= RESTORE FROM LOG =================
  private async restoreFromLog(log: any) {
    const prev = log.previousValue ? JSON.parse(log.previousValue) : null;
    switch (log.targetType) {
      case 'redirect':
        if (prev) {
          try {
            await this.redirectService.addGroup({
              chatId: prev.chatId,
              title: prev.title,
              addedById: Number(prev.addedById),
            });
          } catch {
            /* already exists */
          }
        }
        break;
      case 'target':
        if (prev) {
          try {
            await this.targetService.addGroup({
              chatId: prev.chatId,
              title: prev.title,
            });
          } catch {
            /* already exists */
          }
        }
        break;
      case 'keyword':
        if (prev) {
          try {
            await this.keywordService.addKeyword(prev.phrase, prev.type);
          } catch {
            /* already exists */
          }
        }
        break;
      case 'location':
        try {
          await this.locationService.restoreLocation(
            parseInt(log.targetId, 10),
          );
        } catch {
          /* not found */
        }
        break;
    }
  }
}
