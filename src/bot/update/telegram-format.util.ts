export function escapeHtml(v: any): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function normalizeChatRef(raw: string): string {
  const token =
    (raw || '')
      .trim()
      .match(
        /(@[A-Za-z0-9_]{5,}|-?\d{5,}|(?:https?:\/\/)?(?:t|telegram)\.me\/[^\s]+|tg:\/\/resolve\?domain=[^\s]+)/i,
      )?.[0] || (raw || '').trim();

  const value = token.replace(/[.,;!?]+$/, '');
  if (!value) return value;

  if (
    value.includes('t.me/+') ||
    value.includes('telegram.me/+') ||
    value.includes('t.me/joinchat/') ||
    value.includes('telegram.me/joinchat/')
  ) {
    throw new Error('INVITE_LINK_UNSUPPORTED');
  }

  const tgResolveMatch = value.match(
    /^tg:\/\/resolve\?domain=([A-Za-z0-9_]+)$/i,
  );
  if (tgResolveMatch) return `@${tgResolveMatch[1]}`;

  const linkMatch = value.match(
    /^(?:https?:\/\/)?(?:t|telegram)\.me\/([A-Za-z0-9_]+)(?:[/?].*)?$/i,
  );
  if (linkMatch) return `@${linkMatch[1]}`;

  if (/^-?\d+$/.test(value)) return value;
  if (value.startsWith('@')) return value;
  if (/^[A-Za-z0-9_]{5,}$/.test(value)) return `@${value}`;

  return value;
}

export function isRedirectTargetType(type?: string): boolean {
  return type === 'group' || type === 'supergroup' || type === 'channel';
}
