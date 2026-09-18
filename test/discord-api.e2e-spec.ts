import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

describe('Discord API REST E2E Integration (Live/Mocked)', () => {
  const token = process.env.DISCORD_TOKEN;
  const isLiveTokenAvailable = Boolean(
    token && token !== 'your_bot_token_here' && token.length > 20,
  );

  const testIfLive = isLiveTokenAvailable ? it : it.skip;

  it('should have Discord API configuration structure defined', () => {
    expect(process.env.DM_ROLE_NAME || 'Dungeon Master').toBe('Dungeon Master');
    expect(typeof (process.env.DISCORD_CLIENT_ID ?? '')).toBe('string');
  });

  describe('Live Discord API Endpoints (runs when valid DISCORD_TOKEN is set)', () => {
    testIfLive(
      'GET /users/@me returns authenticated bot user profile',
      async () => {
        const response = await fetch('https://discord.com/api/v10/users/@me', {
          headers: {
            Authorization: `Bot ${token}`,
            'User-Agent': 'EverReach-E2E-Tests/1.0',
          },
        });

        expect(response.status).toBe(200);
        const data = (await response.json()) as {
          id: string;
          bot?: boolean;
          username: string;
        };
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('username');
        expect(data.bot).toBe(true);
      },
    );

    testIfLive(
      'GET /gateway/bot returns valid websocket gateway URL and session limits',
      async () => {
        const response = await fetch(
          'https://discord.com/api/v10/gateway/bot',
          {
            headers: {
              Authorization: `Bot ${token}`,
              'User-Agent': 'EverReach-E2E-Tests/1.0',
            },
          },
        );

        expect(response.status).toBe(200);
        const data = (await response.json()) as {
          url: string;
          shards: number;
          session_start_limit: { remaining: number };
        };
        expect(data.url).toContain('wss://');
        expect(data.shards).toBeGreaterThanOrEqual(1);
        expect(data.session_start_limit.remaining).toBeGreaterThan(0);
      },
    );

    testIfLive(
      'GET /oauth2/applications/@me returns application information',
      async () => {
        const response = await fetch(
          'https://discord.com/api/v10/oauth2/applications/@me',
          {
            headers: {
              Authorization: `Bot ${token}`,
              'User-Agent': 'EverReach-E2E-Tests/1.0',
            },
          },
        );

        expect(response.status).toBe(200);
        const data = (await response.json()) as { id: string; name: string };
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('name');
      },
    );
  });
});
