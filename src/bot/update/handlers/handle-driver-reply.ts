/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { SafeContext } from '../bot-update.types';

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
  const driverUsername = ctx.from.username;

  if (isOlindi) {
    const result = await self.rideOrderService.acceptByDriver(
      orderId,
      ctx.from.id,
    );
    if (!result.ok) {
      const message =
        result.reason === 'NOT_REGISTERED'
          ? "⛔ Avval botda haydovchi sifatida ro'yxatdan o'ting."
          : result.reason === 'NOT_APPROVED'
            ? '⛔ Profilingiz admin tomonidan tasdiqlanmagan.'
            : '⚠️ Bu buyurtma allaqachon boshqa haydovchi tomonidan qabul qilingan.';
      await self.tgSafe(() =>
        ctx.reply(message, {
          reply_parameters: { message_id: ctx.message.message_id },
        }),
      );
      return;
    }

    const { order, driver } = result;
    await self.tgSafe(() =>
      ctx.reply(
        `✅ Buyurtma #${orderId} qabul qilindi!\n👤 Haydovchi: ${self.escapeHtml(driver.fullName)}`,
        {
          parse_mode: 'HTML',
          reply_parameters: { message_id: reply.message_id },
        },
      ),
    );

    let driverInfo =
      `✅ <b>Buyurtma #${orderId} qabul qilindi!</b>\n\n` +
      `🚗 <b>Haydovchi ma'lumotlari:</b>\n` +
      `👤 <b>Ism:</b> <a href="tg://user?id=${ctx.from.id}">${self.escapeHtml(driver.fullName)}</a>\n`;

    if (driverUsername) {
      driverInfo += `📱 <b>Telegram:</b> @${self.escapeHtml(driverUsername)}\n`;
    }
    driverInfo += `📞 <b>Telefon:</b> ${self.escapeHtml(driver.phone)}\n`;

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
    const result = await self.rideOrderService.releaseByDriver(
      orderId,
      ctx.from.id,
    );
    if (!result.ok) {
      await self.tgSafe(() =>
        ctx.reply(
          "⛔ Faqat buyurtmani olgan tasdiqlangan haydovchi uni bo'shata oladi.",
          {
            reply_parameters: { message_id: ctx.message.message_id },
          },
        ),
      );
      return;
    }

    const { order, driver } = result;
    await self.tgSafe(() =>
      ctx.reply(
        `↩️ Buyurtma #${orderId} qayta ochildi.\n👤 ${self.escapeHtml(driver.fullName)}`,
        {
          parse_mode: 'HTML',
          reply_parameters: { message_id: reply.message_id },
        },
      ),
    );

    try {
      await ctx.telegram.sendMessage(
        Number(order.userTgId),
        `↩️ <b>Buyurtma #${orderId} uchun yana haydovchi qidirilmoqda.</b>\n\n` +
          `📍 ${self.escapeHtml(order.fromName)} → ${self.escapeHtml(order.toName)}\n` +
          `Oldingi haydovchi buyurtmani bo'shatdi.`,
        { parse_mode: 'HTML' },
      );
    } catch (err) {
      self.logEvent('notify_user_error', {
        scope: 'driver_release',
        orderId,
        error: self.getErrDesc(err),
      });
    }
  }
}
