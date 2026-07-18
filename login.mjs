/**
 * Run this script to log in and get your TG_SESSION string:
 *   node login.mjs
 */
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import input from 'input';

const API_ID = Number.parseInt(process.env.TG_API_ID || process.env.API_ID || '', 10);
const API_HASH = process.env.TG_API_HASH || process.env.API_HASH || '';

if (!API_ID || !API_HASH) {
  throw new Error('Set TG_API_ID and TG_API_HASH before running login.mjs.');
}

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
