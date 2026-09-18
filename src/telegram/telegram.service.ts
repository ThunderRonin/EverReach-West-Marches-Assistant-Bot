import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Context } from 'telegraf';
import { UsersService } from '../users/users.service';
import { EconomyService } from '../economy/economy.service';
import { NotesService } from '../notes/notes.service';
import { TxLogPayloadSchema } from '../config/validation.schemas';
import {
  ItemNotFoundError,
  InsufficientGoldError,
  CharacterNotFoundError,
} from '../core/errors/errors';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot?: Telegraf;
  private defaultGuildId: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly economyService: EconomyService,
    private readonly notesService: NotesService,
  ) {
    this.defaultGuildId =
      this.configService.get<string>('GUILD_ID_DEV') ||
      this.configService.get<string>('DEFAULT_GUILD_ID') ||
      '1421474959154221148';
  }

  onModuleInit() {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      this.logger.warn(
        '⚠️ TELEGRAM_BOT_TOKEN is not configured in .env. Telegram bot is disabled.',
      );
      return;
    }

    try {
      this.bot = new Telegraf(token);
      this.registerHandlers();

      // Launch in background
      this.bot
        .launch({ dropPendingUpdates: true })
        .then(() => {
          this.logger.log(
            '✅ Telegram bot successfully connected and listening for updates',
          );
        })
        .catch((err) => {
          this.logger.error('❌ Failed to start Telegram bot:', err);
        });
    } catch (error) {
      this.logger.error('Failed to initialize Telegram bot:', error);
    }
  }

  onModuleDestroy() {
    if (this.bot) {
      this.logger.log('🛑 Stopping Telegram bot...');
      this.bot.stop('SIGTERM');
    }
  }

  /**
   * Helper to retrieve character for Telegram user, or send warning if missing
   */
  private async getActiveCharacter(ctx: Context) {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return null;

    const user = await this.usersService.getUserByTelegramId(telegramId);
    if (!user || !user.character) {
      await ctx.reply(
        '⚠️ <b>No Character Found!</b>\n\n' +
          'You do not have an active character yet. You can:\n' +
          '• Create one now: <code>/register &lt;CharacterName&gt;</code>\n' +
          '• Or link your Discord character: <code>/link &lt;code&gt;</code> (Get the code by typing <code>/link</code> on Discord!)',
        { parse_mode: 'HTML' },
      );
      return null;
    }

    return { user, character: user.character };
  }

  private registerHandlers() {
    if (!this.bot) return;

    // Start command
    this.bot.command('start', async (ctx) => {
      const name = ctx.from.first_name || 'Adventurer';
      await ctx.reply(
        `⚔️ <b>Welcome to EverReach West Marches, ${name}!</b>\n\n` +
          `EverReach is a living West Marches D&D world shared in real-time with Discord.\n\n` +
          `<b>Available Commands:</b>\n` +
          `• <code>/register &lt;name&gt;</code> — Create a new character\n` +
          `• <code>/inv</code> — View character sheet, gold & inventory\n` +
          `• <code>/shop</code> — Browse available merchant items\n` +
          `• <code>/buy &lt;item_key&gt; [qty]</code> — Purchase an item\n` +
          `• <code>/history</code> — View your transaction ledger\n` +
          `• <code>/note &lt;text&gt;</code> — Add a campaign journal note\n` +
          `• <code>/notes [query]</code> — Search or list campaign notes\n` +
          `• <code>/link &lt;code&gt;</code> — Link with your Discord account\n` +
          `• <code>/whoami</code> — View account linkage status\n` +
          `• <code>/help</code> — Detailed help menu`,
        { parse_mode: 'HTML' },
      );
    });

    // Help command
    this.bot.command('help', async (ctx) => {
      await ctx.reply(
        `📖 <b>EverReach Bot Commands Guide</b>\n\n` +
          `<b>Character Management:</b>\n` +
          `• <code>/register &lt;name&gt;</code> - Create a character with starting gold\n` +
          `• <code>/link &lt;code&gt;</code> - Link to your existing Discord character\n` +
          `• <code>/whoami</code> - Check linked IDs\n\n` +
          `<b>Economy & Inventory:</b>\n` +
          `• <code>/inv</code> - Check your items and gold\n` +
          `• <code>/shop</code> - See what items are in stock\n` +
          `• <code>/buy vorpal_sword 1</code> - Buy an item from the shop\n` +
          `• <code>/history</code> - Review your last 10 transactions\n\n` +
          `<b>Campaign Notes:</b>\n` +
          `• <code>/note Found a hidden passage behind the waterfall</code> - Save note\n` +
          `• <code>/notes waterfall</code> - Search notes using semantic & keyword search`,
        { parse_mode: 'HTML' },
      );
    });

    // Register command
    this.bot.command('register', async (ctx) => {
      const telegramId = ctx.from?.id.toString();
      if (!telegramId) return;

      const args = ctx.message.text.split(' ').slice(1).join(' ').trim();
      if (!args) {
        return ctx.reply(
          '⚠️ Please specify a character name.\nExample: <code>/register Eldrin Sunstrider</code>',
          { parse_mode: 'HTML' },
        );
      }

      try {
        const existing =
          await this.usersService.getUserByTelegramId(telegramId);
        if (existing?.character) {
          return ctx.reply(
            `You already have an active character named <b>${existing.character.name}</b> (Gold: ${existing.character.gold})!`,
            { parse_mode: 'HTML' },
          );
        }

        const user = await this.usersService.findOrCreateTelegramUser(
          telegramId,
          this.defaultGuildId,
          args,
        );

        return ctx.reply(
          `🎉 <b>Character Created!</b>\n\n` +
            `Welcome to the realm, <b>${user?.character?.name}</b>!\n` +
            `• Starting Gold: <b>${user?.character?.gold}</b>\n` +
            `• Type <code>/inv</code> to see your inventory\n` +
            `• Type <code>/shop</code> to visit the merchant`,
          { parse_mode: 'HTML' },
        );
      } catch (error) {
        this.logger.error('Error in /register:', error);
        return ctx.reply('❌ An error occurred while creating your character.');
      }
    });

    // Account Link command
    this.bot.command('link', async (ctx) => {
      const telegramId = ctx.from?.id.toString();
      if (!telegramId) return;

      const args = ctx.message.text.split(' ').slice(1).join(' ').trim();
      if (!args) {
        return ctx.reply(
          '🔗 <b>Account Linking</b>\n\n' +
            'To link your Discord character to Telegram:\n' +
            '1. Go to Discord and type <code>/link</code>\n' +
            '2. Copy the 6-digit code provided\n' +
            '3. Send <code>/link &lt;code&gt;</code> here!\n\n' +
            'Example: <code>/link 849201</code>',
          { parse_mode: 'HTML' },
        );
      }

      try {
        const result = await this.usersService.linkTelegramWithCode(
          telegramId,
          args,
        );
        if (!result.success) {
          return ctx.reply(`❌ ${result.error || 'Failed to link account.'}`);
        }

        const charName = result.user?.character?.name || 'your character';
        return ctx.reply(
          `🎉 <b>Account Linked Successfully!</b>\n\n` +
            `Your Telegram account is now connected to <b>${charName}</b>!\n` +
            `All inventory, gold, and notes are now synchronized in real-time between Discord and Telegram.\n\n` +
            `Type <code>/inv</code> to inspect your character sheet!`,
          { parse_mode: 'HTML' },
        );
      } catch (error) {
        this.logger.error('Error linking account:', error);
        return ctx.reply(
          '❌ Failed to process linking code. Please try again.',
        );
      }
    });

    // Whoami command
    this.bot.command('whoami', async (ctx) => {
      const telegramId = ctx.from?.id.toString();
      if (!telegramId) return;

      const user = await this.usersService.getUserByTelegramId(telegramId);
      if (!user) {
        return ctx.reply(
          'You are not registered in the system yet. Type <code>/register &lt;name&gt;</code>.',
          {
            parse_mode: 'HTML',
          },
        );
      }

      const discordStatus = user.discordId
        ? `Linked (ID: <code>${user.discordId}</code>)`
        : 'Not linked (Use <code>/link &lt;code&gt;</code> from Discord)';

      return ctx.reply(
        `👤 <b>Account Profile:</b>\n\n` +
          `• <b>Telegram ID:</b> <code>${user.telegramId}</code>\n` +
          `• <b>Discord:</b> ${discordStatus}\n` +
          `• <b>Character:</b> ${user.character ? `<b>${user.character.name}</b> (Gold: ${user.character.gold})` : 'None'}\n` +
          `• <b>Created:</b> ${new Date(user.createdAt).toLocaleDateString()}`,
        { parse_mode: 'HTML' },
      );
    });

    // Inventory command
    this.bot.command('inv', async (ctx) => {
      const active = await this.getActiveCharacter(ctx);
      if (!active) return;

      const { character } = active;
      const inventory = await this.economyService.getCharacterInventory(
        character.id,
      );

      let itemsText =
        '<i>Your backpack is empty. Visit /shop to buy equipment!</i>';
      if (inventory.length > 0) {
        itemsText = inventory
          .map(
            (inv, index) =>
              `${index + 1}. <b>${inv.item.name}</b> x${inv.qty} ` +
              `(Base: ${inv.item.baseValue}g)`,
          )
          .join('\n');
      }

      await ctx.reply(
        `🛡️ <b>${character.name}'s Character Sheet</b>\n\n` +
          `💰 <b>Gold:</b> ${character.gold} gp\n` +
          `🎒 <b>Inventory Items:</b> (${inventory.length})\n\n` +
          `${itemsText}`,
        { parse_mode: 'HTML' },
      );
    });

    // Shop command
    this.bot.command('shop', async (ctx) => {
      const items = await this.economyService.getAllItems();
      if (items.length === 0) {
        return ctx.reply('🏪 The shop has no items available right now.');
      }

      const shopList = items
        .map(
          (item) =>
            `• <b>${item.name}</b> — <code>${item.baseValue}g</code>\n` +
            `   Key: <code>${item.key}</code>`,
        )
        .join('\n\n');

      await ctx.reply(
        `🏪 <b>EverReach Merchant Store</b>\n\n` +
          `${shopList}\n\n` +
          `<i>To purchase an item, use:</i>\n<code>/buy &lt;item_key&gt; [quantity]</code>`,
        { parse_mode: 'HTML' },
      );
    });

    // Buy command
    this.bot.command('buy', async (ctx) => {
      const active = await this.getActiveCharacter(ctx);
      if (!active) return;

      const parts = ctx.message.text.split(' ').filter(Boolean).slice(1);
      if (parts.length === 0) {
        return ctx.reply(
          '⚠️ Please specify the item key.\nExample: <code>/buy healing_potion 1</code>\n(Browse keys with /shop)',
          { parse_mode: 'HTML' },
        );
      }

      const itemKey = parts[0].toLowerCase();
      const quantity = parts[1] ? parseInt(parts[1], 10) : 1;

      if (isNaN(quantity) || quantity <= 0) {
        return ctx.reply('⚠️ Quantity must be a positive number.');
      }

      try {
        const result = await this.economyService.buyItem(
          active.character.id,
          itemKey,
          quantity,
        );

        return ctx.reply(
          `✅ <b>Purchase Successful!</b>\n\n` +
            `Bought <b>${result.quantity}x ${result.item.name}</b> for <b>${result.totalCost} gold</b>.\n` +
            `Remaining balance: <b>${result.remainingGold} gp</b>.`,
          { parse_mode: 'HTML' },
        );
      } catch (error) {
        if (error instanceof InsufficientGoldError) {
          return ctx.reply(
            '❌ <b>Insufficient Gold!</b> You cannot afford this item.',
            {
              parse_mode: 'HTML',
            },
          );
        }
        if (error instanceof ItemNotFoundError) {
          return ctx.reply(
            `❌ Item with key "<code>${itemKey}</code>" was not found. Check /shop.`,
            {
              parse_mode: 'HTML',
            },
          );
        }
        if (error instanceof CharacterNotFoundError) {
          return ctx.reply('❌ Character not found. Please /register first.');
        }

        this.logger.error('Error during /buy:', error);
        return ctx.reply('❌ An error occurred processing your purchase.');
      }
    });

    // History command
    this.bot.command('history', async (ctx) => {
      const active = await this.getActiveCharacter(ctx);
      if (!active) return;

      const transactions = await this.economyService.getTransactionHistory(
        active.character.id,
        10,
      );

      if (transactions.length === 0) {
        return ctx.reply('📜 No transactions found in your ledger yet.');
      }

      const lines = transactions
        .map((tx) => {
          const date = new Date(tx.createdAt).toLocaleDateString();
          let detail = tx.type;
          try {
            const raw: unknown = JSON.parse(tx.payload);
            const payload = TxLogPayloadSchema.parse(raw);
            if (tx.type === 'BUY' && 'itemName' in payload) {
              detail = `Bought ${payload.quantity}x ${payload.itemName} for ${payload.totalCost}g`;
            } else if (tx.type === 'TRADE') {
              detail = `Trade exchange`;
            }
          } catch {
            // Keep default
          }
          return `• <b>${date}</b>: ${detail}`;
        })
        .join('\n');

      return ctx.reply(`📜 <b>Transaction History (Last 10):</b>\n\n${lines}`, {
        parse_mode: 'HTML',
      });
    });

    // Note create command (/note <text>)
    this.bot.command('note', async (ctx) => {
      const telegramId = ctx.from?.id.toString();
      if (!telegramId) return;

      const user = await this.usersService.getUserByTelegramId(telegramId);
      if (!user) {
        return ctx.reply(
          '⚠️ Please register first with <code>/register &lt;name&gt;</code> or <code>/link &lt;code&gt;</code>.',
          {
            parse_mode: 'HTML',
          },
        );
      }

      const text = ctx.message.text.split(' ').slice(1).join(' ').trim();
      if (!text) {
        return ctx.reply(
          '📝 <b>Add Campaign Note</b>\n\n' +
            'Usage: <code>/note &lt;your note content&gt;</code>\n' +
            'Example: <code>/note The ancient dungeon entrance is behind the northern waterfall.</code>',
          { parse_mode: 'HTML' },
        );
      }

      try {
        await this.notesService.addNote(user.id, text);
        return ctx.reply(
          '✅ <b>Note Saved!</b>\nYour campaign note has been recorded into the shared knowledge base.',
          { parse_mode: 'HTML' },
        );
      } catch (error) {
        this.logger.error('Error saving note:', error);
        return ctx.reply('❌ Failed to save note.');
      }
    });

    // Notes search/list command (/notes [query])
    this.bot.command('notes', async (ctx) => {
      const telegramId = ctx.from?.id.toString();
      if (!telegramId) return;

      const user = await this.usersService.getUserByTelegramId(telegramId);
      if (!user) {
        return ctx.reply(
          '⚠️ Please register first with <code>/register &lt;name&gt;</code>.',
          {
            parse_mode: 'HTML',
          },
        );
      }

      const query = ctx.message.text.split(' ').slice(1).join(' ').trim();

      if (!query) {
        // List recent notes
        const notes = await this.notesService.getUserNotes(user.id);
        if (notes.length === 0) {
          return ctx.reply(
            '📝 You have no campaign notes yet. Add one with <code>/note &lt;text&gt;</code>.',
            {
              parse_mode: 'HTML',
            },
          );
        }

        const lines = notes
          .slice(0, 5)
          .map(
            (n, idx) =>
              `<b>${idx + 1}.</b> ${n.text.slice(0, 100)}${n.text.length > 100 ? '...' : ''} ` +
              `<i>(${new Date(n.createdAt).toLocaleDateString()})</i>`,
          )
          .join('\n\n');

        return ctx.reply(`📚 <b>Your Recent Notes:</b>\n\n${lines}`, {
          parse_mode: 'HTML',
        });
      }

      // Search notes
      try {
        const results = await this.notesService.searchNotes(user.id, query, 5);
        if (results.length === 0) {
          return ctx.reply(`🔍 No notes matched query: "<i>${query}</i>"`, {
            parse_mode: 'HTML',
          });
        }

        const lines = results
          .map(
            (r, idx) =>
              `<b>${idx + 1}.</b> ${r.text}\n` +
              `<i>Relevance: ${(r.similarity * 100).toFixed(1)}% | ${new Date(r.createdAt).toLocaleDateString()}</i>`,
          )
          .join('\n\n');

        return ctx.reply(`🔍 <b>Matching Notes:</b>\n\n${lines}`, {
          parse_mode: 'HTML',
        });
      } catch (error) {
        this.logger.error('Error searching notes:', error);
        return ctx.reply('❌ Error searching notes.');
      }
    });
  }
}
