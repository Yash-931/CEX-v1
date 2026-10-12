export interface OrderLevel {
  qty: number;
  price: number;
}

export interface RestingOrder {
  orderId: string,
  price: number
  userId: string,
  qty: number
}

export interface BookSides {
  bidsMap: Map<number, RestingOrder[]>; //price -> qty for quick insert/delete
  asksMap: Map<number, RestingOrder[]>;

  sortedBids: number[];
  sortedAsks: number[];
}

export type ExchangeOrderbook = Record<string, BookSides>;

export interface BalanceDetail {
  available: number;
  locked: number;
}
export type ExchangeBalances = Record<string, Record<string, BalanceDetail>>;
