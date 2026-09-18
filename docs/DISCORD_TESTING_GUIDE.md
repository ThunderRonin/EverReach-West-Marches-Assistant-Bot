# Discord Bot & API Testing Guide

**Project**: EverReach West Marches Assistant  
**Architecture**: NestJS 10 + Necord + Discord.js v14 + Prisma/PostgreSQL  
**Version**: 2.0  

---

## 🎯 Overview

Testing modern Discord bots (specifically **Discord.js v14** with **Application Slash Commands**) requires a multi-layered testing strategy. Because Discord does not provide an official offline local emulator, this project implements a two-pillar testing architecture:

1. **Option 4: In-Memory Mock Testing (Jest + Necord Contexts)** — Fast, deterministic, completely offline, zero rate limits, runs on every commit/CI pipeline.
2. **Option 3: Automated E2E Discord API Diagnostic Tool (`yarn check:discord`)** — Live validation against Discord REST API v10, checking authentication, gateway status, guild permissions, role hierarchy, and registered slash command schemas.

---

## 🏗️ Architecture Matrix

| Strategy | Target | Network | Speed | Command |
|---|---|---|---|---|
| **Unit / Mock Testing** | Commands, Guards, Filters, Services | Offline (Mocked) | ~2.0s (164 tests) | `yarn test` |
| **Code Quality & Typing** | Linter & Typechecking | Offline | ~5.0s | `yarn lint` |
| **Build Verification** | NestJS Compilation | Offline | ~3.0s | `yarn build` |
| **API Diagnostic & E2E** | Live Discord API v10, Gateway, Guild, Roles | Discord API (HTTP) | ~1.5s | `yarn check:discord` |
| **Live Smoke Test** | Real Message Send, Edit, & Delete Cycle | Discord API (HTTP) | ~2.5s | `yarn check:discord --smoke` |
| **REST E2E Suite** | Live Discord REST Endpoints in Jest | Discord API (HTTP) | ~0.5s | `yarn test:e2e` |

---

## 🧪 Option 4: Mock Interaction Testing (Jest + Necord)

