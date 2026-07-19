# Taksi Bot

A Telegram ride-coordination bot for clients, approved drivers, group scouting,
priority-driver dispatch, and driver advertisements.

Built with **NestJS**, **Telegraf**, **gramJS**, and **Prisma**.

## Architecture

```
src/
├── core/                    # Core business logic (no Telegram dependencies)
│   ├── parsing/             # Text parsing & token classification engine
│   ├── scoring/             # Confidence scoring for requests
│   ├── matching/            # Driver-request matching engine
│   ├── state/               # Strict state management with valid transitions
│   ├── logging/             # Centralized logging service
│   └── telegram/            # Telegram API retry & error handling
├── bot/                     # Telegram bot handlers
│   ├── driver-bot.service.ts    # Driver button-based flows
│   ├── client-bot.service.ts    # Client structured request flow
│   └── admin-bot.service.ts     # Admin management features
├── driver/                  # Driver management service
├── ride-order/              # Ride order management
├── keyword/                 # Keyword management
├── target/                  # Target group management
├── redirect/                # Redirect group management
├── user-client/             # Telegram user client (scouting)
├── admin/                   # Admin management
└── prisma/                  # Database service
```

## Features

### 🚗 Driver Experience
- **Button-based flows**: Start shift, set route, select seats, select features
- **State management**: OFFLINE → AVAILABLE → FULL → EN_ROUTE with valid transitions only
- **Quick actions**: "Repeat last ride", "Update seats (+/-)", "Mark full"

### 👤 Client Experience
- **Structured request flow**: Buttons + minimal input
- **Smart parsing**: Automatic intent detection, seat/time/phone extraction
- **Group message handling**: Detect and persist client requests from configured groups

### 🔍 2-Layer Scouting System
- **Bot scout**: reads configured mixed groups where the bot can receive messages
- **Userbot scout**: reads configured mixed groups where a Bot API bot cannot read
- Both scouts may run together. `(sourceChatId, sourceMessageId)` deduplication prevents duplicate orders.

### Telegram group roles used in this project

- **Mijoz qidirish guruhi** (`TargetGroup`): a mixed/client group that is scanned for ride requests. Taxi-only groups must not be added here.
- **Priority haydovchilar guruhi** (`RedirectGroup`): the private insider group that receives discovered requests and bot-created client orders. Only admin-approved drivers can claim them.
- **E'lon kanali/guruhi** (`PublicChannel`): a taxi-only group or admin-only channel where the bot publishes approved drivers' ads. A mixed group may also be configured here if ads are allowed there.

For bot scouting, disable the bot's privacy mode or make it an admin in the
mixed group. If that is not possible, add the numeric chat ID and let the
userbot scout it. The publishing bot must be an admin in admin-only channels.

Drivers reply `olindi` to a numbered order card to claim it. The database changes `NEW → MATCHED` and creates the `Ride` atomically, so only one competing driver wins. A driver can release only their own ride with `otmen`.

### 🎯 Dispatch

- Numbered requests are broadcast to configured priority-driver groups.
- Only approved drivers may claim a request.
- The first atomic database claim wins.

### 👑 Admin System
- Add/remove keywords
- Configure mixed intake groups, priority groups, and ad destinations
- Approve drivers
- Manage locations and client/driver keywords
- View and restore supported admin-log changes

## Prerequisites

