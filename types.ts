export interface OrderLevel {
  qty: number;
  price: number;
}

export interface BookSides {
  bidsMap: Map<number, number>; //price -> qty for quick insert/delete
  asksMap: Map<number, number>;

  sortedBids: number[];
  sortedAsks: number[];
}

export type ExchangeOrderbook = Record<string, BookSides>;

export interface BalanceDetail {
  available: string;
  locked: string;
}
export type ExchangeBalances = Record<string, Record<string, BalanceDetail>>;
