import { Injectable, UseGuards, Logger } from '@nestjs/common';
import {
  Context,
  createCommandGroupDecorator,
  Subcommand,
  Options,
  StringOption,
  IntegerOption,
} from 'necord';
import { IsString, IsInt, Min, Max, Length } from 'class-validator';
import { CommandInteraction, EmbedBuilder } from 'discord.js';
import { PrismaService } from '../../db/prisma.service';
import { DungeonMasterGuard } from '../guards/dungeon-master.guard';
import {
  ItemNotFoundError,
  DomainError,
} from '../../core/errors/errors';

const AdminCommand = createCommandGroupDecorator({
  name: 'admin',
  description: 'Admin commands (DM only)',
});

export class ItemCreateDto {
  @StringOption({
    name: 'key',
    description: 'Unique item identifier (e.g., iron_sword)',
    required: true,
  })
  @IsString()
  @Length(1, 50)
  key: string;

  @StringOption({
    name: 'name',
    description: 'Item display name',
    required: true,
  })
  @IsString()
  @Length(1, 100)
  name: string;

  @IntegerOption({
    name: 'value',
    description: 'Base gold value of the item',
    required: true,
    min_value: 1,
  })
  @IsInt()
  @Min(1)
  @Max(999_999_999)
  value: number;
}

export class ItemUpdateDto {
  @StringOption({
    name: 'key',
    description: 'Item key to update',
    required: true,
  })
  @IsString()
  @Length(1, 50)
  key: string;

  @StringOption({
    name: 'name',
    description: 'New item display name (optional)',
    required: false,
  })
  @IsString()
  @Length(1, 100)
  name?: string;

  @IntegerOption({
    name: 'value',
    description: 'New base gold value (optional)',
    required: false,
    min_value: 1,
  })
  @IsInt()
  @Min(1)
  @Max(999_999_999)
  value?: number;
}

export class ItemDeleteDto {
  @StringOption({
    name: 'key',
    description: 'Item key to delete',
    required: true,
  })
  @IsString()
  @Length(1, 50)
  key: string;
}

@Injectable()
@AdminCommand()
export class AdminCommands {
  private readonly logger = new Logger(AdminCommands.name);

  constructor(private readonly prisma: PrismaService) {}

