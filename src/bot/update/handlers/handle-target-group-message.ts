/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import type { SafeContext } from '../bot-update.types';

export async function handleTargetGroupMessage(
  self: any,
  ctx: SafeContext,
  text: string,
) {
  if ((ctx.from as any)?.is_bot) return;
  if (!ctx.from?.id || !ctx.message?.message_id) return;
  if (!self.isTaxiOrder(text)) return;

  const sourceChatTitle = ctx.chat.title || String(ctx.chat.id);
  const parsed = self.parsingEngine.parse(text);
  const stored = await self.rideOrderService.createFromGroup({
    userTgId: ctx.from.id,
    sourceChatId: String(ctx.chat.id),
    sourceMessageId: ctx.message.message_id,
    sourceText: text,
    sourceTitle: sourceChatTitle,
    passengers: parsed.seats || 1,
    phone: self.extractPhone(text) || undefined,
    time: parsed.time,
  });
  if (!stored.created) return;

  const groups = await self.redirectService.getActiveGroups();
  if (!groups.length) {
    await self.rideOrderService.updateStatus(stored.order.id, 'CANCELLED');
    return;
  }

  const scoutMsg = await self.buildScoutMessage(
    ctx,
    text,
    stored.order.id,
    sourceChatTitle,
  );

  let success = 0;

  for (const g of groups) {
    const target = g.chatId;

    try {
      await self.safeSendMessage(ctx, target, scoutMsg, { parse_mode: 'HTML' });
      success++;
    } catch (err: any) {
      if (self.isWriteForbidden(err)) {
        self.logEvent('scout_write_forbidden', { groupTitle: g.title });
      } else {
        self.logEvent('scout_error', {
          groupTitle: g.title,
          error: self.getErrDesc(err),
        });
      }
    }

    await self.tgDelay();
  }

  if (success > 0) {
    self.logEvent('scout_forwarded', {
      forwardedCount: success,
      sourceChatId: ctx.chat.id,
    });
  } else {
    await self.rideOrderService.updateStatus(stored.order.id, 'CANCELLED');
  }
}
