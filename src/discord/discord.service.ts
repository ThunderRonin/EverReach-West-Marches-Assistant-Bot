import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import { DiscordClient } from './discord.client';
import { CommandHandler } from './commands/command.handler';

@Injectable()
export class DiscordService implements OnModuleInit {
  private readonly logger = new Logger(DiscordService.name);
  private rest: REST;

  constructor(
    private readonly discordClient: DiscordClient,
    private readonly configService: ConfigService,
    private readonly commandHandler: CommandHandler,
  ) {
    const token = this.configService.get<string>('DISCORD_TOKEN');
    this.rest = new REST({ version: '10' }).setToken(token);
  }

  async onModuleInit() {
    await this.login();
    await this.registerSlashCommands();
    this.setupInteractionHandling();
  }

  private async login() {
    const token = this.configService.get<string>('DISCORD_TOKEN');
    await this.discordClient.login(token);
  }

  private async registerSlashCommands() {
    try {
      const guildId = this.configService.get<string>('GUILD_ID_DEV');
      const clientId = this.configService.get<string>('DISCORD_CLIENT_ID');

      // Basic commands
      const commands = [
        new SlashCommandBuilder()
          .setName('register')
          .setDescription('Register a new character')
          .addStringOption((option) =>
            option
              .setName('name')
              .setDescription('Character name')
              .setRequired(true),
          ),

        new SlashCommandBuilder()
          .setName('inv')
          .setDescription('View your inventory'),

        new SlashCommandBuilder()
          .setName('shop')
          .setDescription('View the shop catalog'),

        new SlashCommandBuilder()
          .setName('buy')
          .setDescription('Buy an item from the shop')
          .addStringOption((option) =>
            option.setName('key').setDescription('Item key').setRequired(true),
          )
          .addIntegerOption((option) =>
            option
              .setName('qty')
              .setDescription('Quantity')
              .setRequired(true)
              .setMinValue(1),
          ),

        new SlashCommandBuilder()
          .setName('history')
          .setDescription('View your transaction history'),

        // Trade commands
        new SlashCommandBuilder()
          .setName('trade')
          .setDescription('Trade commands')
          .addSubcommand((subcommand) =>
            subcommand
              .setName('start')
              .setDescription('Start a trade with another user')
              .addUserOption((option) =>
                option
                  .setName('user')
                  .setDescription('User to trade with')
                  .setRequired(true),
              ),
          )
          .addSubcommand((subcommand) =>
            subcommand
              .setName('add')
              .setDescription('Add item or gold to your trade offer')
              .addStringOption((option) =>
                option
                  .setName('type')
                  .setDescription('Type of offer')
                  .setRequired(true)
                  .addChoices(
                    { name: 'Item', value: 'item' },
                    { name: 'Gold', value: 'gold' },
                  ),
              )
              .addStringOption((option) =>
                option
                  .setName('key')
                  .setDescription('Item key (for items)')
                  .setRequired(false),
              )
              .addIntegerOption((option) =>
                option
                  .setName('qty')
                  .setDescription('Quantity')
                  .setRequired(true)
                  .setMinValue(1),
              ),
          )
          .addSubcommand((subcommand) =>
            subcommand
              .setName('show')
              .setDescription('Show current pending trade'),
          )
          .addSubcommand((subcommand) =>
            subcommand
              .setName('accept')
              .setDescription('Accept the current trade'),
          ),

        // Auction commands
        new SlashCommandBuilder()
          .setName('auction')
          .setDescription('Auction commands')
          .addSubcommand((subcommand) =>
            subcommand.setName('list').setDescription('List active auctions'),
          )
          .addSubcommand((subcommand) =>
            subcommand
              .setName('create')
              .setDescription('Create a new auction')
              .addStringOption((option) =>
                option
                  .setName('key')
                  .setDescription('Item key')
                  .setRequired(true),
              )
              .addIntegerOption((option) =>
                option
                  .setName('qty')
                  .setDescription('Quantity')
                  .setRequired(true)
                  .setMinValue(1),
              )
              .addIntegerOption((option) =>
                option
                  .setName('min_bid')
                  .setDescription('Minimum bid')
                  .setRequired(true)
                  .setMinValue(1),
              )
              .addIntegerOption((option) =>
                option
                  .setName('minutes')
                  .setDescription('Duration in minutes')
                  .setRequired(true)
                  .setMinValue(1),
              ),
          )
          .addSubcommand((subcommand) =>
            subcommand
              .setName('bid')
              .setDescription('Place a bid on an auction')
              .addIntegerOption((option) =>
                option
                  .setName('auction_id')
                  .setDescription('Auction ID')
                  .setRequired(true)
                  .setMinValue(1),
              )
              .addIntegerOption((option) =>
                option
                  .setName('amount')
                  .setDescription('Bid amount')
                  .setRequired(true)
                  .setMinValue(1),
              ),
          )
          .addSubcommand((subcommand) =>
            subcommand
              .setName('my')
              .setDescription('View your auctions and bids'),
          ),

        // Notes commands
        new SlashCommandBuilder()
          .setName('note')
          .setDescription('Note commands')
          .addSubcommand((subcommand) =>
            subcommand
              .setName('add')
              .setDescription('Add a personal note')
              .addStringOption((option) =>
                option
                  .setName('text')
                  .setDescription('Note text')
                  .setRequired(true),
              ),
          )
          .addSubcommand((subcommand) =>
            subcommand
              .setName('search')
              .setDescription('Search your notes')
              .addStringOption((option) =>
                option
                  .setName('query')
                  .setDescription('Search query')
                  .setRequired(true),
              ),
          ),
      ];

      this.logger.log('Started refreshing application (/) commands.');

      await this.rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commands,
      });

      this.logger.log('Successfully reloaded application (/) commands.');
    } catch (error) {
      this.logger.error('Failed to register slash commands:', error);
    }
  }

  private setupInteractionHandling() {
    this.discordClient.on('interactionCreate', (interaction) => {
      void this.commandHandler.handleInteraction(interaction);
    });
  }

  getClient(): DiscordClient {
    return this.discordClient;
  }
}
