/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import type { SafeContext } from '../bot-update.types';
import { Markup } from 'telegraf';
import { validateKeywordPhrase, validateLocationName } from '../admin-input.validation';

 
export async function handleAdminText(self: any, ctx: SafeContext, text: string, isSuperAdmin: boolean): Promise<boolean> {
    // --- 🏠 Bosh sahifa ---
    if (text === '🏠 Bosh sahifa') {
      await self.sendMainMenu(ctx, isSuperAdmin);
      return true;
    }

    // --- ❌ Bekor qilish ---
    if (text === '❌ Bekor qilish') {
      self.waitingRedirect.delete(ctx.from.id);
      self.waitingTarget.delete(ctx.from.id);
      self.waitingKeyword.delete(ctx.from.id);
      self.waitingLocationSub.delete(ctx.from.id);
      await self.sendMainMenu(ctx, isSuperAdmin);
      return true;
    }

    // --- Redirect qo'shish (superadmin only) ---
    if (text === '➕ Redirect qo\'shish' && isSuperAdmin) {
      self.waitingRedirect.add(ctx.from.id);
      self.waitingTarget.delete(ctx.from.id);
      self.waitingKeyword.delete(ctx.from.id);
      await self.tgSafe(() =>
        ctx.reply(
          'Guruh/kanal @username yoki chat ID yuboring (-100...).',
          self.inlineTextKeyboard([['❌ Bekor qilish', '🏠 Bosh sahifa']]),
        ),
      );
      return true;
    }

    if (text === '📋 Redirectlar' && isSuperAdmin) {
      const groups = await self.redirectService.getActiveGroups();
      if (!groups.length) {
        await self.tgSafe(() => ctx.reply('Redirect yo\'q'));
        return true;
      }
      const buttons = groups.map(g => [
        Markup.button.callback(`❌ ${g.title}`, `rm_redirect:${g.chatId}`),
      ]);
      await self.tgSafe(() => ctx.reply('Redirectlar (bosing o\'chirish uchun):', Markup.inlineKeyboard(buttons)));
      return true;
    }

    // --- Client guruh qo'shish (superadmin only) ---
    if (text === '📥 Client guruh qo\'shish' && isSuperAdmin) {
      self.waitingTarget.add(ctx.from.id);
      self.waitingRedirect.delete(ctx.from.id);
      self.waitingKeyword.delete(ctx.from.id);
      await self.tgSafe(() =>
        ctx.reply(
          'Client guruh/kanal @username yoki chat ID yuboring (-100...).',
          self.inlineTextKeyboard([['❌ Bekor qilish', '🏠 Bosh sahifa']]),
        ),
      );
      return true;
    }

    if (text === '📋 Client guruhlar' && isSuperAdmin) {
      const groups = await self.targetService.getActiveGroups();
      if (!groups.length) {
        await self.tgSafe(() => ctx.reply('Client guruh yo\'q'));
        return true;
      }
      const buttons = groups.map(g => [
        Markup.button.callback(`❌ ${g.title}`, `rm_target:${g.chatId}`),
      ]);
      await self.tgSafe(() => ctx.reply('Client guruhlar (bosing o\'chirish uchun):', Markup.inlineKeyboard(buttons)));
      return true;
    }

    // --- Kalit so'zlar (superadmin only) ---
    if (text === '\uD83D\uDCD7 Kalit so\u02BBzlar' && isSuperAdmin) {
      self.waitingRedirect.delete(ctx.from.id);
      self.waitingTarget.delete(ctx.from.id);
      self.waitingKeyword.delete(ctx.from.id);
      await self.tgSafe(() =>
        ctx.reply(
          'Kalit so\u02BBzlar boshqaruvi:',
          self.inlineTextKeyboard([
            ['\uD83D\uDC64 Mijoz so\u02BBzlari', '\uD83D\uDE97 Haydovchi so\u02BBzlari'],
            ['\u2795 Mijoz so\u02BBz qo\u02BBshish', '\u2795 Haydovchi so\u02BBz qo\u02BBshish'],
            ['\uD83C\uDFE0 Bosh sahifa'],
          ]),
        ),
      );
      return true;
    }

    if (text === '\uD83D\uDC64 Mijoz so\u02BBzlari' && isSuperAdmin) {
      await self.showKeywords(ctx, 'client');
      return true;
    }

    if (text === '\uD83D\uDE97 Haydovchi so\u02BBzlari' && isSuperAdmin) {
      await self.showKeywords(ctx, 'driver');
      return true;
    }

    if (text === '\u2795 Mijoz so\u02BBz qo\u02BBshish' && isSuperAdmin) {
      self.waitingKeyword.set(ctx.from.id, 'client');
      self.waitingRedirect.delete(ctx.from.id);
      self.waitingTarget.delete(ctx.from.id);
      await self.tgSafe(() =>
        ctx.reply(
          'Yangi mijoz kalit so\u02BBzini yozing:',
          self.inlineTextKeyboard([['\u274c Bekor qilish', '\uD83C\uDFE0 Bosh sahifa']]),
        ),
      );
      return true;
    }

    if (text === '\u2795 Haydovchi so\u02BBz qo\u02BBshish' && isSuperAdmin) {
      self.waitingKeyword.set(ctx.from.id, 'driver');
      self.waitingRedirect.delete(ctx.from.id);
      self.waitingTarget.delete(ctx.from.id);
      await self.tgSafe(() =>
        ctx.reply(
          'Yangi haydovchi kalit so\u02BBzini yozing:',
          self.inlineTextKeyboard([['\u274c Bekor qilish', '\uD83C\uDFE0 Bosh sahifa']]),
        ),
      );
      return true;
    }

    // --- Waiting for keyword input ---
    if (self.waitingKeyword.has(ctx.from.id)) {
      const type = self.waitingKeyword.get(ctx.from.id)!;
      const keywordValidation = validateKeywordPhrase(text);
      if (!keywordValidation.ok) {
        await self.tgSafe(() => ctx.reply(keywordValidation.message || '❌ Noto\'g\'ri kalit so\'z.'));
        return true;
      }
      const phrase = keywordValidation.normalized!;
      try {
        const kw = await self.keywordService.addKeyword(phrase, type);
        await self.adminLogService.log({
          adminTgId: ctx.from.id, action: 'add', targetType: 'keyword',
          targetId: String(kw.id), details: `${type}: ${phrase}`,
        });
        self.waitingKeyword.delete(ctx.from.id);
        const label = type === 'client' ? 'Mijoz' : 'Haydovchi';
        await self.tgSafe(() => ctx.reply(`\u2705 ${label} kalit so\u02BBz qo\u02BBshildi: ${phrase}`));
        await self.sendMainMenu(ctx, isSuperAdmin);
      } catch {
        await self.tgSafe(() => ctx.reply('\u274c Xatolik yuz berdi'));
      }
      return true;
    }

    // --- 📍 Joylashuvlar (all admins) ---
    if (text === '📍 Joylashuvlar') {
      await self.showLocations(ctx);
      return true;
    }

    // --- Waiting for sub-location input ---
    if (self.waitingLocationSub.has(ctx.from.id)) {
      const parentId = self.waitingLocationSub.get(ctx.from.id)!;
      const locationValidation = validateLocationName(text);
      if (!locationValidation.ok) {
        await self.tgSafe(() => ctx.reply(locationValidation.message || '❌ Noto\'g\'ri joy nomi.'));
        return true;
      }
      const name = locationValidation.normalized!;
      try {
        const loc = await self.locationService.addLocation(name, parentId);
        await self.adminLogService.log({
          adminTgId: ctx.from.id, action: 'add', targetType: 'location',
          targetId: String(loc.id), details: `${name} (parent: ${parentId})`,
        });
        self.waitingLocationSub.delete(ctx.from.id);
        await self.tgSafe(() => ctx.reply(`✅ Joylashuv qo'shildi: ${name}`));
        await self.showLocationChildren(ctx, parentId);
      } catch {
        await self.tgSafe(() => ctx.reply('❌ Xatolik yuz berdi (nomi takrorlanmasin)'));
      }
      return true;
    }

    // --- 📜 Admin loglar (superadmin only) ---
    if (text === '📜 Admin loglar' && isSuperAdmin) {
      await self.showAdminLogs(ctx);
      return true;
    }

    // --- 📢 Ommaviy kanal (superadmin only) ---
    if (text === '📢 Ommaviy kanal' && isSuperAdmin) {
      const channels = await self.publicChannelService.getAll();
      const channelList = channels.length
        ? channels.map(c => `• ${self.escapeHtml(c.title)}`).join('\n')
        : 'Hozircha kanal yo\'q';
      await self.tgSafe(() =>
        ctx.reply(
          `📢 <b>Ommaviy kanallar:</b>\n${channelList}`,
          {
            parse_mode: 'HTML',
            ...self.inlineTextKeyboard([
              ['➕ Kanal qo\'shish', '📋 Kanallar'],
              ['🏠 Bosh sahifa'],
            ]),
          },
        ),
      );
      return true;
    }

    if (text === '➕ Kanal qo\'shish' && isSuperAdmin) {
      self.waitingPublicChannel.add(ctx.from.id);
      self.waitingRedirect.delete(ctx.from.id);
      self.waitingTarget.delete(ctx.from.id);
      await self.tgSafe(() =>
        ctx.reply(
          'Ommaviy kanal @username yoki chat ID yuboring (-100...).',
          self.inlineTextKeyboard([['❌ Bekor qilish', '🏠 Bosh sahifa']]),
        ),
      );
      return true;
    }

    if (text === '📋 Kanallar' && isSuperAdmin) {
      const channels = await self.publicChannelService.getAll();
      if (!channels.length) {
        await self.tgSafe(() => ctx.reply('Ommaviy kanal yo\'q'));
        return true;
      }
      const buttons = channels.map(c => [
        Markup.button.callback(`❌ ${c.title}`, `rm_pub_ch:${c.chatId}`),
      ]);
      await self.tgSafe(() =>
        ctx.reply('Ommaviy kanallar (bosing o\'chirish uchun):', Markup.inlineKeyboard(buttons)),
      );
      return true;
    }

    // --- Waiting for public channel input ---
    if (self.waitingPublicChannel.has(ctx.from.id)) {
      await self.processAddPublicChannel(ctx, text);
      return true;
    }

    // --- Waiting for redirect input ---
    if (self.waitingRedirect.has(ctx.from.id)) {
      await self.processAddRedirect(ctx, text);
      return true;
    }

    // --- Waiting for target input ---
    if (self.waitingTarget.has(ctx.from.id)) {
      await self.processAddTarget(ctx, text);
      return true;
    }

    return false;
}
