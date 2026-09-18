import { Injectable, UseGuards } from '@nestjs/common';
import { Context, SlashCommand, Options, StringOption } from 'necord';
import { IsString, Length } from 'class-validator';
import { CommandInteraction, EmbedBuilder } from 'discord.js';
import { UsersService } from '../../users/users.service';
import { EconomyService } from '../../economy/economy.service';
import { CHARACTER_CONFIG } from '../../config/game.constants';
import { GuildOnlyGuard } from '../guards/guild-only.guard';
import { CharacterExistsGuard } from '../guards/character-exists.guard';
import { TxLogPayloadSchema } from '../../config/validation.schemas';

export class RegisterDto {
  @StringOption({
    name: 'name',
    description: 'Character name',
    required: true,
  })
  @IsString()
  @Length(CHARACTER_CONFIG.MIN_NAME_LENGTH, CHARACTER_CONFIG.MAX_NAME_LENGTH)
  name: string;
}

@Injectable()
export class UserCommands {
  constructor(
    private readonly usersService: UsersService,
    private readonly economyService: EconomyService,
  ) {}

  @SlashCommand({
    name: 'register',
    description: 'Register a new character',
  })
  async onRegister(
    @Context() [interaction]: [CommandInteraction],
    @Options() { name }: RegisterDto,
  ) {
    const discordId = interaction.user.id;
    const guildId = interaction.guildId;

    if (!guildId) {
      return interaction.reply({
        content: 'This command can only be used in a server.',
        ephemeral: true,
      });
    }

    const existingUser = await this.usersService.getUserByDiscordId(
      discordId,
      guildId,
    );

    if (existingUser?.character) {
      if (existingUser.character.name.toLowerCase() === name.toLowerCase()) {
        return interaction.reply({
          content: `Welcome back, ${existingUser.character.name}! Your character is ready to go.`,
          ephemeral: true,
        });
      } else {
        return interaction.reply({
          content: `You already have a character named "${existingUser.character.name}". Use a different name or contact a GM to change it.`,
          ephemeral: true,
        });
      }
    }

    await this.usersService.findOrCreateUser(discordId, guildId, name);

    return interaction.reply({
      content: `Character "${name}" has been created! You start with ${CHARACTER_CONFIG.STARTING_GOLD} gold. Use \`/inv\` to see your inventory.`,
      ephemeral: true,
    });
  }

  @UseGuards(GuildOnlyGuard, CharacterExistsGuard)
  @SlashCommand({
    name: 'inv',
    description: 'View your inventory',
  })
  async onInventory(@Context() [interaction]: [CommandInteraction]) {
    const user = await this.usersService.getUserByDiscordId(
      interaction.user.id,
      interaction.guildId!,
    );

    const inventory = await this.economyService.getCharacterInventory(
      user!.character!.id,
    );

    const embed = new EmbedBuilder()
      .setTitle(`${user!.character!.name}'s Inventory`)
      .setColor('#00ff00')
      .addFields(
        { name: 'Gold', value: `${user!.character!.gold}`, inline: true },
        { name: 'Items', value: inventory.length.toString(), inline: true },
      );

    if (inventory.length === 0) {
      embed.setDescription(
        'Your inventory is empty. Visit the shop with `/shop` to buy some items!',
      );
    } else {
      const itemList = inventory
        .map((inv) => `${inv.item.name} x${inv.qty}`)
        .join('\n');

      embed.setDescription(`**Items:**\n${itemList}`);
    }

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  @UseGuards(GuildOnlyGuard, CharacterExistsGuard)
  @SlashCommand({
    name: 'history',
    description: 'View your transaction history',
  })
  async onHistory(@Context() [interaction]: [CommandInteraction]) {
    const user = await this.usersService.getUserByDiscordId(
      interaction.user.id,
      interaction.guildId!,
    );

    const transactions = await this.economyService.getTransactionHistory(
      user!.character!.id,
    );

    const embed = new EmbedBuilder()
      .setTitle(`${user!.character!.name}'s Transaction History`)
      .setColor('#ff9900')
      .setDescription('Your last 10 transactions:');

    if (transactions.length === 0) {
      embed.setDescription(
        'No transactions found. Start by buying something from the shop!',
      );
    } else {
      const transactionList = transactions
        .map((tx) => {
          const date = new Date(tx.createdAt).toLocaleDateString();
          const payload = TxLogPayloadSchema.parse(JSON.parse(tx.payload));

          switch (tx.type) {
            case 'BUY':
              if ('itemName' in payload) {
                return `**${date}** - Bought ${payload.quantity}x ${payload.itemName} for ${payload.totalCost} gold`;
              }
              break;
            case 'TRADE':
              if ('partnerCharId' in payload) {
                return `**${date}** - Trade with character ${payload.partnerCharId}`;
              }
              break;
            case 'AUCTION_SALE':
              if ('qty' in payload && 'salePrice' in payload) {
                return `**${date}** - ${payload.qty}x item sold for ${payload.salePrice} gold`;
              }
              break;
            case 'AUCTION_REFUND':
              if ('reason' in payload) {
                return `**${date}** - Auction refunded: ${payload.reason}`;
              }
              break;
          }
          return `**${date}** - ${tx.type}`;
        })
        .join('\n');

      embed.setDescription(transactionList);
    }

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  @UseGuards(GuildOnlyGuard, CharacterExistsGuard)
  @SlashCommand({
    name: 'link',
    description:
      'Generate a code to link your Telegram account to this character',
  })
  async onLink(@Context() [interaction]: [CommandInteraction]) {
    const user = await this.usersService.getUserByDiscordId(
      interaction.user.id,
      interaction.guildId!,
    );

    const code = await this.usersService.createAccountLinkToken(user!.id);

    const embed = new EmbedBuilder()
      .setTitle('🔗 Link Telegram Account')
      .setColor('#00aaff')
      .setDescription(
        `Use this code to link your Telegram account to **${user!.character!.name}**:\n\n` +
          `\`\`\`\n/link ${code}\n\`\`\`\n` +
          `*This code will expire in 10 minutes.*\n\n` +
          `Open the EverReach Telegram bot and send \`/link ${code}\` to sync your character across both platforms!`,
      );

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
}
