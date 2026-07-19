type Environment = Record<string, string | undefined>;

export type TelegramScope = {
  staging: boolean;
  allowedChatIds: Set<string>;
  allowedUserIds: Set<string>;
};

type ScopedContext = {
  chat?: { id?: number | string; type?: string };
  from?: { id?: number | string };
  message?: { text?: string };
};

function parseIds(value: string | undefined) {
  return new Set(
    (value || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

export function readTelegramScope(
  env: Environment = process.env,
): TelegramScope {
  const staging = (env.APP_ENV || 'production').toLowerCase() === 'staging';
  const allowedChatIds = parseIds(env.STAGING_ALLOWED_CHAT_IDS);
  const allowedUserIds = parseIds(env.STAGING_ALLOWED_USER_IDS);

  if (staging) {
    const superadminId = (env.SUPERADMIN_TG_ID || '').trim();
    if (!superadminId) {
      throw new Error('Staging requires SUPERADMIN_TG_ID.');
    }
    if (!allowedUserIds.has(superadminId)) {
      throw new Error(
        'Staging SUPERADMIN_TG_ID must be in STAGING_ALLOWED_USER_IDS.',
      );
    }
  }

  return { staging, allowedChatIds, allowedUserIds };
}

export function isBotUpdateAllowed(
  context: unknown,
  scope = readTelegramScope(),
) {
  const ctx = context as ScopedContext;
  if (!scope.staging) return true;

  const userId = String(ctx.from?.id || '');
  if (!scope.allowedUserIds.has(userId)) return false;
  if (ctx.chat?.type === 'private') return true;

  const text = ctx.message?.text?.trim() || '';
  if (/^\/getid(?:@\w+)?$/i.test(text)) return true;

  return scope.allowedChatIds.has(String(ctx.chat?.id || ''));
}

export function isUserbotMessageAllowed(
  chatId: string,
  userId: string,
  scope = readTelegramScope(),
) {
  return (
    !scope.staging ||
    (scope.allowedChatIds.has(chatId) && scope.allowedUserIds.has(userId))
  );
}

export function assertStagingChatAllowed(
  chatId: string,
  scope = readTelegramScope(),
) {
  if (scope.staging && !scope.allowedChatIds.has(chatId)) {
    throw new Error(`Chat ${chatId} is outside the staging allowlist.`);
  }
}

export function filterStagingChats<T extends { chatId: string }>(
  chats: T[],
  scope = readTelegramScope(),
) {
  return scope.staging
    ? chats.filter((chat) => scope.allowedChatIds.has(chat.chatId))
    : chats;
}
