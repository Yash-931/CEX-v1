import express from "express";
import type { ExchangeBalances, ExchangeOrderbook } from "./types";

const app = express();

app.use(express.json());

//BALANCES = {"user1": {usd: "", stock1: "", stock2: ""}, "user2": {}}
const BALANCES: ExchangeBalances = {};

//ORDERBOOK = { "stock1": {bids: [{qty1, price1}, {qty2, price2}], asks: []}, "stock2": {bids: [], asks: []}}
const ORDERBOOK: ExchangeOrderbook = {};

app.post("/order", (req, res) => {
  const { qty, price, name, side } = req.body;
  let matchToMap: Map<number, number>;
  let bestPrice: number[] = [];
  if (side === "buy") {
    matchToMap = ORDERBOOK[name]?.asksMap!;
    bestPrice = ORDERBOOK[name]?.sortedAsks!;
  }

  if (side === "sell") {
    matchToMap = ORDERBOOK[name]?.bidsMap!;
    bestPrice = ORDERBOOK[name]?.sortedBids!;
  }
});

app.listen(3000);
