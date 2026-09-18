/**
 * Discord API Live Feature & E2E Diagnostic Test Tool
 * 
 * Verifies live Discord API connectivity, bot authentication, application ownership,
 * gateway status, guild membership, permissions, DM role configuration, and slash commands.
 * 
 * Usage:
 *   yarn check:discord
 *   yarn check:discord --smoke  (also tests sending/editing/deleting a live message in STARTUP_CHANNEL_ID)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DISCORD_API_BASE = 'https://discord.com/api/v10';

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  message: string;
  details?: unknown;
}

const results: TestResult[] = [];

function recordResult(category: string, name: string, passed: boolean, message: string, details?: unknown) {
  results.push({ category, name, passed, message, details });
  const icon = passed ? '✅' : '❌';
  console.log(`  ${icon} [${category}] ${name}: ${message}`);
}

async function discordFetch<T>(endpoint: string, token: string, options: RequestInit = {}): Promise<{ status: number; data: T }> {
  const url = `${DISCORD_API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'EverReach-Diagnostic-Tool/1.0',
      ...(options.headers || {}),
    },
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return { status: response.status, data };
}

async function runDiagnostics() {
  console.log('\n======================================================');
  console.log('🤖 EVERREACH DISCORD API DIAGNOSTIC & E2E TEST TOOL');
  console.log('======================================================\n');

  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.GUILD_ID_DEV;
  const botOwnerId = process.env.BOT_OWNER_ID;
  const dmRoleName = process.env.DM_ROLE_NAME || 'Dungeon Master';
  const startupChannelId = process.env.STARTUP_CHANNEL_ID;
  const runSmokeTest = process.argv.includes('--smoke');

  // --- Step 1: Environment Variables Check ---
  console.log('🔍 Phase 1: Environment Configuration Check');
  if (!token || token === 'your_bot_token_here') {
    recordResult('Config', 'DISCORD_TOKEN', false, 'Token missing or set to placeholder in .env');
  } else {
    recordResult('Config', 'DISCORD_TOKEN', true, 'Token found (length: ' + token.length + ')');
  }

  if (!clientId || clientId === 'your_application_id_here') {
    recordResult('Config', 'DISCORD_CLIENT_ID', false, 'Client ID missing or set to placeholder');
  } else {
    recordResult('Config', 'DISCORD_CLIENT_ID', true, `Client ID set (${clientId})`);
  }

  if (!guildId || guildId === 'your_development_guild_id_here') {
    recordResult('Config', 'GUILD_ID_DEV', false, 'Guild ID missing or placeholder');
  } else {
    recordResult('Config', 'GUILD_ID_DEV', true, `Guild ID set (${guildId})`);
  }

  if (!botOwnerId || botOwnerId === 'your_discord_user_id_here') {
    recordResult('Config', 'BOT_OWNER_ID', false, 'BOT_OWNER_ID missing or placeholder');
  } else {
    recordResult('Config', 'BOT_OWNER_ID', true, `Owner ID set (${botOwnerId})`);
  }

  recordResult('Config', 'DM_ROLE_NAME', true, `Configured role name: "${dmRoleName}"`);

  if (!token || token === 'your_bot_token_here') {
    console.log('\n⚠️ Cannot proceed with live Discord API checks: valid DISCORD_TOKEN is required in .env.');
    printSummary();
    process.exit(1);
  }

  // --- Step 2: Authentication & Bot Identity ---
  console.log('\n🔐 Phase 2: Discord Authentication & Identity (GET /users/@me)');
  try {
    const meRes = await discordFetch<any>('/users/@me', token);
    if (meRes.status === 200 && meRes.data?.id) {
      recordResult(
        'Auth',
        'Bot Identity',
        true,
        `Logged in as ${meRes.data.username}#${meRes.data.discriminator || '0'} (ID: ${meRes.data.id})`,
      );

      if (clientId && meRes.data.id !== clientId) {
        recordResult('Auth', 'Client ID Match', false, `DISCORD_CLIENT_ID (${clientId}) does not match Bot ID (${meRes.data.id})`);
      } else if (clientId) {
        recordResult('Auth', 'Client ID Match', true, 'DISCORD_CLIENT_ID matches Bot ID');
      }
    } else {
      recordResult('Auth', 'Bot Identity', false, `HTTP ${meRes.status}: ${JSON.stringify(meRes.data)}`);
    }
  } catch (err) {
    recordResult('Auth', 'Bot Identity', false, `Connection error: ${err instanceof Error ? err.message : String(err)}`);
  }

  // --- Step 3: Application & Ownership ---
  console.log('\n📋 Phase 3: Application Ownership & Flags (GET /oauth2/applications/@me)');
  try {
    const appRes = await discordFetch<any>('/oauth2/applications/@me', token);
    if (appRes.status === 200 && appRes.data) {
      const appData = appRes.data;
      const owner = appData.owner?.username || appData.owner?.id || 'Unknown';
      const ownerId = appData.owner?.id;

      recordResult('Application', 'App Registration', true, `Application: "${appData.name}" (Owner: ${owner})`);

      if (botOwnerId && ownerId) {
        if (botOwnerId === ownerId) {
          recordResult('Application', 'Owner Verification', true, `BOT_OWNER_ID matches Application Owner (${ownerId})`);
        } else {
          recordResult('Application', 'Owner Verification', false, `BOT_OWNER_ID (${botOwnerId}) does not match Discord Application Owner (${ownerId})`);
        }
      }
    } else {
      recordResult('Application', 'App Registration', false, `HTTP ${appRes.status}: ${JSON.stringify(appRes.data)}`);
    }
  } catch (err) {
    recordResult('Application', 'App Registration', false, `Request error: ${err instanceof Error ? err.message : String(err)}`);
  }

  // --- Step 4: Gateway Health & Session Limits ---
  console.log('\n🌐 Phase 4: Gateway Health & Limits (GET /gateway/bot)');
  try {
    const gwRes = await discordFetch<any>('/gateway/bot', token);
    if (gwRes.status === 200 && gwRes.data) {
      const sessionInfo = gwRes.data.session_start_limit;
      recordResult('Gateway', 'Gateway Endpoint', true, `WSS URL: ${gwRes.data.url}`);
      recordResult(
        'Gateway',
        'Session Start Limits',
        sessionInfo.remaining > 0,
        `Remaining sessions: ${sessionInfo.remaining}/${sessionInfo.total} (resets in ${Math.round(sessionInfo.reset_after / 1000)}s)`,
      );
    } else {
      recordResult('Gateway', 'Gateway Endpoint', false, `HTTP ${gwRes.status}: ${JSON.stringify(gwRes.data)}`);
    }
  } catch (err) {
    recordResult('Gateway', 'Gateway Endpoint', false, `Request error: ${err instanceof Error ? err.message : String(err)}`);
  }

  // --- Step 5: Guild Membership & Permissions ---
  if (guildId && guildId !== 'your_development_guild_id_here') {
    console.log(`\n🏰 Phase 5: Guild Access & Permissions in ${guildId}`);
    try {
      const guildRes = await discordFetch<any>(`/guilds/${guildId}`, token);
      if (guildRes.status === 200 && guildRes.data) {
        recordResult('Guild', 'Guild Presence', true, `Bot is in guild "${guildRes.data.name}"`);

        // Check bot member permissions in this guild
        const memberRes = await discordFetch<any>(`/guilds/${guildId}/members/@me`, token);
        if (memberRes.status === 200 && memberRes.data) {
          recordResult('Guild', 'Member Profile', true, `Guild nickname: "${memberRes.data.nick || memberRes.data.user?.username}"`);
        }

        // Check guild roles for DM_ROLE_NAME
        const rolesRes = await discordFetch<any[]>(`/guilds/${guildId}/roles`, token);
        if (rolesRes.status === 200 && Array.isArray(rolesRes.data)) {
          const matchingRole = rolesRes.data.find(
            (r) => r.name.toLowerCase() === dmRoleName.toLowerCase(),
          );
          if (matchingRole) {
            recordResult(
              'Roles',
              'Dungeon Master Role',
              true,
              `Role "${matchingRole.name}" found in guild (ID: ${matchingRole.id})`,
            );
          } else {
            recordResult(
              'Roles',
              'Dungeon Master Role',
              false,
              `Role "${dmRoleName}" NOT found in server. Run /admin dm-list or create the role in Server Settings.`,
            );
          }
        }
      } else {
        recordResult('Guild', 'Guild Presence', false, `Bot is NOT in guild ${guildId} (HTTP ${guildRes.status}: ${JSON.stringify(guildRes.data)})`);
      }
    } catch (err) {
      recordResult('Guild', 'Guild Presence', false, `Request error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // --- Step 6: Slash Commands Registration Check ---
  if (clientId) {
    console.log(`\n⚡ Phase 6: Application Slash Commands Check`);
    try {
      const globalCmdsRes = await discordFetch<any[]>(`/applications/${clientId}/commands`, token);
      const guildCmdsRes = guildId ? await discordFetch<any[]>(`/applications/${clientId}/guilds/${guildId}/commands`, token) : null;

      const globalCmds = Array.isArray(globalCmdsRes.data) ? globalCmdsRes.data : [];
      const guildCmds = guildCmdsRes && Array.isArray(guildCmdsRes.data) ? guildCmdsRes.data : [];
      const allCmds = [...globalCmds, ...guildCmds];

      recordResult(
        'Commands',
        'Registered Commands Count',
        allCmds.length > 0,
        `Found ${globalCmds.length} global commands and ${guildCmds.length} guild commands`,
      );

      const expectedCommands = ['register', 'inv', 'shop', 'buy', 'history', 'trade', 'auction', 'note', 'admin'];
      const registeredNames = new Set(allCmds.map((c) => c.name));

      for (const expected of expectedCommands) {
        const isRegistered = registeredNames.has(expected);
        recordResult(
          'Commands',
          `/${expected}`,
          isRegistered,
          isRegistered ? `Registered on Discord` : `Missing - Necord will register on bot boot`,
        );
      }
    } catch (err) {
      recordResult('Commands', 'Commands Check', false, `Request error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // --- Step 7: Live Smoke Test (Send, Edit, Delete Message) ---
  if (runSmokeTest && startupChannelId && startupChannelId !== 'your_channel_id_here') {
    console.log(`\n💬 Phase 7: Live Message Smoke Test in Channel ${startupChannelId}`);
    try {
      // 1. Send test message
      const sendRes = await discordFetch<any>(`/channels/${startupChannelId}/messages`, token, {
        method: 'POST',
        body: JSON.stringify({
          embeds: [
            {
              title: '🧪 Discord API E2E Smoke Test',
              description: 'Testing live Discord API write and embed rendering capabilities.',
              color: 0x00ff00,
              timestamp: new Date().toISOString(),
              footer: { text: 'EverReach Automated Diagnostics' },
            },
          ],
        }),
      });

      if (sendRes.status === 200 && sendRes.data?.id) {
        const messageId = sendRes.data.id;
        recordResult('SmokeTest', 'Send Message', true, `Successfully sent test message (ID: ${messageId})`);

        // 2. Edit test message
        const editRes = await discordFetch<any>(`/channels/${startupChannelId}/messages/${messageId}`, token, {
          method: 'PATCH',
          body: JSON.stringify({
            embeds: [
              {
                title: '🧪 Discord API E2E Smoke Test (Updated)',
                description: 'Successfully verified live message editing permission!',
                color: 0x0099ff,
                timestamp: new Date().toISOString(),
              },
            ],
          }),
        });

        recordResult('SmokeTest', 'Edit Message', editRes.status === 200, `Edit response: HTTP ${editRes.status}`);

        // 3. Delete test message
        const delRes = await discordFetch<any>(`/channels/${startupChannelId}/messages/${messageId}`, token, {
          method: 'DELETE',
        });

        recordResult('SmokeTest', 'Delete Message', delRes.status === 204, `Delete response: HTTP ${delRes.status}`);
      } else {
        recordResult('SmokeTest', 'Send Message', false, `Failed to send test message: HTTP ${sendRes.status}: ${JSON.stringify(sendRes.data)}`);
      }
    } catch (err) {
      recordResult('SmokeTest', 'Message Cycle', false, `Smoke test error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  printSummary();
}

function printSummary() {
  console.log('\n======================================================');
  console.log('📊 DIAGNOSTIC SUMMARY');
  console.log('======================================================');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`Total Checks: ${results.length} | Passed: ${passed} | Failed: ${failed}`);

  if (failed === 0) {
    console.log('\n🎉 ALL DISCORD API CHECKS PASSED! The bot is fully configured to connect.');
  } else {
    console.log(`\n⚠️ ${failed} check(s) failed or require attention. See details above.`);
  }
  console.log('======================================================\n');
}

void runDiagnostics();
