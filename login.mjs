/**
 * Run this script to log in and get your TG_SESSION string:
 *   node login.mjs
 */
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import input from 'input';

const API_ID = 36171940;
const API_HASH = '97ce9ea11830f47ad5f4fe23ca8701e6';

const session = new StringSession('');
const client = new TelegramClient(session, API_ID, API_HASH, {
  connectionRetries: 5,
});

await client.start({
  phoneNumber: async () => await input.text('📱 Telefon raqam (+998...): '),
  password: async () => await input.text('🔑 2FA parol (bo\'lsa): '),
  phoneCode: async () => await input.text('📩 Telegram kod: '),
  onError: (err) => console.error('Login error:', err),
});

console.log('\n✅ Muvaffaqiyatli!\n');
console.log('TG_SESSION qiymatini .env ga qo\'ying:\n');
console.log(client.session.save());
console.log('');

await client.disconnect();
process.exit(0);
