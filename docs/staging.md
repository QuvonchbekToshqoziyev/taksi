# Isolated Telegram staging

Staging uses its own service, Linux user, database, bot, Telegram user session,
users and groups. Production data and Telegram identities are never reused
except for an explicitly allowed shared superadmin.

## Telegram setup

Create these test-only identities and chats:

1. A new BotFather bot, for example `taksi_fargona_test_bot`.
2. A dedicated Telegram user account for userbot scouting.
3. Test admin, client and driver accounts. Put every ID in
   `STAGING_ALLOWED_USER_IDS`. To intentionally share only the production
   superadmin, set `STAGING_ALLOW_PRODUCTION_SUPERADMIN=true`; other users stay
   test-only.
4. Four test chats:
   - **STG Mixed Requests** — clients and drivers may write; configure as `TargetGroup`.
   - **STG Priority Drivers** — private insider chat; configure as `RedirectGroup`.
   - **STG Taxi Offers** — test drivers may write; configure as `PublicChannel` if ads are published there.
   - **STG Ads** — only admins and the staging bot may post; configure as `PublicChannel`.

Add the staging bot only to these chats. Add the staging userbot account to the
mixed request chat. The allowed staging superadmin can send `/getid` in a new
test chat before its ID is added to `STAGING_ALLOWED_CHAT_IDS`.

## Server layout

| Resource | Production | Staging |
|---|---|---|
| Service | `taxi-bot` | `taxi-bot-staging` |
| App directory | `/opt/taxi-bot` | `/opt/taxi-bot-staging` |
| Linux user | `taxi-bot` | `taxi-bot-staging` |
| Database | `taksi` | `taksi_staging` |
| Environment | `/opt/taxi-bot/.env` | `/opt/taxi-bot-staging/.env` |

Create the staging environment from `.env.staging.example`, then deploy as
root with:

```bash
/opt/taxi-bot-staging/deploy-staging.sh
```

The wrapper refuses a production database URL, bot token or userbot session.
Application-level allowlists also ignore unlisted users/groups and prevent
unlisted Telegram destinations from being saved or used.

## Workflow test

1. Register a test driver and approve them from the staging admin bot.
2. Post a ride request in **STG Mixed Requests**.
3. Confirm one numbered request appears in **STG Priority Drivers**.
4. Reply `olindi` as the approved test driver and confirm only the first claim wins.
5. Create a driver ad and confirm it appears only in staging offer/ad chats.
6. Close the ad and confirm every staging copy is removed.
7. Confirm production chats and production database counts did not change.
