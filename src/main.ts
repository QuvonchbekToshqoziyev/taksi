/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-misused-promises */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BotRuntime } from './bot/bot.runtime';

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) {
    return;
  }

  const contents = readFileSync(filePath, 'utf8');
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const equalsIndex = line.indexOf('=');
    if (equalsIndex === -1) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    let value = line.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

async function bootstrap() {
  loadEnvFile(resolve(process.cwd(), '.env'));

  const app = await NestFactory.createApplicationContext(AppModule);
  const botRuntime = app.get(BotRuntime);
  await botRuntime.start();

  process.once('SIGINT', async () => {
    botRuntime.stop();
    await app.close();
  });
  process.once('SIGTERM', async () => {
    botRuntime.stop();
    await app.close();
  });
}

void bootstrap().catch((error) => {
  // Keep startup failure visible in non-HTTP app context.
  console.error('Bootstrap failed', error);
  process.exit(1);
});