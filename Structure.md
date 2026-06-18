# taksi Project Structure

A NestJS backend application organized by domain modules.

## Architecture

### Source Code (src/)
The application is modularized by feature:
- **core/**: Essential core functionality.
- **admin/** & **admin-log/**: Administrative interfaces and logging.
- **driver/** & **driver-post/**: Driver-related logic and postings.
- **ride-order/**: Logic for managing ride requests and orders.
- **user-client/**: Client-facing API logic.
- **location/**: Geospatial or location-based services.
- **bot/**: Integration for bots (e.g., Telegram).
- **prisma/**: Local prisma service or logic.
- **keyword**, **target**, **redirect**, **public-channel**: Utility or specialized modules.

### Configuration
- **prisma/**: Database schema and migrations.
- **nest-cli.json**: NestJS CLI configuration.
- **deploy.sh**: Deployment script for the project.
- **login.mjs**: Likely a utility for authentication or testing logins.

## Key Files
- `src/main.ts`: Application entry point.
- `src/app.module.ts`: Root module orchestrating all feature modules.
- `.env`: Environment variables (do not expose).
