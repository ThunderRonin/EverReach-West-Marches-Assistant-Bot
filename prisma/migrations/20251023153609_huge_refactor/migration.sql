-- CreateIndex
CREATE INDEX "Auction_status_expiresAt_idx" ON "Auction"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "Auction_sellerId_status_idx" ON "Auction"("sellerId", "status");

-- CreateIndex
CREATE INDEX "Auction_currentBidderId_status_idx" ON "Auction"("currentBidderId", "status");

-- CreateIndex
CREATE INDEX "Note_userId_createdAt_idx" ON "Note"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Trade_fromCharId_status_idx" ON "Trade"("fromCharId", "status");

-- CreateIndex
CREATE INDEX "Trade_toCharId_status_idx" ON "Trade"("toCharId", "status");

-- CreateIndex
CREATE INDEX "Trade_status_expiresAt_idx" ON "Trade"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "TxLog_charId_createdAt_idx" ON "TxLog"("charId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "TxLog_charId_type_idx" ON "TxLog"("charId", "type");
