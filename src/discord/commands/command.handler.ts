import { Injectable, Logger } from '@nestjs/common';
import { ChatInputCommandInteraction, Interaction } from 'discord.js';
import { RegisterCommand } from './register.command';
import { InvCommand } from './inv.command';
import { ShopCommand } from './shop.command';
import { BuyCommand } from './buy.command';
import { HistoryCommand } from './history.command';
import { TradeStartCommand } from './trade-start.command';
import { TradeAddCommand } from './trade-add.command';
import { TradeShowCommand } from './trade-show.command';
import { TradeAcceptCommand } from './trade-accept.command';
import { AuctionListCommand } from './auction-list.command';
import { AuctionCreateCommand } from './auction-create.command';
import { AuctionBidCommand } from './auction-bid.command';
import { AuctionMyCommand } from './auction-my.command';
import { NoteAddCommand } from './note-add.command';
import { NoteSearchCommand } from './note-search.command';

type SlashCommandExecutor = {
  execute(interaction: ChatInputCommandInteraction): Promise<unknown>;
};

type CommandGroup = Record<string, SlashCommandExecutor>;

type CommandEntry = SlashCommandExecutor | CommandGroup;

@Injectable()
export class CommandHandler {
  private readonly logger = new Logger(CommandHandler.name);

  private readonly commands = new Map<string, CommandEntry>();

  constructor(
    private readonly registerCommand: RegisterCommand,
    private readonly invCommand: InvCommand,
    private readonly shopCommand: ShopCommand,
    private readonly buyCommand: BuyCommand,
    private readonly historyCommand: HistoryCommand,
    private readonly tradeStartCommand: TradeStartCommand,
    private readonly tradeAddCommand: TradeAddCommand,
    private readonly tradeShowCommand: TradeShowCommand,
    private readonly tradeAcceptCommand: TradeAcceptCommand,
    private readonly auctionListCommand: AuctionListCommand,
    private readonly auctionCreateCommand: AuctionCreateCommand,
    private readonly auctionBidCommand: AuctionBidCommand,
    private readonly auctionMyCommand: AuctionMyCommand,
    private readonly noteAddCommand: NoteAddCommand,
    private readonly noteSearchCommand: NoteSearchCommand,
  ) {
    // Map command names to command instances
    this.commands.set('register', registerCommand);
    this.commands.set('inv', invCommand);
    this.commands.set('shop', shopCommand);
    this.commands.set('buy', buyCommand);
    this.commands.set('history', historyCommand);
    this.commands.set('trade', {
      start: tradeStartCommand,
      add: tradeAddCommand,
      show: tradeShowCommand,
      accept: tradeAcceptCommand,
    });
    this.commands.set('auction', {
      list: auctionListCommand,
      create: auctionCreateCommand,
      bid: auctionBidCommand,
      my: auctionMyCommand,
    });
    this.commands.set('note', {
      add: noteAddCommand,
      search: noteSearchCommand,
    });
  }

  async handleInteraction(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;

    try {
      const { commandName, options } = interaction;
      const entry = this.commands.get(commandName);
      let command: SlashCommandExecutor | undefined;

      if (!entry) {
        this.logger.warn(`Unknown command: ${commandName}`);
        return interaction.reply({
          content: 'Unknown command. Please try again.',
          ephemeral: true,
        });
      }

      if (this.isCommandGroup(entry)) {
        const subcommand = options.getSubcommand();
        command = entry[subcommand];
      } else {
        command = entry;
      }

      if (!command) {
        this.logger.warn(`Unknown command: ${commandName}`);
        return interaction.reply({
          content: 'Unknown command. Please try again.',
          ephemeral: true,
        });
      }

      await command.execute(interaction);
    } catch (error) {
      this.logger.error('Error handling interaction:', error);

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'An unexpected error occurred. Please try again.',
          ephemeral: true,
        });
      }
    }
  }

  private isCommandGroup(entry: CommandEntry): entry is CommandGroup {
    return !('execute' in entry);
  }
}
