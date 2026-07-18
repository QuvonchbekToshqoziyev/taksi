/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Markup } from 'telegraf';
import { ClientRequestState } from '../../../core/state/state.types';

export async function handleCallback(self: any, ctx: any) {
  const data = ctx.callbackQuery?.data;
  if (!data) return;
  const userId = ctx.callbackQuery?.from?.id;

  if (!self.tryAcquireActionLock(`${userId}:${data}`)) {
    await self.tgSafe(() => ctx.answerCbQuery('⌛ Amal allaqachon bajarilgan'));
    return;
  }

  // Rate limit callback queries
  if (userId && self.isRateLimited(userId)) {
    await self.tgSafe(() => ctx.answerCbQuery('⚠️ Sekinroq bosing.'));
    return;
  }

  const isAdminAction =
    data.startsWith('rm_redirect:') ||
    data.startsWith('rm_target:') ||
    data.startsWith('rm_keyword:') ||
    data.startsWith('loc_view:') ||
    data.startsWith('add_loc:') ||
    data.startsWith('rm_loc:') ||
    data.startsWith('restore_log:') ||
    data.startsWith('rm_pub_ch:') ||
    data.startsWith('driver_approve:');
  const isClientAction = data.startsWith('ride_');
  const isDriverAction = data.startsWith('dpost_');

  if (isAdminAction && !self.isAdminAudience()) {
    await self.tgSafe(() =>
      ctx.answerCbQuery('⛔ Bu amal bu botda mavjud emas.'),
    );
    return;
  }
  if (isAdminAction) {
    const isSuperAdmin = await self.adminService.isSuperAdmin(userId);
    const isLocationAction =
      data.startsWith('loc_view:') ||
      data.startsWith('add_loc:') ||
      data.startsWith('rm_loc:');
    const isAdmin = isSuperAdmin || (await self.adminService.isAdmin(ctx));
    if (!isAdmin || (!isLocationAction && !isSuperAdmin)) {
      await self.tgSafe(() =>
        ctx.answerCbQuery(
          isLocationAction ? '⛔ Faqat admin' : '⛔ Faqat superadmin',
        ),
      );
      return;
    }
  }
  if (isClientAction && !self.isClientAudience()) {
    await self.tgSafe(() =>
      ctx.answerCbQuery('⛔ Bu amal bu botda mavjud emas.'),
    );
    return;
  }
  if (isDriverAction && !self.isDriverAudience()) {
    await self.tgSafe(() =>
      ctx.answerCbQuery('⛔ Bu amal bu botda mavjud emas.'),
    );
    return;
  }

  if (data.startsWith('txt:')) {
    const text = decodeURIComponent(data.slice(4));
    await self.tgSafe(() => ctx.answerCbQuery());

    if (ctx.chat?.type !== 'private') return;

    const isSuperAdmin = await self.adminService.isSuperAdmin(ctx.from.id);
    const isAdmin = isSuperAdmin || (await self.adminService.isAdmin(ctx));

    if (self.isAdminAudience() && isAdmin) {
      const adminHandled = await self.handleAdminText(ctx, text, isSuperAdmin);
      if (adminHandled) return;
    }

    if (self.isClientAudience() || self.isDriverAudience()) {
      await self.handleUserText(ctx, text);
    }
    return;
  }

  if (data.startsWith('rm_redirect:')) {
    const chatId = data.replace('rm_redirect:', '');
    const groups = await self.redirectService.getActiveGroups();
    const group = groups.find((g) => g.chatId === chatId);
    await self.redirectService.removeGroup(chatId);
    await self.adminLogService.log({
      adminTgId: userId,
      action: 'remove',
      targetType: 'redirect',
      targetId: chatId,
      details: group?.title || chatId,
      previousValue: JSON.stringify(group),
    });
    await self.tgSafe(() => ctx.answerCbQuery("O'chirildi"));
    await self.tgSafe(() => ctx.editMessageText("❌ Redirect o'chirildi"));
  }

  if (data.startsWith('rm_target:')) {
    const chatId = data.replace('rm_target:', '');
    const groups = await self.targetService.getActiveGroups();
    const group = groups.find((g) => g.chatId === chatId);
    await self.targetService.removeGroup(chatId);
    await self.adminLogService.log({
      adminTgId: userId,
      action: 'remove',
      targetType: 'target',
      targetId: chatId,
      details: group?.title || chatId,
      previousValue: JSON.stringify(group),
    });
    await self.tgSafe(() => ctx.answerCbQuery('Oʻchirildi'));
    await self.tgSafe(() => ctx.editMessageText('❌ Client guruh oʻchirildi'));
  }

  if (data.startsWith('rm_keyword:')) {
    const id = parseInt(data.replace('rm_keyword:', ''), 10);
    if (!isNaN(id)) {
      const kws = await self.keywordService.listKeywords();
      const kw = kws.find((k) => k.id === id);
      await self.keywordService.removeKeywordById(id);
      await self.adminLogService.log({
        adminTgId: userId,
        action: 'remove',
        targetType: 'keyword',
        targetId: String(id),
        details: kw ? `${kw.type}: ${kw.phrase}` : String(id),
        previousValue: JSON.stringify(kw),
      });
      await self.tgSafe(() => ctx.answerCbQuery('Oʻchirildi'));
      await self.tgSafe(() => ctx.editMessageText('❌ Kalit soʻz oʻchirildi'));
    }
  }

  if (data.startsWith('driver_approve:')) {
    const id = parseInt(data.split(':')[1], 10);
    if (!isNaN(id)) {
      const driver = await self.driverService.setApproval(id, true);
      await self.adminLogService.log({
        adminTgId: userId,
        action: 'approve',
        targetType: 'driver',
        targetId: String(id),
        details: `${driver.fullName} (${driver.carNumber})`,
      });
      await self.tgSafe(() => ctx.answerCbQuery('Tasdiqlandi'));
      await self.tgSafe(() =>
        ctx.editMessageText(
          `✅ Tasdiqlandi: ${self.escapeHtml(driver.fullName)}`,
        ),
      );
      try {
        await ctx.telegram.sendMessage(
          Number(driver.tgId),
          '✅ Haydovchi profilingiz tasdiqlandi.',
        );
      } catch (err) {
        self.logEvent('driver_approval_notify_error', {
          driverId: id,
          error: self.getErrDesc(err),
        });
      }
    }
  }

  // --- Location: view children ---
  if (data.startsWith('loc_view:')) {
    const parentId = parseInt(data.replace('loc_view:', ''), 10);
    if (!isNaN(parentId)) {
      await self.tgSafe(() => ctx.answerCbQuery());
      await self.showLocationChildren(ctx, parentId);
    }
  }

  // --- Location: add sub-location ---
  if (data.startsWith('add_loc:')) {
    const parentId = parseInt(data.replace('add_loc:', ''), 10);
    if (!isNaN(parentId)) {
      self.waitingLocationSub.set(userId, parentId);
      const parent = await self.locationService.getById(parentId);
      await self.tgSafe(() => ctx.answerCbQuery());
      await self.tgSafe(() =>
        ctx.reply(
          `📍 ${parent?.name || ''} ichiga yangi joy nomini yozing:`,
          self.inlineTextKeyboard([['❌ Bekor qilish', '🏠 Bosh sahifa']]),
        ),
      );
    }
  }

  // --- Location: remove ---
  if (data.startsWith('rm_loc:')) {
    const id = parseInt(data.replace('rm_loc:', ''), 10);
    if (!isNaN(id)) {
      const loc = await self.locationService.getById(id);
      await self.locationService.removeLocation(id);
      await self.adminLogService.log({
        adminTgId: userId,
        action: 'remove',
        targetType: 'location',
        targetId: String(id),
        details: loc?.name || String(id),
        previousValue: JSON.stringify(loc),
      });
      await self.tgSafe(() => ctx.answerCbQuery('Oʻchirildi'));
      await self.tgSafe(() =>
        ctx.editMessageText(`❌ ${loc?.name || ''} oʻchirildi`),
      );
    }
  }

  // --- Admin log: restore ---
  if (data.startsWith('restore_log:')) {
    if (!(await self.adminService.isSuperAdmin(userId))) {
      await self.tgSafe(() => ctx.answerCbQuery('Faqat superadmin'));
      return;
    }
    const logId = parseInt(data.replace('restore_log:', ''), 10);
    if (!isNaN(logId)) {
      const log = await self.adminLogService.getLogById(logId);
      if (!log || log.restoredAt) {
        await self.tgSafe(() => ctx.answerCbQuery('Allaqachon tiklangan'));
        return;
      }
      await self.restoreFromLog(log);
      await self.adminLogService.markRestored(logId);
      await self.tgSafe(() => ctx.answerCbQuery('Tiklandi'));
      await self.tgSafe(() =>
        ctx.editMessageText(
          `♻️ Tiklandi: ${log.targetType} — ${log.details || log.targetId}`,
        ),
      );
    }
  }

  // --- Ride: pick origin ---
  if (data.startsWith('ride_from:')) {
    const id = parseInt(data.replace('ride_from:', ''), 10);
    if (isNaN(id)) return;
    const loc = await self.locationService.getById(id);
    if (!loc) return;

    const state = self.rideState.get(userId) || { step: 'from' as const };
    state.fromId = id;
    state.fromName = loc.name;
    state.step = 'to';
    self.rideState.set(userId, state);

    const locations = await self.locationService.getTopLevelLocations();
    const remaining = locations.filter((l) => l.id !== id);

    if (!remaining.length) {
      await self.tgSafe(() => ctx.answerCbQuery('Boshqa joy yoʻq'));
      return;
    }

    const buttons = remaining.map((l) => [
      Markup.button.callback(l.name, `ride_to:${l.id}`),
    ]);
    await self.tgSafe(() => ctx.answerCbQuery());
    await self.tgSafe(() =>
      ctx.editMessageText('📍 Qayerga?', Markup.inlineKeyboard(buttons)),
    );
  }

  // --- Ride: pick destination ---
  if (data.startsWith('ride_to:')) {
    const id = parseInt(data.replace('ride_to:', ''), 10);
    if (isNaN(id)) return;
    const loc = await self.locationService.getById(id);
    if (!loc) return;

    const state = self.rideState.get(userId);
    if (!state || state.step !== 'to') return;

    state.toId = id;
    state.toName = loc.name;
    state.step = 'count';
    self.rideState.set(userId, state);

    const buttons = [
      [
        Markup.button.callback('1', 'ride_count:1'),
        Markup.button.callback('2', 'ride_count:2'),
        Markup.button.callback('3', 'ride_count:3'),
        Markup.button.callback('4', 'ride_count:4'),
      ],
    ];
    await self.tgSafe(() => ctx.answerCbQuery());
    await self.tgSafe(() =>
      ctx.editMessageText('👥 Necha kishi?', Markup.inlineKeyboard(buttons)),
    );
  }

  // --- Ride: pick passenger count ---
  if (data.startsWith('ride_count:')) {
    const count = parseInt(data.replace('ride_count:', ''), 10);
    if (isNaN(count)) return;

    const state = self.rideState.get(userId);
    if (!state || state.step !== 'count') return;

    state.count = count;
    state.step = 'phone';
    self.rideState.set(userId, state);

    await self.tgSafe(() => ctx.answerCbQuery());
    await self.tgSafe(() => ctx.editMessageText(`✅ ${count} kishi tanlandi.`));
    await self.tgSafe(() =>
      ctx.reply(
        '📞 Telefon raqamingizni yozing yoki kontakt yuboring:',
        self.inlineTextKeyboard([['✍️ Raqamni yozing'], ['❌ Bekor qilish']]),
      ),
    );
  }

  // --- Ride: confirm ---
  if (data === 'ride_confirm') {
    const state = self.rideState.get(userId);
    if (!state || state.step !== 'confirm') return;

    await self.tgSafe(() => ctx.answerCbQuery());

    // Save ride order to DB
    let order: any = null;
    try {
      order = await self.rideOrderService.create({
        userTgId: userId,
        fromName: state.fromName!,
        toName: state.toName!,
        passengers: state.count!,
        phone: state.phone!,
      });
    } catch (err) {
      self.logEvent('ride_order_db_save_error', {
        userId,
        error: self.getErrDesc(err),
      });
      await self.tgSafe(() =>
        ctx.editMessageText(
          "❌ Buyurtma saqlanmadi. Iltimos, qaytadan urinib ko'ring.",
        ),
      );
      return;
    }

    const success = await self.sendRideOrder(ctx, state, order);
    if (success === 0) {
      await self.rideOrderService.updateStatus(
        order.id,
        ClientRequestState.CANCELLED,
      );
    }
    self.rideState.delete(userId);

    if (success > 0) {
      await self.tgSafe(() =>
        ctx.editMessageText(
          '✅ Buyurtmangiz qabul qilindi! Tez orada haydovchi siz bilan bogʻlanadi.',
        ),
      );
    } else {
      await self.tgSafe(() =>
        ctx.editMessageText(
          '❌ Hozircha buyurtma qabul qilib boʻlmadi. Keyinroq urinib koʻring.',
        ),
      );
    }
    // Restore user home keyboard
    await self.tgSafe(() =>
      ctx.reply(
        '🚕 Yana taksi chaqirish uchun tugmani bosing.',
        self.inlineTextKeyboard([['🚕 Taksi chaqirish', '📋 Zakazlarim']]),
      ),
    );
  }

  // --- Ride: cancel ---
  if (data === 'ride_cancel') {
    self.rideState.delete(userId);
    await self.tgSafe(() => ctx.answerCbQuery('Bekor qilindi'));
    await self.tgSafe(() => ctx.editMessageText('❌ Buyurtma bekor qilindi.'));
    await self.tgSafe(() =>
      ctx.reply(
        '🚕 Yana taksi chaqirish uchun tugmani bosing.',
        self.inlineTextKeyboard([['🚕 Taksi chaqirish', '📋 Zakazlarim']]),
      ),
    );
  }

  // --- Ride: cancel existing order from Zakazlarim ---
  if (data.startsWith('ride_cancel_order:')) {
    const orderId = parseInt(data.replace('ride_cancel_order:', ''), 10);
    if (isNaN(orderId)) return;

    const order = await self.rideOrderService.getById(orderId);
    if (!order || Number(order.userTgId) !== userId) {
      await self.tgSafe(() => ctx.answerCbQuery('Buyurtma topilmadi'));
      return;
    }
    if (!self.rideOrderService.isOpenStatus(order.status)) {
      await self.tgSafe(() =>
        ctx.answerCbQuery('Buyurtma allaqachon tugallangan'),
      );
      return;
    }

    const changed = await self.rideOrderService.updateStatus(
      orderId,
      ClientRequestState.CANCELLED,
    );
    if (!changed) {
      await self.tgSafe(() =>
        ctx.answerCbQuery("Buyurtma holati allaqachon o'zgargan"),
      );
      return;
    }
    await self.tgSafe(() => ctx.answerCbQuery('Bekor qilindi'));
    await self.tgSafe(() =>
      ctx.editMessageText('❌ Buyurtma #' + orderId + ' bekor qilindi.'),
    );
  }

  // --- Ride: complete (user finishes ride) ---
  if (data.startsWith('ride_complete:')) {
    const orderId = parseInt(data.replace('ride_complete:', ''), 10);
    if (isNaN(orderId)) return;

    const order = await self.rideOrderService.getById(orderId);
    if (!order || Number(order.userTgId) !== userId) {
      await self.tgSafe(() => ctx.answerCbQuery('Buyurtma topilmadi'));
      return;
    }
    if (!self.rideOrderService.isActiveRideStatus(order.status)) {
      await self.tgSafe(() =>
        ctx.answerCbQuery('Faqat faol buyurtmani tugatish mumkin'),
      );
      return;
    }

    const changed = await self.rideOrderService.updateStatus(
      orderId,
      ClientRequestState.EXPIRED,
    );
    if (!changed) {
      await self.tgSafe(() =>
        ctx.answerCbQuery("Buyurtma holati allaqachon o'zgargan"),
      );
      return;
    }
    await self.tgSafe(() => ctx.answerCbQuery('Tugallandi'));
    await self.tgSafe(() =>
      ctx.editMessageText('✅ Buyurtma #' + orderId + ' tugallandi. Rahmat!'),
    );
  }

  // --- Driver post: pick origin ---
  if (data.startsWith('dpost_from:')) {
    const id = parseInt(data.replace('dpost_from:', ''), 10);
    if (isNaN(id)) return;
    const loc = await self.locationService.getById(id);
    if (!loc) return;

    const state = self.driverPostState.get(userId) || { step: 'from' as const };
    state.fromId = id;
    state.fromName = loc.name;
    state.step = 'to';
    self.driverPostState.set(userId, state);

    const locations = await self.locationService.getTopLevelLocations();
    const remaining = locations.filter((l) => l.id !== id);

    if (!remaining.length) {
      await self.tgSafe(() => ctx.answerCbQuery("Boshqa joy yo'q"));
      return;
    }

    const buttons = remaining.map((l) => [
      Markup.button.callback(l.name, `dpost_to:${l.id}`),
    ]);
    await self.tgSafe(() => ctx.answerCbQuery());
    await self.tgSafe(() =>
      ctx.editMessageText(
        '📍 Qayerga ketyapsiz?',
        Markup.inlineKeyboard(buttons),
      ),
    );
  }

  // --- Driver post: pick destination ---
  if (data.startsWith('dpost_to:')) {
    const id = parseInt(data.replace('dpost_to:', ''), 10);
    if (isNaN(id)) return;
    const loc = await self.locationService.getById(id);
    if (!loc) return;

    const state = self.driverPostState.get(userId);
    if (!state || state.step !== 'to') return;

    state.toId = id;
    state.toName = loc.name;
    state.step = 'seats';
    self.driverPostState.set(userId, state);

    const buttons = [
      [
        Markup.button.callback('1', 'dpost_seats:1'),
        Markup.button.callback('2', 'dpost_seats:2'),
        Markup.button.callback('3', 'dpost_seats:3'),
        Markup.button.callback('4', 'dpost_seats:4'),
      ],
    ];
    await self.tgSafe(() => ctx.answerCbQuery());
    await self.tgSafe(() =>
      ctx.editMessageText(
        "💺 Nechta bo'sh joy bor?",
        Markup.inlineKeyboard(buttons),
      ),
    );
  }

  // --- Driver post: pick seats ---
  if (data.startsWith('dpost_seats:')) {
    const seats = parseInt(data.replace('dpost_seats:', ''), 10);
    if (isNaN(seats)) return;

    const state = self.driverPostState.get(userId);
    if (!state || state.step !== 'seats') return;

    state.seats = seats;
    state.step = 'price';
    self.driverPostState.set(userId, state);

    await self.tgSafe(() => ctx.answerCbQuery());
    await self.tgSafe(() =>
      ctx.editMessageText(`✅ ${seats} ta bo'sh joy tanlandi.`),
    );
    await self.tgSafe(() =>
      ctx.reply(
        "💰 Narxni yozing (masalan: 50000 so'm) yoki o'tkazib yuboring:",
        self.inlineTextKeyboard([["⏩ O'tkazib yuborish", '❌ Bekor qilish']]),
      ),
    );
  }

  // --- Driver post: confirm ---
  if (data === 'dpost_confirm') {
    const state = self.driverPostState.get(userId);
    if (!state || state.step !== 'confirm') return;

    const driver = await self.driverService.getByTgId(userId);
    if (!driver) {
      await self.tgSafe(() => ctx.answerCbQuery("Avval ro'yxatdan o'ting"));
      return;
    }
    if (!driver.isApproved) {
      await self.tgSafe(() => ctx.answerCbQuery("Admin tasdig'ini kuting"));
      return;
    }

    await self.tgSafe(() => ctx.answerCbQuery());

    let post: any = null;
    try {
      post = await self.driverPostService.create({
        driverId: driver.id,
        fromName: state.fromName!,
        toName: state.toName!,
        seats: state.seats!,
        price: state.price,
        note: state.note,
      });
    } catch (err) {
      self.logEvent('driver_post_db_save_error', {
        userId,
        error: self.getErrDesc(err),
      });
      await self.tgSafe(() =>
        ctx.editMessageText(
          "❌ E'lon saqlanmadi. Iltimos, qaytadan urinib ko'ring.",
        ),
      );
      return;
    }

    const success = await self.sendDriverPostToChannels(ctx, driver, {
      ...state,
      id: post?.id,
    });
    self.driverPostState.delete(userId);

    if (success > 0) {
      await self.tgSafe(() =>
        ctx.editMessageText("✅ E'loningiz ommaviy kanalga joylandi!"),
      );
    } else {
      await self.tgSafe(() =>
        ctx.editMessageText(
          "❌ Hozircha e'lon joylab bo'lmadi. Keyinroq urinib ko'ring.",
        ),
      );
    }

    // Restore driver menu keyboard
    await self.sendDriverMenu(ctx);
  }

  // --- Driver post: cancel ---
  if (data === 'dpost_cancel') {
    self.driverPostState.delete(userId);
    await self.tgSafe(() => ctx.answerCbQuery('Bekor qilindi'));
    await self.tgSafe(() => ctx.editMessageText("❌ E'lon bekor qilindi."));
    await self.sendDriverMenu(ctx);
  }

  // --- Driver post: close existing ---
  if (data.startsWith('dpost_close:')) {
    const postId = parseInt(data.replace('dpost_close:', ''), 10);
    if (isNaN(postId)) return;

    const post = await self.driverPostService.getById(postId);
    if (!post || Number(post.driver.tgId) !== userId) {
      await self.tgSafe(() => ctx.answerCbQuery("E'lon topilmadi"));
      return;
    }

    await self.closeDriverPost(ctx, post);
    await self.tgSafe(() => ctx.answerCbQuery('Yopildi'));
    await self.tgSafe(() => ctx.editMessageText("❌ E'lon yopildi."));
  }

  // --- Remove public channel ---
  if (data.startsWith('rm_pub_ch:')) {
    const chatId = data.replace('rm_pub_ch:', '');
    try {
      await self.publicChannelService.deleteByChatId(chatId);
      await self.tgSafe(() => ctx.answerCbQuery("O'chirildi"));
      await self.tgSafe(() =>
        ctx.editMessageText("❌ Ommaviy kanal o'chirildi"),
      );
    } catch {
      await self.tgSafe(() => ctx.answerCbQuery('Xatolik'));
    }
  }
}
