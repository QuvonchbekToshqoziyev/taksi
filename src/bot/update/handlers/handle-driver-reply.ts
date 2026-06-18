/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { SafeContext } from '../bot-update.types';
import { ClientRequestState } from '../../../core/state/state.types';

export async function handleDriverReply(
  self: any,
  ctx: SafeContext,
  text: string,
) {
  const reply = ctx.message?.reply_to_message;
  if (!reply) return;

  const normalized = text.trim().toLowerCase();
  const isOlindi = [
    'olindi',
    'олинди',
    'taken',
    'accepted',
    'qabul qilindi',
  ].includes(normalized);
  const isOtmen = [
    'otmen',
    'отмен',
    'not taken',
    'cancel',
    'cancelled',
    'bekor',
  ].includes(normalized);
  if (!isOlindi && !isOtmen) return;

  const botInfo = await ctx.telegram.getMe();
  if (reply.from?.id !== botInfo.id) return;

  const replyText = reply.text || reply.caption || '';
  const match = replyText.match(/#(\d+)/);
  if (!match) return;

  const orderId = parseInt(match[1], 10);
  const order = await self.rideOrderService.getById(orderId);
  if (!order) return;

  const driverFirstName = ctx.from.first_name || '';
  const driverLastName = ctx.from.last_name || '';
  const driverName =
    `${driverFirstName} ${driverLastName}`.trim() || 'Haydovchi';
  const driverUsername = ctx.from.username;

  let driverPhone = '';
  try {
    const chat = await ctx.telegram.getChat(ctx.from.id);
    if ('bio' in chat && (chat as any).phone_number) {
      driverPhone = (chat as any).phone_number;
    }
  } catch {
    // ignore
  }

  if (isOlindi) {
    if (order.status !== ClientRequestState.NEW) {
      await self.tgSafe(() =>
        ctx.reply(
          '⚠️ Bu buyurtma allaqachon qabul qilingan yoki tugallangan.',
          {
            reply_parameters: { message_id: ctx.message.message_id },
          },
        ),
      );
      return;
    }

    await self.rideOrderService.updateStatus(
      orderId,
      ClientRequestState.MATCHED,
    );
    await self.tgSafe(() =>
      ctx.reply(
        `✅ Buyurtma #${orderId} qabul qilindi!\n👤 Haydovchi: ${self.escapeHtml(driverName)}`,
        {
          parse_mode: 'HTML',
          reply_parameters: { message_id: reply.message_id },
        },
      ),
    );

    let driverInfo =
      `✅ <b>Buyurtma #${orderId} qabul qilindi!</b>\n\n` +
      `🚗 <b>Haydovchi ma'lumotlari:</b>\n` +
      `👤 <b>Ism:</b> <a href="tg://user?id=${ctx.from.id}">${self.escapeHtml(driverName)}</a>\n`;

    if (driverUsername) {
      driverInfo += `📱 <b>Telegram:</b> @${self.escapeHtml(driverUsername)}\n`;
    }
    if (driverPhone) {
      driverInfo += `📞 <b>Telefon:</b> ${self.escapeHtml(driverPhone)}\n`;
    }

    driverInfo +=
      `\n📍 ${self.escapeHtml(order.fromName)} → ${self.escapeHtml(order.toName)}\n` +
      `👥 Yo'lovchilar: ${order.passengers}\n\n` +
      `Safar tugagach "📋 Zakazlarim" bo'limidan tugatishingiz mumkin.`;

    try {
      await ctx.telegram.sendMessage(Number(order.userTgId), driverInfo, {
        parse_mode: 'HTML',
      });
    } catch (err) {
      self.logEvent('notify_user_error', {
        scope: 'driver_accept',
        orderId,
        error: self.getErrDesc(err),
      });
    }
  }

  if (isOtmen) {
    if (!self.rideOrderService.isOpenStatus(order.status)) {
      await self.tgSafe(() =>
        ctx.reply("⚠️ Bu buyurtmani bekor qilib bo'lmaydi.", {
          reply_parameters: { message_id: ctx.message.message_id },
        }),
      );
      return;
    }

    await self.rideOrderService.updateStatus(
      orderId,
      ClientRequestState.CANCELLED,
    );
    await self.tgSafe(() =>
      ctx.reply(
        `❌ Buyurtma #${orderId} bekor qilindi.\n👤 ${self.escapeHtml(driverName)}`,
        {
          parse_mode: 'HTML',
          reply_parameters: { message_id: reply.message_id },
        },
      ),
    );

    try {
      await ctx.telegram.sendMessage(
        Number(order.userTgId),
        `❌ <b>Buyurtma #${orderId} bekor qilindi.</b>\n\n` +
          `📍 ${self.escapeHtml(order.fromName)} → ${self.escapeHtml(order.toName)}\n` +
          `Yangi buyurtma berish uchun "🚕 Taksi chaqirish" tugmasini bosing.`,
        { parse_mode: 'HTML' },
      );
    } catch (err) {
      self.logEvent('notify_user_error', {
        scope: 'driver_cancel',
        orderId,
        error: self.getErrDesc(err),
      });
    }
  }
}
