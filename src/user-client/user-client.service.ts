import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { NewMessage, NewMessageEvent } from 'telegram/events';
import { Api } from 'telegram';
import { KeywordService } from '../keyword/keyword.service';
import { RedirectService } from '../redirect/redirect.service';
import { TargetService } from '../target/target.service';
import { BotGateway } from '../bot/bot.gateway';
import { RideOrderService } from '../ride-order/ride-order.service';
import { isTaxiOrderText } from '../bot/update/order-filter.util';
import { ClientRequestState } from '../core/state/state.types';

@Injectable()
export class UserClientService implements OnModuleDestroy {
  private readonly logger = new Logger(UserClientService.name);
  private client!: TelegramClient;
  private connected = false;

  private readTelegramApiId(): number {
    const rawValue = process.env.TG_API_ID || process.env.API_ID || '';
    return parseInt(rawValue, 10);
  }

  private readTelegramApiHash(): string {
    return process.env.TG_API_HASH || process.env.API_HASH || '';
  }

  constructor(
    private readonly botGateway: BotGateway,
    private readonly keywordService: KeywordService,
    private readonly redirectService: RedirectService,
    private readonly targetService: TargetService,
    private readonly rideOrderService: RideOrderService,
  ) {}

  async start() {
    if (this.connected) return;
    const apiId = this.readTelegramApiId();
    const apiHash = this.readTelegramApiHash();

    if (!apiId || !apiHash) {
      this.logger.warn(
        'Telegram user API credentials not set — user-client disabled. ' +
          'Set TG_API_ID/TG_API_HASH or API_ID/API_HASH from https://my.telegram.org',
      );
      return;
    }

    const sessionStr = process.env.TG_SESSION || '';
    if (!sessionStr.trim()) {
      this.logger.warn(
        'TG_SESSION is empty — user-client scouting disabled; bot-based target-group scouting remains active.',
      );
      return;
    }
    const session = new StringSession(sessionStr);

    this.client = new TelegramClient(session, apiId, apiHash, {
      connectionRetries: 5,
    });

    try {
      await this.client.connect();
      const authorized = await this.client.checkAuthorization();

      if (!authorized) {
        this.logger.warn(
          'Telegram user not authorized. Reuse existing TG_SESSION, or run `node login.mjs` once to generate one.',
        );
        await this.client.disconnect();
        return;
      }

      this.connected = true;
      this.logger.log(
        '✅ User-client connected with existing Telegram session.',
      );
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
      peer.className === 'PeerChat' || peer.className === 'PeerChannel';
    if (!isGroup) return;

    // Skip messages from the user-client's own account
    const me = await this.client.getMe();
    if (message.senderId?.equals(me.id)) return;

    // Get the full chat ID in Bot API format
    const fullChatId = this.getFullChatId(peer);

    // Only scan admin-added client intake groups.
    const isIntakeGroup = await this.targetService.isTargetGroup(
      String(fullChatId),
    );
    if (!isIntakeGroup) return;

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
    let senderName = "Noma'lum";
    let senderUsername: string | null = null;
    let senderId: bigint | undefined;
    try {
      if (message.senderId) {
        senderId = BigInt(message.senderId.toString());
        const sender = await this.client.getEntity(message.senderId);
        if (sender instanceof Api.User) {
          const first = sender.firstName || '';
          const last = sender.lastName || '';
          senderName = `${first} ${last}`.trim() || "Noma'lum";
          senderUsername = sender.username || null;
        }
      }
    } catch {
      // Can't resolve sender
    }

    // Extract phone from message
    const phone = this.extractPhone(message.text);

    if (!senderId) return;
    const stored = await this.rideOrderService.createFromGroup({
      userTgId: Number(senderId),
      sourceChatId: String(fullChatId),
      sourceMessageId: message.id,
      sourceText: message.text,
      sourceTitle: chatTitle,
      passengers: this.extractPassengers(message.text),
      phone: phone || undefined,
    });
    if (!stored.created) return;

    // Send to all redirect groups via bot
    const forwarded = await this.forwardToRedirects(
      this.buildScoutMessage(
        stored.order.id,
        message.text,
        chatTitle,
        senderName,
        senderUsername,
        Number(senderId),
        phone,
      ),
    );
    if (forwarded === 0) {
      await this.rideOrderService.updateStatus(
        stored.order.id,
        ClientRequestState.CANCELLED,
      );
    }
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

  private isTaxiOrder(text: string): boolean {
    return isTaxiOrderText({
      text,
      clientKeywords: this.keywordService.getClientKeywords(),
      driverKeywords: this.keywordService.getDriverKeywords(),
    });
  }

  private extractPhone(text: string): string | null {
    const m = (text || '').match(
      /(\+?998\d{9}|\b(90|91|93|94|95|97|98|99)\d{7}\b)/,
    );
    return m?.[0] || null;
  }

  private extractPassengers(text: string): number {
    const match = (text || '').match(
      /\b([1-9])\s*(?:kishi|odam|yo['’]?lovchi|киши|одам)\b/iu,
    );
    return match ? Number(match[1]) : 1;
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
    orderId: number,
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
      ? senderUsername
        ? `👤 <b>Ism:</b> <a href="tg://user?id=${senderId}">${name}</a> (@${this.escapeHtml(senderUsername)})`
        : `👤 <b>Ism:</b> <a href="tg://user?id=${senderId}">${name}</a>`
      : `👤 <b>Ism:</b> ${name}`;

    const phoneLine = phone ? `\n📞 ${this.escapeHtml(phone)}` : '';

    return (
      `🔍 <b>Yangi zakaz #${orderId}</b>\n` +
      `📍 ${source}\n\n` +
      `${text}\n\n` +
      `${contactLine}${phoneLine}\n\n` +
      `Qabul qilish uchun shu xabarga <b>olindi</b> deb javob bering.`
    );
  }

  // ================= FORWARD TO REDIRECT GROUPS =================
  private async forwardToRedirects(htmlMessage: string) {
    const groups = await this.redirectService.getActiveGroups();
    if (!groups.length) return 0;

    let success = 0;
    for (const g of groups) {
      try {
        await this.botGateway.getTelegram().sendMessage(g.chatId, htmlMessage, {
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
      await new Promise((r) => setTimeout(r, 150));
    }

    if (success > 0) {
      this.logger.log(`🔍 Scout (user-client): zakaz → ${success} redirect`);
    }
    return success;
  }
}
