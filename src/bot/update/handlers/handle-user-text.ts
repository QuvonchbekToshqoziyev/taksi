/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { SafeContext } from '../bot-update.types';
import { Markup } from 'telegraf';
import { DriverState } from '../../../core/state/state.types';

export async function handleUserText(
  self: any,
  ctx: SafeContext,
  text: string,
): Promise<boolean> {
  const clientAudience = self.isClientAudience();
  const driverAudience = self.isDriverAudience();

  // 🚕 Taksi chaqirish — start ride wizard
  if (text === '🚕 Taksi chaqirish' && clientAudience) {
    const locations = await self.locationService.getTopLevelLocations();
    if (!locations.length) {
      await self.tgSafe(() => ctx.reply('Hozircha joylashuvlar mavjud emas.'));
      return true;
    }
    self.rideState.set(ctx.from.id, { step: 'from' });
    const buttons = locations.map((l) => [
      Markup.button.callback(l.name, `ride_from:${l.id}`),
    ]);
    await self.tgSafe(() =>
      ctx.reply('📍 Qayerdan?', Markup.inlineKeyboard(buttons)),
    );
    return true;
  }

  // ❌ Bekor qilish — always go home
  if (text === '❌ Bekor qilish') {
    self.rideState.delete(ctx.from.id);
    self.driverRegState.delete(ctx.from.id);
    self.driverPostState.delete(ctx.from.id);
    if (driverAudience && !clientAudience) {
      await self.sendDriverMenu(ctx);
    } else {
      await self.sendUserHome(ctx);
    }
    return true;
  }

  // 📋 Zakazlarim — show user's rides
  if (text === '📋 Zakazlarim' && clientAudience) {
    await self.showUserOrders(ctx);
    return true;
  }

  // User is on phone step — accept typed number or forwarded contact text
  const state = self.rideState.get(ctx.from.id);
  if (state?.step === 'phone' && clientAudience) {
    const phone = self.extractPhone(text);
    if (phone) {
      state.phone = phone;
      state.step = 'confirm';
      await self.showRideConfirm(ctx, state);
      return true;
    }
    // Try raw digits (user might type just numbers)
    const raw = text.replace(/[\s\-()]/g, '');
    if (/^\+?\d{9,13}$/.test(raw)) {
      state.phone = raw;
      state.step = 'confirm';
      await self.showRideConfirm(ctx, state);
      return true;
    }
    await self.tgSafe(() =>
      ctx.reply("❌ Raqam noto'g'ri. Masalan: +998901234567"),
    );
    return true;
  }

  // 🚗 Haydovchi — driver menu
  if (text === '🚗 Haydovchi' && driverAudience) {
    await self.sendDriverMenu(ctx);
    return true;
  }

  // Driver menu buttons
  if (text === "📝 Ro'yxatdan o'tish" && driverAudience) {
    self.driverRegState.set(ctx.from.id, { step: 'fullName' });
    await self.tgSafe(() =>
      ctx.reply(
        '👤 Ism-familiyangizni kiriting:',
        self.inlineTextKeyboard([['❌ Bekor qilish']]),
      ),
    );
    return true;
  }

  if (text === "✏️ Ma'lumotlarni o'zgartirish" && driverAudience) {
    const driver = await self.driverService.getByTgId(ctx.from.id);
    if (!driver) {
      await self.tgSafe(() => ctx.reply("Siz hali ro'yxatdan o'tmagansiz."));
      return true;
    }
    self.driverRegState.set(ctx.from.id, { step: 'fullName' });
    await self.tgSafe(() =>
      ctx.reply(
        '👤 Yangi ism-familiyangizni kiriting:',
        self.inlineTextKeyboard([['❌ Bekor qilish']]),
      ),
    );
    return true;
  }

  if (text === "📢 E'lon berish" && driverAudience) {
    const driver = await self.driverService.getByTgId(ctx.from.id);
    if (!driver) {
      await self.tgSafe(() => ctx.reply("Avval ro'yxatdan o'ting."));
      return true;
    }
    if (driver.status === 'not_working') {
      await self.tgSafe(() =>
        ctx.reply('Statusingiz "Ishlamayapti" — avval statusni o\'zgartiring.'),
      );
      return true;
    }
    const locations = await self.locationService.getTopLevelLocations();
    if (!locations.length) {
      await self.tgSafe(() => ctx.reply('Hozircha joylashuvlar mavjud emas.'));
      return true;
    }
    self.driverPostState.set(ctx.from.id, { step: 'from' });
    const buttons = locations.map((l) => [
      Markup.button.callback(l.name, `dpost_from:${l.id}`),
    ]);
    await self.tgSafe(() =>
      ctx.reply('📍 Qayerdan ketyapsiz?', Markup.inlineKeyboard(buttons)),
    );
    return true;
  }

  if (text === "📋 Mening e'lonlarim" && driverAudience) {
    await self.showDriverPosts(ctx);
    return true;
  }

  if (
    (text === "🅿️ Bo'sh" ||
      text === "🚗 Yo'lda" ||
      text === '🔴 Ishlamayapti') &&
    driverAudience
  ) {
    const driver = await self.driverService.getByTgId(ctx.from.id);
    if (!driver) {
      await self.tgSafe(() => ctx.reply("Avval ro'yxatdan o'ting."));
      return true;
    }
    const statusMap: Record<string, DriverState> = {
      "🅿️ Bo'sh": DriverState.AVAILABLE,
      "🚗 Yo'lda": DriverState.EN_ROUTE,
      '🔴 Ishlamayapti': DriverState.OFFLINE,
    };
    const newStatus = statusMap[text];
    if (newStatus) {
      await self.driverService.updateStatus(ctx.from.id, newStatus);
      await self.tgSafe(() =>
        ctx.reply(
          `✅ Statusingiz o'zgardi: ${self.driverService.statusLabel(newStatus)}`,
        ),
      );
      await self.sendDriverMenu(ctx);
    }
    return true;
  }

  if (text === '🔙 Orqaga') {
    if (driverAudience && !clientAudience) {
      await self.sendDriverMenu(ctx);
    } else {
      await self.sendUserHome(ctx);
    }
    return true;
  }

  // --- Driver registration steps ---
  const driverReg = self.driverRegState.get(ctx.from.id);
  if (driverReg && driverAudience) {
    return await self.handleDriverRegStep(ctx, text, driverReg);
  }

  // --- Driver post: price/note steps ---
  const driverPost = self.driverPostState.get(ctx.from.id);
  if (driverPost?.step === 'price' && driverAudience) {
    driverPost.price = text === "⏩ O'tkazib yuborish" ? undefined : text;
    driverPost.step = 'note';
    await self.tgSafe(() =>
      ctx.reply(
        "📝 Qo'shimcha izoh yozing (ixtiyoriy):",
        self.inlineTextKeyboard([["⏩ O'tkazib yuborish", '❌ Bekor qilish']]),
      ),
    );
    return true;
  }
  if (driverPost?.step === 'note' && driverAudience) {
    driverPost.note = text === "⏩ O'tkazib yuborish" ? undefined : text;
    driverPost.step = 'confirm';
    await self.showDriverPostConfirm(ctx, driverPost);
    return true;
  }

  return false;
}