  @UseGuards(DungeonMasterGuard)
  @Subcommand({
    name: 'item-add',
    description: 'Add a new item to the game',
  })
  async onItemAdd(
    @Context() [interaction]: [CommandInteraction],
    @Options() { key, name, value }: ItemCreateDto,
  ) {
    try {
      // Check if item already exists
      const existing = await this.prisma.item.findUnique({
        where: { key },
      });

      if (existing) {
        const embed = new EmbedBuilder()
          .setTitle('❌ Item Already Exists')
          .setColor('#ff0000')
          .setDescription(`An item with key **${key}** already exists!`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // Create new item
      const item = await this.prisma.item.create({
        data: {
          key,
          name,
          baseValue: value,
        },
      });

      const embed = new EmbedBuilder()
        .setTitle('✅ Item Created')
        .setColor('#00ff00')
        .setDescription(`Successfully added item to the game`)
        .addFields(
          { name: 'Key', value: item.key },
          { name: 'Name', value: item.name },
          { name: 'Value', value: `${item.baseValue} gold` },
        );

      return interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setColor('#ff0000')
        .setDescription(
          error instanceof Error ? error.message : 'An error occurred',
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }

  @UseGuards(DungeonMasterGuard)
  @Subcommand({
    name: 'item-update',
    description: 'Update an existing item',
  })
  async onItemUpdate(
    @Context() [interaction]: [CommandInteraction],
    @Options() { key, name, value }: ItemUpdateDto,
  ) {
    try {
      // Check if item exists
      const existing = await this.prisma.item.findUnique({
        where: { key },
      });

      if (!existing) {
        throw new ItemNotFoundError(key);
      }

      // Update item
      const updated = await this.prisma.item.update({
        where: { key },
        data: {
          ...(name && { name }),
          ...(value && { baseValue: value }),
        },
      });

      const embed = new EmbedBuilder()
        .setTitle('✅ Item Updated')
        .setColor('#00ff00')
        .setDescription(`Successfully updated item **${key}**`)
        .addFields(
          { name: 'Key', value: updated.key },
          { name: 'Name', value: updated.name },
          { name: 'Value', value: `${updated.baseValue} gold` },
        );

      return interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      let errorMessage = 'An error occurred';

      if (error instanceof ItemNotFoundError) {
        errorMessage = `Item with key **${key}** not found`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setColor('#ff0000')
        .setDescription(errorMessage);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }

  @UseGuards(DungeonMasterGuard)
  @Subcommand({
    name: 'item-delete',
    description: 'Delete an item from the game',
  })
  async onItemDelete(
    @Context() [interaction]: [CommandInteraction],
    @Options() { key }: ItemDeleteDto,
  ) {
    try {
      // Check if item exists
      const existing = await this.prisma.item.findUnique({
        where: { key },
      });

      if (!existing) {
        throw new ItemNotFoundError(key);
      }

      // Delete item (will cascade to inventory and auctions)
      await this.prisma.item.delete({
        where: { key },
      });

      const embed = new EmbedBuilder()
        .setTitle('✅ Item Deleted')
        .setColor('#00ff00')
        .setDescription(`Successfully deleted item **${key}**`);

      return interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      let errorMessage = 'An error occurred';

      if (error instanceof ItemNotFoundError) {
        errorMessage = `Item with key **${key}** not found`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setColor('#ff0000')
        .setDescription(errorMessage);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }

  @UseGuards(DungeonMasterGuard)
  @Subcommand({
    name: 'item-list',
    description: 'List all items in the game',
  })
  async onItemList(@Context() [interaction]: [CommandInteraction]) {
    try {
      const items = await this.prisma.item.findMany({
        orderBy: { name: 'asc' },
      });

      const embed = new EmbedBuilder()
        .setTitle('📋 All Items')
        .setColor('#0099ff')
        .setDescription(`Total items: ${items.length}`);

      if (items.length === 0) {
        embed.setDescription('No items in the game yet!');
      } else {
        const itemList = items
          .map((item) => `**${item.name}** (${item.key}) - ${item.baseValue} gold`)
          .join('\n');

        embed.addFields({
          name: 'Items',
          value: itemList,
        });
      }

      return interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setColor('#ff0000')
        .setDescription(
          error instanceof Error ? error.message : 'An error occurred',
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }

  @UseGuards(DungeonMasterGuard)
  @Subcommand({
    name: 'dm-list',
    description: 'List users with Dungeon Master role in this server',
  })
  async onDMList(@Context() [interaction]: [CommandInteraction]) {
    this.logger.log('[dm-list] Command invoked');
    try {
      this.logger.log('[dm-list] Command started, checking guild...');
      // Only works in guilds
      if (!interaction.guildId || !interaction.guild) {
        this.logger.warn('[dm-list] Not in a guild, sending error');
        const embed = new EmbedBuilder()
          .setTitle('❌ Guild Only')
          .setColor('#ff0000')
          .setDescription('This command only works in server channels.');
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // Defer the interaction to prevent timeout (member fetch takes time)
      this.logger.log('[dm-list] Deferring interaction response');
      await interaction.deferReply({ ephemeral: true });
      this.logger.log('[dm-list] Interaction deferred');

      const guild = interaction.guild;
      this.logger.log(`[dm-list] Fetching members from guild ${interaction.guildId}`);
      
      try {
        // Fetch members with timeout
        const members = await Promise.race([
          guild.members.fetch(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Member fetch timeout after 10 seconds')), 10000)
          ),
        ]);
        this.logger.log(`[dm-list] Fetched ${members.size} members`);
        
        // Find members with roles that contain "master" or "dm" (case-insensitive)
        const dmMembers = members.filter((member) =>
          member.roles.cache.some(
            (role) =>
              role.name.toLowerCase().includes('dungeon') ||
              role.name.toLowerCase().includes('master') ||
              role.name.toLowerCase() === 'dm',
          ),
        );

        this.logger.log(`[dm-list] Found ${dmMembers.size} members with DM role`);

        const embed = new EmbedBuilder()
          .setTitle('👑 Dungeon Masters')
          .setColor('#9d4edd')
          .setDescription(`Total DMs: ${dmMembers.size}`);

        if (dmMembers.size === 0) {
          embed.setDescription(
            'No members with Dungeon Master role found. Ask an admin to create the role and assign it to your DMs!',
          );
        } else {
          const dmList = dmMembers
            .map((member) => `**${member.user.username}** - ${member.user.id}`)
            .join('\n');

          embed.addFields({
            name: 'Members',
            value: dmList,
          });
        }

        this.logger.log('[dm-list] About to send reply');
        return interaction.editReply({ embeds: [embed] });
      } catch (fetchError) {
        this.logger.error('[dm-list] Member fetch failed:', fetchError);
        const embed = new EmbedBuilder()
          .setTitle('❌ Error')
          .setColor('#ff0000')
          .setDescription(`Failed to fetch members: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}. Make sure the bot has "Read Members" permission.`);
        return interaction.editReply({ embeds: [embed] });
      }
    } catch (error) {
      this.logger.error('[dm-list] Caught error:', error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setColor('#ff0000')
        .setDescription(
          error instanceof Error ? error.message : 'An error occurred',
        );
      try {
        this.logger.log('[dm-list] Sending error response');
        // Check if interaction was deferred/replied
        if (interaction.deferred || interaction.replied) {
          return interaction.editReply({ embeds: [embed] });
        } else {
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }
      } catch (replyError) {
        this.logger.error('[dm-list] Failed to send error response:', replyError);
        throw replyError;
      }
    }
  }
}
