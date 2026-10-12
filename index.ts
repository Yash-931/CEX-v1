import express, { json } from "express";
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
    if(!matchToMap || !bestPrice) {
      res.status(401).json({
        message: 'Invalid orderbook state'
      })
      return
    }

    let remainingQty = qty

    while(remainingQty > 0 && bestPrice.length > 0) {
      let currentBestPrice = bestPrice[0]!;

      if(currentBestPrice > price) {
        //cant match
        break
      }
      let qtyAtBestPrice = matchToMap.get(currentBestPrice)

      if(qtyAtBestPrice == undefined || qtyAtBestPrice <= 0) {
        throw new Error('Invalid state of the orderbook')
      }

      const tradeQty = Math.min(qtyAtBestPrice, remainingQty)

      const tradeValue = tradeQty * currentBestPrice 

      remainingQty -= tradeQty
      const remainingAtLevel = qtyAtBestPrice - tradeQty

      if(remainingAtLevel === 0) {
        matchToMap.delete(currentBestPrice)
        bestPrice.shift()
      } else {
        matchToMap.set(currentBestPrice, remainingAtLevel)
      }

      //TODO: update the balanes of both users user
    }

    if(remainingQty > 0) {
      //sit on the orderbook
      let existingOrder = matchToMap.get(price)
      if(existingOrder == undefined) {
        matchToMap.set(price, remainingQty)
      } else {
        matchToMap.set(price, existingOrder + remainingQty)
      }
    }
  }

  if (side === "sell") {
    //TODO
  }
});

app.listen(3000);
