import { AdminService } from '../admin/admin.service';
import { RedirectService } from '../redirect/redirect.service';
import { TargetService } from '../target/target.service';
import { KeywordService } from '../keyword/keyword.service';
import { LocationService } from '../location/location.service';
import { AdminLogService } from '../admin-log/admin-log.service';
import { RideOrderService } from '../ride-order/ride-order.service';
import { DriverService } from '../driver/driver.service';
import { DriverPostService } from '../driver-post/driver-post.service';
import { PublicChannelService } from '../public-channel/public-channel.service';
import { UserClientService } from '../user-client/user-client.service';
import { DriverBotService } from './services/driver-bot.service';
import { ClientBotService } from './services/client-bot.service';
import { AdminBotService } from './services/admin-bot.service';
import { ParsingEngine } from '../core/parsing/parsing.engine';
import { ScoringEngine } from '../core/scoring/scoring.engine';
import { BotUpdateBase } from './update/bot.update.base';
import type { SafeContext } from './update/bot-update.types';

export class BotUpdate extends BotUpdateBase {
  constructor(
    redirectService: RedirectService,
    adminService: AdminService,
    targetService: TargetService,
    keywordService: KeywordService,
    locationService: LocationService,
    adminLogService: AdminLogService,
    rideOrderService: RideOrderService,
    driverService: DriverService,
    driverPostService: DriverPostService,
    publicChannelService: PublicChannelService,
    userClientService: UserClientService,
    driverBotService: DriverBotService,
    clientBotService: ClientBotService,
    adminBotService: AdminBotService,
    parsingEngine: ParsingEngine,
    scoringEngine: ScoringEngine,
  ) {
    super(
      redirectService,
      adminService,
      targetService,
      keywordService,
      locationService,
      adminLogService,
      rideOrderService,
      driverService,
      driverPostService,
      publicChannelService,
      userClientService,
      driverBotService,
      clientBotService,
      adminBotService,
      parsingEngine,
      scoringEngine,
    );
  }

  async start(ctx: SafeContext) {
    return super.start(ctx);
  }

  async admin(ctx: SafeContext) {
    return super.admin(ctx);
  }

  async getId(ctx: any) {
    return super.getId(ctx);
  }

  async onText(ctx: SafeContext) {
    return super.onText(ctx);
  }

  async onContact(ctx: SafeContext) {
    return super.onContact(ctx);
  }

  async onPhoto(ctx: SafeContext) {
    return super.onPhoto(ctx);
  }

  async onCallback(ctx: any) {
    return super.onCallback(ctx);
  }
}