### 1. Mock Factory (`src/discord/testing/discord-mock.factory.ts`)
Located in [`src/discord/testing/discord-mock.factory.ts`](file:///home/allmaker/projects/EverReach-West-Marches-Assistant-Bot/src/discord/testing/discord-mock.factory.ts), this utility provides helper functions to simulate any Discord interaction without launching Discord.js:

* `createMockInteraction(options)`: Generates a typed `CommandInteraction` with mocked `reply`, `deferReply`, `editReply`, `options`, `guild`, `member`, and `channel`.
* `createMockExecutionContext(interaction)`: Wraps a mock interaction in a NestJS `ExecutionContext` so Necord guards and interceptors can be tested directly.
* `createMockGuildMember(options)`: Simulates guild members with a Discord.js `Collection` of roles.
* `createMockGuild(id, name)`: Simulates a Discord guild with members and roles caches.
* `createMockUser(options)`: Simulates user tags, IDs, and bot flags.

### 2. Test Suites Implemented
The repository includes unit and integration tests for all Discord interactions:

* **Guards**:
  * [`src/discord/guards/dungeon-master.guard.spec.ts`](file:///home/allmaker/projects/EverReach-West-Marches-Assistant-Bot/src/discord/guards/dungeon-master.guard.spec.ts): Verifies bot owner bypass in guilds and DMs, case-insensitive DM role verification, and access denial embeds.
  * [`src/discord/guards/character-exists.guard.spec.ts`](file:///home/allmaker/projects/EverReach-West-Marches-Assistant-Bot/src/discord/guards/character-exists.guard.spec.ts): Verifies registered character lookups, request attachment, and missing registration exceptions.
* **Commands**:
  * [`src/discord/commands/admin.commands.spec.ts`](file:///home/allmaker/projects/EverReach-West-Marches-Assistant-Bot/src/discord/commands/admin.commands.spec.ts): Tests `/admin item-add`, `item-update`, `item-delete`, `item-list`, and `dm-list`.
  * [`src/discord/commands/user.commands.spec.ts`](file:///home/allmaker/projects/EverReach-West-Marches-Assistant-Bot/src/discord/commands/user.commands.spec.ts): Tests `/register`, `/inv`, and `/history`.
  * [`src/discord/commands/note.commands.spec.ts`](file:///home/allmaker/projects/EverReach-West-Marches-Assistant-Bot/src/discord/commands/note.commands.spec.ts): Tests `/note add`, `list`, `search`, and `delete`.
  * [`src/discord/commands/trade.commands.spec.ts`](file:///home/allmaker/projects/EverReach-West-Marches-Assistant-Bot/src/discord/commands/trade.commands.spec.ts): Tests `/trade start` and `/trade cancel`.
* **Exception Filters**:
  * [`src/core/errors/domain-error.filter.spec.ts`](file:///home/allmaker/projects/EverReach-West-Marches-Assistant-Bot/src/core/errors/domain-error.filter.spec.ts): Tests `DomainErrorFilter` and `GlobalExceptionFilter` converting exceptions into formatted Discord embeds.

### 3. Running Unit Tests
```bash
# Run all unit and integration tests (164 tests across 14 suites)
yarn test

# Run tests with coverage report
yarn test:cov

# Run specific suite
npx jest src/discord/guards/dungeon-master.guard.spec.ts
```

---

## 🌐 Option 3: Automated E2E Discord API Diagnostic Tool

### 1. The Tool (`scripts/discord-api-test.ts`)
Located in [`scripts/discord-api-test.ts`](file:///home/allmaker/projects/EverReach-West-Marches-Assistant-Bot/scripts/discord-api-test.ts), this tool talks directly to Discord REST API v10 to inspect and validate your bot environment:

#### Checks Performed:
1. **Phase 1: Environment Configuration**
   - Validates presence and formatting of `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `GUILD_ID_DEV`, `BOT_OWNER_ID`, and `DM_ROLE_NAME`.
2. **Phase 2: Authentication & Identity (`GET /users/@me`)**
   - Validates bot token with Discord.
   - Displays bot username, tag, verified status, and verifies Client ID match.
3. **Phase 3: Application & Ownership (`GET /oauth2/applications/@me`)**
   - Checks application name, flags, and matches `BOT_OWNER_ID` against Discord's application owner.
4. **Phase 4: Gateway Health & Session Limits (`GET /gateway/bot`)**
   - Retrieves live WSS gateway URL and remaining session start limits.
5. **Phase 5: Guild Access & Roles (`GET /guilds/{guildId}`)**
   - Checks if bot is a member of the server.
   - Inspects guild roles for `DM_ROLE_NAME` (e.g., "Dungeon Master").
6. **Phase 6: Slash Commands Validation (`GET /applications/{appId}/commands`)**
   - Inspects both global and guild-registered slash commands.
   - Cross-references deployed commands against expected commands (`register`, `inv`, `shop`, `buy`, `history`, `trade`, `auction`, `note`, `admin`).
7. **Phase 7: Live Channel Message Smoke Test (`--smoke`)**
   - Sends a test embed to `STARTUP_CHANNEL_ID`.
   - Edits the message to confirm edit permissions.
   - Deletes the message to clean up.

### 2. Running the Diagnostic Tool
```bash
# Standard diagnostic check (Phases 1-6)
yarn check:discord

# Diagnostic check + Live channel message cycle (Phases 1-7)
yarn check:discord --smoke
```

---

## 🔍 Interactive API Exploration (Postman / Bruno / OpenAPI)

For inspecting Discord REST endpoints interactively or testing raw payloads:

1. **Official OpenAPI Specification**:
   Download the official specification maintained by Discord:
   👉 **[`discord/discord-api-spec`](https://github.com/discord/discord-api-spec)**
2. **Import into Postman or Bruno**:
   - Open Postman or Bruno.
   - Click **Import** and select the OpenAPI `openapi.json`.
   - Set Header: `Authorization: Bot <YOUR_DISCORD_TOKEN>`.
3. **Endpoints to inspect**:
   - `GET /users/@me` — Bot profile
   - `GET /gateway/bot` — Gateway status
   - `GET /applications/{client_id}/guilds/{guild_id}/commands` — Live slash commands

---

## 📌 Why Corde is Deprecated for Discord.js v14

Historical Discord bot testing tutorials often reference **Corde** (`cordejs/corde`). It is important to note why Corde is not used in this project:

1. **Legacy Architecture**: Corde relies on `discord.js v12` (from 2020) and legacy message-based commands (`!command`).
2. **Slash Commands Incompatibility**: Modern Discord bots (including Necord) use Discord API v10 Application (Slash) Commands. Discord does not allow bot accounts to trigger slash commands of other bots via the API.
3. **Abandonment**: Corde was last published in November 2022 and does not support Discord.js v14 or modern Gateway intents.

**The Solution**: This repository's combination of **in-memory mock interaction tests** (`yarn test`) + **live REST API diagnostic smoke tests** (`yarn check:discord`) provides 100% test coverage without breaking compatibility or risking API bans.