- Node.js 20+
- PostgreSQL
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))
- Telegram APP ID and APP HASH (for user client, via [my.telegram.org](https://my.telegram.org))

## Setup & Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`. The simplest setup uses one bot for admins,
clients, drivers, scouting and ads:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/taksi?schema=public"

# One combined Telegram bot
BOT_TOKEN="YOUR_BOT_TOKEN_HERE"

# Telegram User Client (for scouting)
TG_API_ID="YOUR_API_ID"
TG_API_HASH="YOUR_API_HASH"
TG_SESSION="" # Leave blank initially

# Admin
SUPERADMIN_TG_ID="YOUR_TELEGRAM_ID"
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# (Optional) View database
npx prisma studio
```

The critical-flow migration intentionally resets legacy driver approvals,
because the old schema auto-approved every registration. Reapprove the real
priority drivers from **🚗 Haydovchilar** after migrating.

### 4. Generate TG_SESSION (Optional, for scouting)

Run the interactive script to authenticate a Telegram user account:

```bash
node --env-file=.env login.mjs
```

Provide your phone number and OTP when prompted. Copy the resulting session string and paste it into `.env` as `TG_SESSION=...`. `TG_API_ID`, `TG_API_HASH`, bot tokens and server passwords must never be committed.

For three separate bots, leave `BOT_TOKEN` empty and set
`ADMIN_BOT_TOKEN`, `CLIENT_BOT_TOKEN`, and `DRIVER_BOT_TOKEN`. The admin bot
must be able to write to the priority-driver groups. New drivers remain
unapproved until the superadmin approves them from **🚗 Haydovchilar**.

### 5. Run the Application

```bash
# Development mode
npm run start:dev

# Production build
npm run build
npm run start:prod
```

### 6. Run Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov
```

## Deployment (PM2)

For a fully isolated pre-production Telegram environment, follow
[`docs/staging.md`](docs/staging.md). It uses a separate service, database,
bot/userbot identities, allowed test users and allowed test chats.

### Deploy to Remote VPS

```bash
# Requires Node.js, npm, git, a configured PostgreSQL DATABASE_URL,
# and /opt/taxi-bot/.env on the server.
./deploy.sh

# Or manually with PM2
pm2 start dist/main.js --name taksi
pm2 save
pm2 startup
```

### Environment Checklist

Before deploying, ensure:
- [ ] `.env` file is configured on the server
- [ ] `TG_SESSION` is set (if using scouting)
- [ ] Database is accessible
- [ ] `npm run build` succeeds
- [ ] `npm test` passes

## State Transitions

### Driver States
```
OFFLINE → AVAILABLE → FULL → AVAILABLE
                  ↘ EN_ROUTE → AVAILABLE
                  ↘ OFFLINE
```

### Client Request States
```
NEW → PARTIAL_MATCH → MATCHED
  ↘ EXPIRED
  ↘ CANCELLED
```

### Ride States
```
CREATED → IN_PROGRESS → COMPLETED
       ↘ CANCELLED
```

## Scoring System

Requests are scored based on:
- **Time**: +2 (urgent: +3)
- **Seats**: +2
- **Intent**: +2 (clear client/driver intent)
- **Phone**: +2 (valid), +1 (partial)
- **Location**: +2 (both from/to), +1 (partial)
- **Confidence bonus**: +1 (if parsing confidence ≥7)

**Threshold**: ≥4 points = valid request

## API Error Handling

The system includes:
- Automatic retry for rate limits (429)
- Flood wait detection and handling
- Graceful handling of blocked users, forbidden writes, protected content
- Exponential backoff for transient errors

## Project Structure

```
taksi/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Database migrations
├── src/
│   ├── core/                  # Core business logic
│   │   ├── parsing/           # Text parsing engine
│   │   ├── scoring/           # Confidence scoring
│   │   ├── matching/          # Driver-request matching
│   │   ├── state/             # State management
│   │   ├── logging/           # Logging service
│   │   └── telegram/          # Telegram retry logic
│   ├── bot/                   # Bot handlers
│   ├── driver/                # Driver management
│   ├── ride-order/            # Ride order management
│   ├── keyword/               # Keyword management
│   ├── target/                # Target group management
│   ├── redirect/              # Redirect group management
│   ├── user-client/           # Telegram user client
│   ├── admin/                 # Admin management
│   └── prisma/                # Prisma service
├── login.mjs                  # TG_SESSION generator
├── deploy.sh                  # Deployment script
├── package.json
├── tsconfig.json
└── README.md
```

## Support

For issues or questions, contact the development team.

## License

Private - All rights reserved
