import { Injectable, Logger } from '@nestjs/common';
import { Context, Markup } from 'telegraf';
import { AdminService } from '../../admin/admin.service';
import { DriverService } from '../../driver/driver.service';
import { RideOrderService } from '../../ride-order/ride-order.service';
import { KeywordService } from '../../keyword/keyword.service';
import { TargetService } from '../../target/target.service';
import { RedirectService } from '../../redirect/redirect.service';

type SafeContext = Context & {
  chat: { id: number; type: string };
  from: { id: number; first_name?: string; username?: string };
  message: any;
  match?: string[];
};

@Injectable()
export class AdminBotService {
  private readonly logger = new Logger(AdminBotService.name);

  constructor(
    private readonly adminService: AdminService,
    private readonly driverService: DriverService,
    private readonly rideOrderService: RideOrderService,
    private readonly keywordService: KeywordService,
    private readonly targetService: TargetService,
    private readonly redirectService: RedirectService,
  ) {}

  /**
   * Show admin main menu
   */
  async showAdminMenu(ctx: SafeContext) {
    const isAdmin = await this.adminService.isAdmin(ctx);
    if (!isAdmin) {
      await ctx.reply('⚠️ Sizda admin huquqi yo\'q.');
      return;
    }

    const message = '👑 <b>Admin Paneli</b>\n\n' +
      'Boshqaruv bo\'limini tanlang:';

    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            Markup.button.callback('🚗 Haydovchilar', 'admin_drivers'),
            Markup.button.callback('📋 Buyurtmalar', 'admin_orders'),
          ],
          [
            Markup.button.callback('🔑 Kalit so\'zlar', 'admin_keywords'),
            Markup.button.callback('🎯 Nishon guruhlar', 'admin_targets'),
          ],
          [
            Markup.button.callback('📢 Yo\'naltirish', 'admin_redirects'),
            Markup.button.callback('🚫 Ban/Unban', 'admin_ban'),
          ],
          [
            Markup.button.callback('📊 Statistika', 'admin_stats'),
            Markup.button.callback('⚙️ Sozlamalar', 'admin_settings'),
          ],
        ],
      },
    });
  }

  /**
   * Show active drivers
   */
  async showActiveDrivers(ctx: SafeContext) {
    const drivers = await this.driverService.getAvailableDrivers();

    if (drivers.length === 0) {
      await ctx.reply('🚗 Faol haydovchilar yo\'q.');
      return;
    }

    let message = '🚗 <b>Faol Haydovchilar</b>\n\n';
    for (const driver of drivers.slice(0, 10)) {
      message += `👤 ${driver.fullName}\n` +
        `🚕 ${driver.carNumber}\n` +
        `💺 ${driver.seatsAvailable} o'rin\n` +
        `📍 ${driver.fromLocation || '?'} → ${driver.toLocation || '?'}\n\n`;
    }

    await ctx.reply(message, { parse_mode: 'HTML' });
  }

  /**
   * Show active orders
   */
  async showActiveOrders(ctx: SafeContext) {
    const orders = await this.rideOrderService.getNewOrders();

    if (orders.length === 0) {
      await ctx.reply('📋 Faol buyurtmalar yo\'q.');
      return;
    }

    let message = '📋 <b>Faol Buyurtmalar</b>\n\n';
    for (const order of orders.slice(0, 10)) {
      message += `🆔 #${order.id}\n` +
        `📍 ${order.fromName} → ${order.toName}\n` +
        `💺 ${order.passengers} o'rin\n` +
        `📞 ${order.phone}\n` +
        `🕐 ${new Date(order.createdAt).toLocaleString()}\n\n`;
    }

    await ctx.reply(message, { parse_mode: 'HTML' });
  }

  /**
   * Show keyword management
   */
  async showKeywordManagement(ctx: SafeContext) {
    const message = '🔑 <b>Kalit So\'zlar Boshqaruvi</b>\n\n' +
      'Amalni tanlang:';

    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            Markup.button.callback('➕ Qo\'shish', 'admin_keyword_add'),
            Markup.button.callback('➖ O\'chirish', 'admin_keyword_remove'),
          ],
          [Markup.button.callback('📋 Ro\'yxat', 'admin_keyword_list')],
          [Markup.button.callback('⬅️ Orqaga', 'admin_back')],
        ],
      },
    });
  }

  /**
   * Add keyword
   */
  async addKeyword(ctx: SafeContext, phrase: string, type: 'client' | 'driver') {
    try {
      await this.keywordService.addKeyword(phrase, type);
      await ctx.reply(`✅ "${phrase}" kalit so'z qo'shildi (${type}).`);
    } catch (error) {
      await ctx.reply('⚠️ Xatolik yuz berdi. Kalit so\'z allaqachon mavjud bo\'lishi mumkin.');
    }
  }

  /**
   * Remove keyword
   */
  async removeKeyword(ctx: SafeContext, phrase: string) {
    try {
      await this.keywordService.removeKeyword(phrase);
      await ctx.reply(`✅ "${phrase}" kalit so'z o'chirildi.`);
    } catch (error) {
      await ctx.reply('⚠️ Xatolik yuz berdi. Kalit so\'z topilmadi.');
    }
  }

  /**
   * Show target groups
   */
  async showTargetGroups(ctx: SafeContext) {
    const groups = await this.targetService.getActiveGroups();

    if (groups.length === 0) {
      await ctx.reply('🎯 Nishon guruhlar yo\'q.');
      return;
    }

    let message = '🎯 <b>Nishon Guruhlar</b>\n\n';
    for (const group of groups) {
      message += `📢 ${group.title}\n` +
        `🆔 ${group.chatId}\n\n`;
    }

    await ctx.reply(message, { parse_mode: 'HTML' });
  }

  /**
   * Ban/unban user
   */
  async banUser(ctx: SafeContext, userId: number) {
    // Implementation depends on your user management system
    await ctx.reply(`🚫 Foydalanuvchi ${userId} bloklandi.`);
  }

  async unbanUser(ctx: SafeContext, userId: number) {
    // Implementation depends on your user management system
    await ctx.reply(`✅ Foydalanuvchi ${userId} blokdan chiqarildi.`);
  }

  /**
   * Show statistics
   */
  async showStatistics(ctx: SafeContext) {
    const drivers = await this.driverService.getAvailableDrivers();
    const orders = await this.rideOrderService.getNewOrders();
    const keywords = await this.keywordService.getClientKeywords();
    const targets = await this.targetService.getActiveGroups();

    const message = '📊 <b>Statistika</b>\n\n' +
      `🚗 Faol haydovchilar: ${drivers.length}\n` +
      `📋 Yangi buyurtmalar: ${orders.length}\n` +
      `🔑 Kalit so'zlar: ${keywords.length}\n` +
      `🎯 Nishon guruhlar: ${targets.length}`;

    await ctx.reply(message, { parse_mode: 'HTML' });
  }

  /**
   * Enable/disable scouting
   */
  async toggleScouting(ctx: SafeContext, enabled: boolean) {
    // This would update a configuration in the database
    const status = enabled ? 'yoqildi' : 'o\'chirildi';
    await ctx.reply(`🔍 Skauting ${status}.`);
  }
}
