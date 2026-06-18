import { Injectable, Logger } from '@nestjs/common';
import { Context, Markup } from 'telegraf';
import { RideOrderService } from '../../ride-order/ride-order.service';
import { ParsingEngine } from '../../core/parsing/parsing.engine';
import { ScoringEngine } from '../../core/scoring/scoring.engine';
import { ParsedRequest } from '../../core/parsing/parsing.types';

type SafeContext = Context & {
  chat: { id: number; type: string };
  from: { id: number; first_name?: string; username?: string };
  message: any;
  match?: string[];
};

@Injectable()
export class ClientBotService {
  private readonly logger = new Logger(ClientBotService.name);

  // Store in-process request wizard state; finalized orders persist in PostgreSQL.
  private requestState = new Map<number, {
    step: 'from' | 'to' | 'seats' | 'phone' | 'confirm';
    fromLocation?: string;
    toLocation?: string;
    seats?: number;
    phone?: string;
    parsedData?: ParsedRequest;
  }>();

  constructor(
    private readonly rideOrderService: RideOrderService,
    private readonly parsingEngine: ParsingEngine,
    private readonly scoringEngine: ScoringEngine,
  ) {}

  /**
   * Start client request flow
   */
  async startRequestFlow(ctx: SafeContext) {
    this.requestState.set(ctx.from.id, { step: 'from' });
    
    await ctx.reply(
      '🚕 <b>Taksi buyurtmasi</b>\n\n' +
      '📍 Qayerdan ketasiz?',
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              Markup.button.callback('🏠 Uy', `txt:${encodeURIComponent('🏠 Uy')}`),
              Markup.button.callback('🏢 Ish', `txt:${encodeURIComponent('🏢 Ish')}`),
            ],
            [
              Markup.button.callback('🏥 Kasalxona', `txt:${encodeURIComponent('🏥 Kasalxona')}`),
              Markup.button.callback('🛒 Bozor', `txt:${encodeURIComponent('🛒 Bozor')}`),
            ],
            [Markup.button.callback('📝 Boshqa joy', `txt:${encodeURIComponent('📝 Boshqa joy')}`)],
            [Markup.button.callback('⬅️ Bekor qilish', `txt:${encodeURIComponent('⬅️ Bekor qilish')}`)],
          ],
        },
      },
    );
  }

  /**
   * Handle text input during request flow
   */
  async handleRequestInput(ctx: SafeContext, text: string) {
    const state = this.requestState.get(ctx.from.id);
    if (!state) return false;

    switch (state.step) {
      case 'from':
        state.fromLocation = text;
        state.step = 'to';
        await ctx.reply('📍 Qayerga borasiz?', {
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback('🏠 Uy', `txt:${encodeURIComponent('🏠 Uy')}`),
                Markup.button.callback('🏢 Ish', `txt:${encodeURIComponent('🏢 Ish')}`),
              ],
              [
                Markup.button.callback('🏥 Kasalxona', `txt:${encodeURIComponent('🏥 Kasalxona')}`),
                Markup.button.callback('🛒 Bozor', `txt:${encodeURIComponent('🛒 Bozor')}`),
              ],
              [Markup.button.callback('📝 Boshqa joy', `txt:${encodeURIComponent('📝 Boshqa joy')}`)],
              [Markup.button.callback('⬅️ Bekor qilish', `txt:${encodeURIComponent('⬅️ Bekor qilish')}`)],
            ],
          },
        });
        break;

      case 'to':
        state.toLocation = text;
        state.step = 'seats';
        await ctx.reply('💺 Necha o\'rin kerak?', {
          reply_markup: {
            inline_keyboard: [
              [
                Markup.button.callback('1', 'client_seats_1'),
                Markup.button.callback('2', 'client_seats_2'),
                Markup.button.callback('3', 'client_seats_3'),
                Markup.button.callback('4', 'client_seats_4'),
              ],
              [Markup.button.callback('⬅️ Orqaga', 'client_back_to_to')],
            ],
          },
        });
        break;

      case 'phone':
        state.phone = text;
        state.step = 'confirm';
        await this.showConfirmation(ctx, state);
        break;
    }

    this.requestState.set(ctx.from.id, state);
    return true;
  }

  /**
   * Handle seats selection
   */
  async handleSeatsSelection(ctx: SafeContext, seats: number) {
    const state = this.requestState.get(ctx.from.id);
    if (!state) return;

    state.seats = seats;
    state.step = 'phone';

    await ctx.reply('📞 Telefon raqamingizni yuboring:\n\n' +
      'Masalan: +998901234567 yoki 901234567', {
      reply_markup: {
        inline_keyboard: [
          [Markup.button.callback('✍️ Raqamni yozing', `txt:${encodeURIComponent('✍️ Raqamni yozing')}`)],
          [Markup.button.callback('⬅️ Orqaga', `txt:${encodeURIComponent('⬅️ Orqaga')}`)],
        ],
      },
    });

    this.requestState.set(ctx.from.id, state);
  }

  /**
   * Show confirmation before submitting
   */
  private async showConfirmation(ctx: SafeContext, state: any) {
    const message = `📋 <b>Buyurtma tafsilotlari</b>\n\n` +
      `📍 Qayerdan: ${state.fromLocation}\n` +
      `📍 Qayerga: ${state.toLocation}\n` +
      `💺 O'rinlar: ${state.seats}\n` +
      `📞 Telefon: ${state.phone}\n\n` +
      `Tasdiqlaysizmi?`;

    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            Markup.button.callback('✅ Tasdiqlash', 'client_confirm'),
            Markup.button.callback('❌ Bekor qilish', 'client_cancel'),
          ],
        ],
      },
    });
  }

  /**
   * Submit the ride order
   */
  async submitOrder(ctx: SafeContext) {
    const state = this.requestState.get(ctx.from.id);
    if (!state || !state.fromLocation || !state.toLocation || !state.seats || !state.phone) {
      await ctx.reply('⚠️ Barcha maydonlarni to\'ldiring.');
      return;
    }

    try {
      const order = await this.rideOrderService.create({
        userTgId: ctx.from.id,
        fromName: state.fromLocation,
        toName: state.toLocation,
        passengers: state.seats,
        phone: state.phone,
      });

      this.requestState.delete(ctx.from.id);

      await ctx.reply(
        `✅ Buyurtma qabul qilindi!\n\n` +
        `🆔 #${order.id}\n` +
        `📍 ${state.fromLocation} → ${state.toLocation}\n` +
        `💺 ${state.seats} o'rin\n\n` +
        `Haydovchi topilganda sizga xabar beramiz.`,
        {
          reply_markup: {
            inline_keyboard: [
              [Markup.button.callback('🚕 Yangi buyurtma', `txt:${encodeURIComponent('🚕 Yangi buyurtma')}`)],
              [Markup.button.callback('📊 Mening buyurtmalarim', `txt:${encodeURIComponent('📊 Mening buyurtmalarim')}`)],
            ],
          },
        },
      );
    } catch (error) {
      this.logger.error('Failed to create order:', error);
      await ctx.reply('⚠️ Xatolik yuz berdi. Qaytadan urinib ko\'ring.');
    }
  }

  /**
   * Cancel request flow
   */
  async cancelRequest(ctx: SafeContext) {
    this.requestState.delete(ctx.from.id);
    
    await ctx.reply('❌ Buyurtma bekor qilindi.', {
      reply_markup: {
        inline_keyboard: [
          [Markup.button.callback('🚕 Yangi buyurtma', `txt:${encodeURIComponent('🚕 Yangi buyurtma')}`)],
          [Markup.button.callback('📊 Mening buyurtmalarim', `txt:${encodeURIComponent('📊 Mening buyurtmalarim')}`)],
        ],
      },
    });
  }

  /**
   * Parse message from group chat and create prefilled request
   */
  async parseGroupMessage(text: string): Promise<ParsedRequest | null> {
    const parsed = this.parsingEngine.parse(text);
    const score = this.scoringEngine.score(parsed);

    if (score.isValid && parsed.intent === 'client') {
      return parsed;
    }

    return null;
  }

  /**
   * Get user's active requests
   */
  async getActiveRequests(userId: number) {
    return this.rideOrderService.getActiveByUser(userId);
  }
}
