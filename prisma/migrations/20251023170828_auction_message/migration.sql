-- CreateTable
CREATE TABLE "AuctionMessage" (
    "id" SERIAL NOT NULL,
    "auctionId" INTEGER NOT NULL,
    "messageId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuctionMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuctionMessage_auctionId_key" ON "AuctionMessage"("auctionId");

-- CreateIndex
CREATE INDEX "AuctionMessage_guildId_channelId_idx" ON "AuctionMessage"("guildId", "channelId");

-- AddForeignKey
ALTER TABLE "AuctionMessage" ADD CONSTRAINT "AuctionMessage_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
