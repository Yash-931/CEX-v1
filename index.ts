import express from "express";
import type { ExchangeBalances, ExchangeOrderbook } from "./types";

const app = express();

app.use(express.json());

//BALANCES = {"user1": {usd: "", stock1: "", stock2: ""}, "user2": {}}
const BALANCES: ExchangeBalances = {};

//ORDERBOOK = { "stock1": {bids: [{qty1, price1}, {qty2, price2}], asks: []}, "stock2": {bids: [], asks: []}}
const ORDERBOOK: ExchangeOrderbook = {};

app.post("/order", (req, res) => {
  const { userId } = req.body;
  let { qty, price, name, side } = req.body;
  if (!qty || !price || !name || !side) {
    res.status(401).json({
      message: "Missing input params",
    });
    return;
  }
  let matchToMap: Map<number, number>;
  let bestPrice: number[] = [];

  if (!BALANCES[userId]) {
    res.status(401).json({
      message: "User balance wallet not found",
    });
    return;
  }

  let userAvailableBalance = BALANCES[userId]["USD"]?.available;
  let userLockedBalance = BALANCES[userId]["USD"]?.locked;

  if (!userAvailableBalance || !userLockedBalance) {
    res.status(401).json({
      message: "User balance not found",
    });
    return;
  }

  if (userAvailableBalance < price * qty) {
    res.status(401).json({
      message: "Insufficient funds",
    });
    return;
  }
  if (side === "buy") {
    matchToMap = ORDERBOOK[name]?.asksMap!;
    bestPrice = ORDERBOOK[name]?.sortedAsks!;

    while (bestPrice.length > 0 && bestPrice[0]! <= price) {
      let qtyAtBestPrice = matchToMap.get(bestPrice[0]!)!;

      if (qtyAtBestPrice >= qty) {
        //enough qty is available at the given price
        qtyAtBestPrice = qtyAtBestPrice - qty;

        //instant match happens
        //deduct user's USD balance
        userAvailableBalance = userAvailableBalance - qty * bestPrice[0]!;

        //add the particular stock to user balance
        BALANCES[userId][name]!.available += qty;
        qty = 0;

        //update the orderbook
        if (qtyAtBestPrice === 0) {
          const isDeleted = ORDERBOOK[name]?.asksMap!.delete(bestPrice[0]!);
          ORDERBOOK[name]!.sortedAsks! = ORDERBOOK[name]!.sortedAsks!.filter(
            (price) => price !== bestPrice[0],
          );
          console.log("Deleted: " + isDeleted);
        } else {
          matchToMap.set(bestPrice[0]!, qtyAtBestPrice);
        }

        break;
      } else {
        
      }
    }
  }

  if (side === "sell") {
    matchToMap = ORDERBOOK[name]?.bidsMap!;
    bestPrice = ORDERBOOK[name]?.sortedBids!;
  }
});

app.listen(3000);
