import { Injectable, UseGuards } from '@nestjs/common';
import {
  Context,
  SlashCommand,
  Options,
  StringOption,
  IntegerOption,
} from 'necord';
import { IsString, IsInt, Min, Max, Length } from 'class-validator';
import { CommandInteraction, EmbedBuilder } from 'discord.js';
import { UsersService } from '../../users/users.service';
import { EconomyService } from '../../economy/economy.service';
import { ECONOMY_CONFIG } from '../../config/game.constants';
import { GuildOnlyGuard } from '../guards/guild-only.guard';
import { CharacterExistsGuard } from '../guards/character-exists.guard';

export class BuyDto {
  @StringOption({
    name: 'key',
    description: 'Item key',
    required: true,
  })
  @IsString()
  @Length(1, 50)
  key: string;

  @IntegerOption({
    name: 'qty',
    description: 'Quantity',
    required: true,
    min_value: 1,
  })
  @IsInt()
  @Min(1)
  @Max(ECONOMY_CONFIG.MAX_PAGE_SIZE)
  qty: number;
}

@Injectable()
export class EconomyCommands {
  constructor(
    private readonly usersService: UsersService,
    private readonly economyService: EconomyService,
  ) {}

  @SlashCommand({
    name: 'shop',
    description: 'View the shop catalog',
  })
  async onShop(@Context() [interaction]: [CommandInteraction]) {
    const items = await this.economyService.getAllItems();

    const embed = new EmbedBuilder()
      .setTitle('🏪 General Store')
      .setColor('#0099ff')
      .setDescription(
        'Welcome to the General Store! Use `/buy <item> <quantity>` to make a purchase.',
      );

    if (items.length === 0) {
      embed.setDescription('The shop is currently empty. Check back later!');
    } else {
      const itemList = items
        .map(
          (item) => `**${item.name}** (${item.key}) - ${item.baseValue} gold`,
        )
        .join('\n');

      embed.addFields({ name: 'Available Items', value: itemList });
    }

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  @UseGuards(GuildOnlyGuard, CharacterExistsGuard)
  @SlashCommand({
    name: 'buy',
    description: 'Buy an item from the shop',
  })
  async onBuy(
    @Context() [interaction]: [CommandInteraction],
    @Options() { key, qty }: BuyDto,
  ) {
    const user = await this.usersService.getUserByDiscordId(
      interaction.user.id,
      interaction.guildId!,
    );

    const result = await this.economyService.buyItem(
      user!.character!.id,
      key,
      qty,
    );

    const embed = new EmbedBuilder()
      .setTitle('✅ Purchase Successful')
      .setColor('#00ff00')
      .setDescription(
        `You bought **${qty}x ${result.item.name}** for **${result.totalCost} gold**`,
      )
      .addFields(
        {
          name: 'Remaining Gold',
          value: `${result.remainingGold}`,
          inline: true,
        },
        { name: 'Item', value: result.item.name, inline: true },
      );

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
}
