export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ItemNotFoundError extends DomainError {
  constructor(itemKey: string) {
    super(`Item with key "${itemKey}" not found.`);
  }
}

export class InsufficientItemsError extends DomainError {
  constructor() {
    super('Insufficient items to perform this action.');
  }
}

export class AuctionNotFoundError extends DomainError {
  constructor(auctionId: number) {
    super(`Auction with ID #${auctionId} not found.`);
  }
}

export class AuctionNotOpenError extends DomainError {
  constructor(auctionId: number) {
    super(`Auction #${auctionId} is not open for bidding.`);
  }
}

export class AuctionExpiredError extends DomainError {
  constructor(auctionId: number) {
    super(`Auction #${auctionId} has expired.`);
  }
}

export class SelfBidError extends DomainError {
  constructor() {
    super('You cannot bid on your own auction.');
  }
}

export class BidTooLowError extends DomainError {
  constructor() {
    super('Your bid must be at least the minimum bid amount.');
  }
}

export class BidNotHigherError extends DomainError {
  constructor() {
    super('Your bid must be higher than the current highest bid.');
  }
}

export class InsufficientGoldError extends DomainError {
  constructor() {
    super('You do not have enough gold for this action.');
  }
}

export class CharacterNotFoundError extends DomainError {
  constructor() {
    super('Character not found. Please register with `/register` first.');
  }
}
