import {
  assertStagingChatAllowed,
  filterStagingChats,
  isBotUpdateAllowed,
  isUserbotMessageAllowed,
  readTelegramScope,
} from './telegram-scope';

const stagingEnv = {
  APP_ENV: 'staging',
  SUPERADMIN_TG_ID: '10',
  STAGING_ALLOWED_USER_IDS: '10,20',
  STAGING_ALLOWED_CHAT_IDS: '-1001,-1002',
};

describe('Telegram staging scope', () => {
  it('fails closed when the staging superadmin is not an allowed test user', () => {
    expect(() =>
      readTelegramScope({
        ...stagingEnv,
        STAGING_ALLOWED_USER_IDS: '20',
      }),
    ).toThrow('must be in STAGING_ALLOWED_USER_IDS');
  });

  it('allows only listed users and groups', () => {
    const scope = readTelegramScope(stagingEnv);

    expect(
      isBotUpdateAllowed(
        { chat: { id: -1001, type: 'supergroup' }, from: { id: 20 } },
        scope,
      ),
    ).toBe(true);
    expect(
      isBotUpdateAllowed(
        { chat: { id: -9999, type: 'supergroup' }, from: { id: 20 } },
        scope,
      ),
    ).toBe(false);
    expect(
      isBotUpdateAllowed(
        { chat: { id: -1001, type: 'supergroup' }, from: { id: 99 } },
        scope,
      ),
    ).toBe(false);
  });

  it('lets an allowed admin discover a new test group id', () => {
    const scope = readTelegramScope(stagingEnv);

    expect(
      isBotUpdateAllowed(
        {
          chat: { id: -9999, type: 'supergroup' },
          from: { id: 10 },
          message: { text: '/getid' },
        },
        scope,
      ),
    ).toBe(true);
  });

  it('applies the same group and user allowlists to userbot scouting', () => {
    const scope = readTelegramScope(stagingEnv);

    expect(isUserbotMessageAllowed('-1001', '20', scope)).toBe(true);
    expect(isUserbotMessageAllowed('-1001', '99', scope)).toBe(false);
    expect(isUserbotMessageAllowed('-9999', '20', scope)).toBe(false);
  });

  it('blocks unlisted outbound groups and filters stale records', () => {
    const scope = readTelegramScope(stagingEnv);
    expect(() => assertStagingChatAllowed('-9999', scope)).toThrow(
      'outside the staging allowlist',
    );
    expect(
      filterStagingChats([{ chatId: '-1001' }, { chatId: '-9999' }], scope),
    ).toEqual([{ chatId: '-1001' }]);
  });

  it('does not restrict production', () => {
    const scope = readTelegramScope({ APP_ENV: 'production' });
    expect(
      isBotUpdateAllowed(
        { chat: { id: -9999, type: 'supergroup' }, from: { id: 99 } },
        scope,
      ),
    ).toBe(true);
    expect(isUserbotMessageAllowed('-9999', '99', scope)).toBe(true);
  });
});
