/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { Context, Markup } from 'telegraf';
import { DriverService } from '../../driver/driver.service';
import { DriverState } from '../../core/state/state.types';

type SafeContext = Context & {
  chat: { id: number; type: string };
  from: { id: number; first_name?: string; username?: string };
  message: any;
  match?: string[];
};

@Injectable()
export class DriverBotService {
  private readonly logger = new Logger(DriverBotService.name);

  constructor(private readonly driverService: DriverService) {}

  /**
   * Main driver menu with button-based navigation
   */
  async showMainMenu(ctx: SafeContext) {
    const driver = await this.driverService.getByTgId(ctx.from.id);
    
    if (!driver) {
      await ctx.reply(
        '🚗 Haydovchi sifatida ro\'yxatdan o\'ting:\n\n' +
        'Ismingiz, telefon raqamingiz va mashina raqamingizni yuboring.',
      );
      return;
    }

    const statusEmoji = this.driverService.statusEmoji(driver.status);
    const statusLabel = this.driverService.statusLabel(driver.status);
    
    const message = `🚗 <b>Haydovchi Paneli</b>\n\n` +
      `👤 ${driver.fullName}\n` +
      `🚕 ${driver.carNumber}\n` +
      `📊 Holat: ${statusEmoji} ${statusLabel}\n` +
      `💺 O'rinlar: ${driver.seatsAvailable}\n\n` +
      (driver.fromLocation && driver.toLocation 
        ? `📍 ${driver.fromLocation} → ${driver.toLocation}\n` 
        : '📍 Yo\'nalish belgilanmagan\n');

    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: this.buildMainMenuKeyboard(driver.status),
      },
    });
  }

  /**
   * Build main menu keyboard based on driver state
   */
  private buildMainMenuKeyboard(status: string): Array<Array<{ text: string; callback_data: string }>> {
    const keyboard: any[][] = [];

    // State change buttons
    switch (status) {
      case DriverState.OFFLINE:
        keyboard.push([Markup.button.callback('✅ Ishni boshlash', 'driver_start_shift')]);
        break;
      case DriverState.AVAILABLE:
        keyboard.push([
          Markup.button.callback('⏸ To\'xtatish', 'driver_stop_shift'),
          Markup.button.callback('🔴 To\'la', 'driver_mark_full'),
        ]);
        break;
      case DriverState.FULL:
        keyboard.push([Markup.button.callback('💺 Bo\'shatish', 'driver_mark_available')]);
        break;
      case DriverState.EN_ROUTE:
        keyboard.push([Markup.button.callback('✅ Yetib keldim', 'driver_arrived')]);
        break;
    }

    // Common action buttons
    keyboard.push([
      Markup.button.callback('📍 Yo\'nalish', 'driver_set_route'),
      Markup.button.callback('💺 O\'rinlar', 'driver_update_seats'),
    ]);

    keyboard.push([
      Markup.button.callback('🔄 Oxirgi takrorlash', 'driver_repeat_last'),
      Markup.button.callback('📊 Statistika', 'driver_stats'),
    ]);

    return keyboard;
  }

  /**
   * Handle driver state transitions
   */
  async handleStateTransition(ctx: SafeContext, action: string) {
    const driver = await this.driverService.getByTgId(ctx.from.id);
    if (!driver) {
      await ctx.reply('⚠️ Avval ro\'yxatdan o\'ting.');
      return;
    }

    let success = false;
    let message = '';

    switch (action) {
      case 'driver_start_shift':
        success = await this.driverService.updateState(driver.tgId as any, DriverState.AVAILABLE);
        message = success ? '✅ Ish boshlandi! Yo\'nalishingizni belgilang.' : '⚠️ Xatolik yuz berdi.';
        break;

      case 'driver_stop_shift':
        success = await this.driverService.updateState(driver.tgId as any, DriverState.OFFLINE);
        message = success ? '⏸ Ish to\'xtatildi.' : '⚠️ Xatolik yuz berdi.';
        break;

      case 'driver_mark_full':
        success = await this.driverService.updateState(driver.tgId as any, DriverState.FULL);
        message = success ? '🔴 Mashina to\'la deb belgilandi.' : '⚠️ Xatolik yuz berdi.';
        break;

      case 'driver_mark_available':
        success = await this.driverService.updateState(driver.tgId as any, DriverState.AVAILABLE);
        message = success ? '💺 Mashina bo\'sh deb belgilandi.' : '⚠️ Xatolik yuz berdi.';
        break;

      case 'driver_arrived':
        success = await this.driverService.updateState(driver.tgId as any, DriverState.AVAILABLE);
        message = success ? '✅ Yetib kelganingiz qayd etildi.' : '⚠️ Xatolik yuz berdi.';
        break;
    }

    await ctx.reply(message, {
      reply_markup: {
        inline_keyboard: this.buildMainMenuKeyboard(success ? await this.getDriverStatus(driver.tgId as any) : driver.status),
      },
    });
  }

  /**
   * Show route selection interface
   */
  async showRouteSelection(ctx: SafeContext) {
    const message = '📍 Yo\'nalishni tanlang:\n\n' +
      '1️⃣ Qayerdan ketasiz?\n' +
      '2️⃣ Qayerga borasiz?';

    await ctx.reply(message, {
      reply_markup: {
        inline_keyboard: [
          [Markup.button.callback('🏠 Qayerdan', 'driver_route_from')],
          [Markup.button.callback('🏁 Qayerga', 'driver_route_to')],
          [Markup.button.callback('⬅️ Orqaga', 'driver_back_to_menu')],
        ],
      },
    });
  }

  /**
   * Show seats selection interface
   */
  async showSeatsSelection(ctx: SafeContext) {
    const driver = await this.driverService.getByTgId(ctx.from.id);
    const currentSeats = driver?.seatsAvailable || 4;

    const message = `💺 O'rinlar sonini tanlang:\n\n` +
      `Hozirgi: ${currentSeats}`;

    const buttons: Array<{ text: string; callback_data: string }> = [];
    for (let i = 1; i <= 4; i++) {
      buttons.push({
        text: `${i} o'rin`,
        callback_data: `driver_seats_${i}`,
      });
    }

    await ctx.reply(message, {
      reply_markup: {
        inline_keyboard: [
          buttons,
          [{ text: '⬅️ Orqaga', callback_data: 'driver_back_to_menu' }],
        ],
      },
    });
  }

  /**
   * Update driver seats
   */
  async updateSeats(ctx: SafeContext, seats: number) {
    const driver = await this.driverService.getByTgId(ctx.from.id);
    if (!driver) {
      await ctx.reply('⚠️ Avval ro\'yxatdan o\'ting.');
      return;
    }

    const success = await this.driverService.updateSeats(driver.tgId as any, seats);
    
    if (success) {
      await ctx.reply(`✅ O'rinlar soni ${seats} ga o'zgartirildi.`, {
        reply_markup: {
          inline_keyboard: this.buildMainMenuKeyboard(driver.status),
        },
      });
    } else {
      await ctx.reply('⚠️ Xatolik yuz berdi.');
    }
  }

  /**
   * Get driver status
   */
  private async getDriverStatus(tgId: bigint): Promise<string> {
    const driver = await this.driverService.getByTgId(Number(tgId));
    return driver?.status || DriverState.OFFLINE;
  }
}
