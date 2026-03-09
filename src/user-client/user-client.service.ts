import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { NewMessage, NewMessageEvent } from 'telegram/events';
import { Api } from 'telegram';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf, Context } from 'telegraf';
import { KeywordService } from '../keyword/keyword.service';
import { RedirectService } from '../redirect/redirect.service';
import { TargetService } from '../target/target.service';
import * as input from 'input';

@Injectable()
export class UserClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UserClientService.name);
  private client!: TelegramClient;
  private connected = false;

  // ---- Same keyword lists as BotUpdate (kept in sync) ----
  private readonly FORCE_CLIENT_PHRASES: string[] = [
    'gulistonga taxi bormi',
    'gulistonga taksi bormi',
    'toshkentdan kamsamolga taksi bormi',
    'gulistondan kamsamolga taxi bormi',
  ];

  private readonly DRIVER_WORDS: string[] = [
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

  private readonly CLIENT_WORDS_SINGLE: string[] = [
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

  private readonly CLIENT_WORDS_COMBO: string[][] = [
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

  constructor(
    @InjectBot() private readonly bot: Telegraf<Context>,
    private readonly keywordService: KeywordService,
    private readonly redirectService: RedirectService,
    private readonly targetService: TargetService,
  ) {}

  async onModuleInit() {
    const apiId = parseInt(process.env.TG_API_ID || '', 10);
    const apiHash = process.env.TG_API_HASH || '';

    if (!apiId || !apiHash) {
      this.logger.warn(
        'TG_API_ID / TG_API_HASH not set — user-client disabled. ' +
        'Get them from https://my.telegram.org',
      );
      return;
    }

    const sessionStr = process.env.TG_SESSION || '';
    const session = new StringSession(sessionStr);

    this.client = new TelegramClient(session, apiId, apiHash, {
      connectionRetries: 5,
    });

    try {
      await this.client.start({
        phoneNumber: async () => await input.text('📱 Telefon raqam (+998...): '),
        password: async () => await input.text('🔑 2FA parol (bo\'lsa): '),
        phoneCode: async () => await input.text('📩 Telegram kod: '),
        onError: (err) => this.logger.error('Login error:', err),
      });

      this.connected = true;
      const savedSession = this.client.session.save() as unknown as string;
      this.logger.log('✅ User-client connected! Session string (save to TG_SESSION):');
      this.logger.log(savedSession);

      this.startListening();
    } catch (err) {
      this.logger.error('Failed to start user-client:', err);
    }
  }

  async onModuleDestroy() {
    if (this.client && this.connected) {
      await this.client.disconnect();
      this.logger.log('User-client disconnected');
    }
  }

  getClient(): TelegramClient | null {
    return this.connected ? this.client : null;
  }

  isConnected(): boolean {
    return this.connected;
  }

  // ================= MESSAGE LISTENER =================
  private startListening() {
    this.client.addEventHandler(
      async (event: NewMessageEvent) => {
        try {
          await this.handleNewMessage(event);
        } catch (err) {
          this.logger.error('Error handling user-client message:', err);
        }
      },
      new NewMessage({ incoming: true }),
    );
    this.logger.log('🔍 User-client listening for messages...');
  }

  private async handleNewMessage(event: NewMessageEvent) {
    const message = event.message;
    if (!message || !message.text) return;

    // Only process group/channel messages
    const chatId = message.chatId;
    if (!chatId) return;

    const peer = message.peerId;
    if (!peer) return;

    // Check if this is a group/channel (not private)
    const isGroup =
      peer.className === 'PeerChat' ||
      peer.className === 'PeerChannel';
    if (!isGroup) return;

    // Skip messages from the user-client's own account
    const me = await this.client.getMe();
    if (message.senderId?.equals(me.id)) return;

    // Get the full chat ID in Bot API format
    const fullChatId = this.getFullChatId(peer);

    // Check if the bot already monitors this group as a target
    // If so, skip — the bot handles it directly
    const isBotTarget = await this.targetService.isTargetGroup(String(fullChatId));
    if (isBotTarget) return;

    // Check if this is a taxi order
    if (!this.isTaxiOrder(message.text)) return;

    // Get chat info for the source label
    let chatTitle = `Chat ${fullChatId}`;
    try {
      const entity = await this.client.getEntity(chatId);
      if ('title' in entity) {
        chatTitle = (entity as any).title;
      }
    } catch {
      // Can't resolve title — use ID
    }

    // Get sender info
    let senderName = 'Noma\'lum';
    let senderUsername: string | null = null;
    let senderId: bigint | undefined;
    try {
      if (message.senderId) {
        senderId = BigInt(message.senderId.toString());
        const sender = await this.client.getEntity(message.senderId);
        if (sender instanceof Api.User) {
          const first = sender.firstName || '';
          const last = sender.lastName || '';
          senderName = `${first} ${last}`.trim() || 'Noma\'lum';
          senderUsername = sender.username || null;
        }
      }
    } catch {
      // Can't resolve sender
    }

    // Extract phone from message
    const phone = this.extractPhone(message.text);

    // Build scout message
    const scoutMsg = this.buildScoutMessage(
      message.text,
      chatTitle,
      senderName,
      senderUsername,
      senderId ? Number(senderId) : undefined,
      phone,
    );

    // Send to all redirect groups via bot
    await this.forwardToRedirects(scoutMsg);
  }

  // ================= CHAT ID HELPER =================
  private getFullChatId(peer: Api.TypePeer): string {
    if (peer.className === 'PeerChannel') {
      return `-100${(peer as Api.PeerChannel).channelId}`;
    }
    if (peer.className === 'PeerChat') {
      return `-${(peer as Api.PeerChat).chatId}`;
    }
    return String((peer as any).userId || 0);
  }

  // ================= KEYWORD MATCHING (same as bot) =================
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

  // ================= BUILD SCOUT MESSAGE =================
  private escapeHtml(v: any): string {
    return String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private buildScoutMessage(
    originalText: string,
    chatTitle: string,
    senderName: string,
    senderUsername: string | null,
    senderId: number | undefined,
    phone: string | null,
  ): string {
    const text = this.escapeHtml(originalText);
    const source = this.escapeHtml(chatTitle);
    const name = this.escapeHtml(senderName);

    const contactLine = senderId
      ? (senderUsername
          ? `👤 <b>Ism:</b> <a href="tg://user?id=${senderId}">${name}</a> (@${this.escapeHtml(senderUsername)})`
          : `👤 <b>Ism:</b> <a href="tg://user?id=${senderId}">${name}</a>`)
      : `👤 <b>Ism:</b> ${name}`;

    const phoneLine = phone ? `\n📞 ${this.escapeHtml(phone)}` : '';

    return (
      `🔍 <b>Scout: Yangi zakaz topildi!</b>\n` +
      `📍 ${source}\n\n` +
      `${text}\n\n` +
      `${contactLine}${phoneLine}`
    );
  }

  // ================= FORWARD TO REDIRECT GROUPS =================
  private async forwardToRedirects(htmlMessage: string) {
    const groups = await this.redirectService.getActiveGroups();
    if (!groups.length) return;

    let success = 0;
    for (const g of groups) {
      try {
        await this.bot.telegram.sendMessage(g.chatId, htmlMessage, {
          parse_mode: 'HTML',
        });
        success++;
      } catch (err: any) {
        const desc =
          err?.response?.description || err?.description || err?.message || '';
        if (
          desc.includes('CHAT_WRITE_FORBIDDEN') ||
          desc.includes('Forbidden') ||
          desc.includes('bot was kicked')
        ) {
          this.logger.warn(`Scout write forbidden: ${g.title}`);
        } else {
          this.logger.error(`Scout send error (${g.title}): ${desc}`);
        }
      }
      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 150));
    }

    if (success > 0) {
      this.logger.log(`🔍 Scout (user-client): zakaz → ${success} redirect`);
    }
  }
}
