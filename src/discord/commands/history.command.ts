import { Injectable } from '@nestjs/common';
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { UsersService } from '../../users/users.service';
import { EconomyService } from '../../economy/economy.service';

interface BuyPayload {
  quantity: number;
  itemName: string;
  totalCost: number;
  itemId: number;
  itemKey: string;
}

interface TradePayload {
  partnerCharId: number;
}

interface AuctionSalePayload {
  qty: number;
  salePrice: number;
}

interface AuctionRefundPayload {
  reason: string;
}

type TxLogPayload =
  | BuyPayload
  | TradePayload
  | AuctionSalePayload
  | AuctionRefundPayload;

@Injectable()
export class HistoryCommand {
  constructor(
    private readonly usersService: UsersService,
    private readonly economyService: EconomyService,
  ) {}

  data = new SlashCommandBuilder()
    .setName('history')
    .setDescription('View your transaction history');

  async execute(interaction: ChatInputCommandInteraction) {
    const discordId = interaction.user.id;
    const guildId = interaction.guildId;

    if (!guildId) {
      return interaction.reply({
        content: 'This command can only be used in a server.',
        ephemeral: true,
      });
    }

    const user = await this.usersService.getUserByDiscordId(discordId, guildId);

    if (!user?.character) {
      return interaction.reply({
        content:
          'You need to register a character first! Use `/register <name>` to get started.',
        ephemeral: true,
      });
    }

    const transactions = await this.economyService.getTransactionHistory(
      user.character.id,
    );

    const embed = new EmbedBuilder()
      .setTitle(`${user.character.name}'s Transaction History`)
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
          const payload = JSON.parse(tx.payload) as TxLogPayload;

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
}
