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
  if (!self.isTaxiOrder(text)) return;

  const groups = await self.redirectService.getActiveGroups();
  if (!groups.length) return;

  const sourceChatTitle = ctx.chat.title || String(ctx.chat.id);
  const scoutMsg = await self.buildScoutMessage(ctx, text, sourceChatTitle);

  let success = 0;

  for (const g of groups) {
    const target = g.chatId;

    try {
      await self.safeForward(ctx, target, ctx.chat.id, ctx.message.message_id);
      await self.safeSendMessage(ctx, target, scoutMsg, { parse_mode: 'HTML' });
      success++;
    } catch {
      try {
        await self.safeSendMessage(ctx, target, scoutMsg, {
          parse_mode: 'HTML',
        });
        success++;
      } catch (err: any) {
        if (self.isWriteForbidden(err)) {
          self.logEvent('scout_write_forbidden', { groupTitle: g.title });
        } else if (self.isProtectedError(err)) {
          self.logEvent('scout_protected', { groupTitle: g.title });
        } else {
          self.logEvent('scout_error', {
            groupTitle: g.title,
            error: self.getErrDesc(err),
          });
        }
      }
    }

    await self.tgDelay();
  }

  if (success > 0) {
    self.logEvent('scout_forwarded', {
      forwardedCount: success,
      sourceChatId: ctx.chat.id,
    });
  }
}
