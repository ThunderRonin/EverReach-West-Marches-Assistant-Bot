import { IntentsBitField } from 'discord.js';
import { NecordModuleOptions } from 'necord';

export const necordConfig = (): NecordModuleOptions => {
  const token = process.env.DISCORD_TOKEN;

  if (!token) {
    throw new Error('DISCORD_TOKEN environment variable is required');
  }

  const guildId = process.env.GUILD_ID_DEV;

  return {
    token,
    intents: [
      IntentsBitField.Flags.Guilds,
      IntentsBitField.Flags.GuildMessages,
      IntentsBitField.Flags.MessageContent,
    ],
    development: guildId ? [guildId] : undefined,
  };
};
