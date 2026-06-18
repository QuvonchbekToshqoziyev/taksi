# Taksi Bot - Production Ready

A robust, scalable Telegram-based ride coordination platform that minimizes user typing, reduces chaos from group messages, and operates reliably even if scouting partially fails.

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

### 🚗 Driver Experience (Zero Typing)
- **Button-based flows**: Start shift, set route, select seats, select features
- **State management**: OFFLINE → AVAILABLE → FULL → EN_ROUTE with valid transitions only
- **Quick actions**: "Repeat last ride", "Update seats (+/-)", "Mark full"

### 👤 Client Experience
- **Structured request flow**: Buttons + minimal input
- **Smart parsing**: Automatic intent detection, seat/time/phone extraction
- **Group message handling**: Detect intent from group messages, reply with bot deep link

### 🔍 2-Layer Scouting System
- **Layer 1 (Primary)**: Bot-based group monitoring
- **Layer 2 (Fallback)**: Userbot (isolated module, non-critical)

### 🎯 Intelligent Matching
- **Route matching**: Exact and partial location matching
- **Seats availability**: Sufficient seats check
- **Time proximity**: Active driver prioritization
- **Features matching**: Common features boost score
- **Confidence scoring**: ≥4 threshold for valid requests

### 👑 Admin System
- Add/remove keywords
- View active drivers & requests
- Ban/unban users
- Enable/disable scouting
- View statistics

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

Create a `.env` file:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/taksi?schema=public"

# Telegram Bot
BOT_TOKEN="YOUR_BOT_TOKEN_HERE"

# Telegram User Client (for scouting)
API_ID="YOUR_API_ID"
API_HASH="YOUR_API_HASH"
TG_SESSION="" # Leave blank initially

# Admin
SUPERADMIN_TG_ID="YOUR_TELEGRAM_ID"
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) View database
npx prisma studio
```

### 4. Generate TG_SESSION (Optional, for scouting)

Run the interactive script to authenticate a Telegram user account:

```bash
node login.mjs
```

Provide your phone number and OTP when prompted. Copy the resulting session string and paste it into your `.env` file as `TG_SESSION=...`.

### 5. Run the Application

```bash
# Development mode (watch)
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

### Deploy to Remote VPS

```bash
# Using deploy script
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
