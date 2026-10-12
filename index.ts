import express from "express";
import type {
  ExchangeBalances,
  ExchangeOrderbook,
  RestingOrder,
} from "./types";

const app = express();

app.use(express.json());

const BALANCES: ExchangeBalances = {
  buyer1: {
    USD: { available: 10000, locked: 0 },
    BTC: { available: 0, locked: 0 },
    ETH: { available: 0, locked: 0 },
  },

  seller1: {
    USD: { available: 0, locked: 0 },
    BTC: { available: 2, locked: 2 },
    ETH: { available: 5, locked: 5 },
  },

  seller2: {
    USD: { available: 0, locked: 0 },
    BTC: { available: 3, locked: 3 },
    ETH: { available: 4, locked: 4 },
  },

  buyer2: {
    USD: { available: 5000, locked: 0 },
    BTC: { available: 1, locked: 0 },
    ETH: { available: 2, locked: 0 },
  },
};

const ORDERBOOK: ExchangeOrderbook = {
  BTC: {
    // Lowest ask first
    asksMap: new Map([
      [
        100,
        [
          {
            orderId: "s1-btc-1",
            userId: "seller1",
            price: 100,
            qty: 2,
          },
        ],
      ],
      [
        105,
        [
          {
            orderId: "s2-btc-1",
            userId: "seller2",
            price: 105,
            qty: 3,
          },
        ],
      ],
    ]),

    // Highest bid first
    bidsMap: new Map([
      [
        95,
        [
          {
            orderId: "b2-btc-1",
            userId: "buyer2",
            price: 95,
            qty: 1,
          },
        ],
      ],
    ]),

    sortedAsks: [100, 105],
    sortedBids: [95],
  },

  ETH: {
    asksMap: new Map([
      [
        50,
        [
          {
            orderId: "s1-eth-1",
            userId: "seller1",
            price: 50,
            qty: 5,
          },
        ],
      ],
      [
        55,
        [
          {
            orderId: "s2-eth-1",
            userId: "seller2",
            price: 55,
            qty: 4,
          },
        ],
      ],
    ]),

    bidsMap: new Map([
      [
        48,
        [
          {
            orderId: "b2-eth-1",
            userId: "buyer2",
            price: 48,
            qty: 2,
          },
        ],
      ],
    ]),

    sortedAsks: [50, 55],
    sortedBids: [48],
  },
};

app.post("/order", (req, res) => {
  const { userId } = req.body;
  let { orderId, qty, price, name, side } = req.body;
  if (!qty || !price || !name || !side) {
    res.status(401).json({
      message: "Missing input params",
    });
    return;
  }
  let matchToMap: Map<number, RestingOrder[]>;
  let bestPrice: number[] = [];

  if (!BALANCES[userId]) {
    res.status(401).json({
      message: "User balance wallet not found",
    });
    return;
  }

  let userBalanceBook = BALANCES[userId];

  if (userBalanceBook == undefined) {
    res.status(401).json({
      message: "User balance not found",
    });
    return;
  }

  if (side === "buy") {
    let usdBalance = userBalanceBook["USD"];

    if (usdBalance == undefined) {
      res.status(401).json({
        message: "User balance unavailable",
      });
      return;
    }

    if (usdBalance.available < price * qty) {
      res.status(401).json({
        message: "Insufficient funds",
      });
      return;
    }

    const book = ORDERBOOK[name];

    if (!book) {
      res.status(400).json({
        message: "Unknow asset",
      });
      return;
    }

    matchToMap = ORDERBOOK[name]!.asksMap!;
    bestPrice = ORDERBOOK[name]!.sortedAsks!;
    if (!matchToMap || !bestPrice) {
      res.status(401).json({
        message: "Invalid orderbook state",
      });
      return;
    }
    usdBalance.available -= price * qty;
    usdBalance.locked += price * qty;
    let remainingQty = qty;
    let totalTradedValue = 0;
    while (remainingQty > 0 && bestPrice.length > 0) {
      let currentBestPrice = bestPrice[0]!;

      if (currentBestPrice > price) {
        //cant match
        break;
      }
      const ordersAtBestPrice = matchToMap.get(currentBestPrice);

      if (ordersAtBestPrice == undefined || ordersAtBestPrice.length <= 0) {
        throw new Error("Invalid state of the orderbook");
      }

      const restingOrder = ordersAtBestPrice[0]!;
      let qtyAtBestPrice = restingOrder.qty;
      const tradeQty = Math.min(qtyAtBestPrice, remainingQty);

      const matchedUserId = restingOrder.userId;
      let matchedUserBalanceBook = BALANCES[matchedUserId];

      if (matchedUserBalanceBook == undefined || !matchedUserBalanceBook) {
        res.status(400).json({
          message: "Matched user balance not found",
        });
        return;
      }

      const tradeValue = tradeQty * currentBestPrice;
      totalTradedValue += tradeValue;

      remainingQty -= tradeQty;
      const remainingAtLevel = qtyAtBestPrice - tradeQty;

      if (remainingAtLevel === 0) {
        ordersAtBestPrice.shift();
        if (ordersAtBestPrice.length === 0) {
          matchToMap.delete(currentBestPrice);
          bestPrice.shift();
        }
      } else {
        restingOrder.qty = remainingAtLevel;
      }

      usdBalance.locked -= tradeValue;
      userBalanceBook[name]!.available += tradeQty;

      matchedUserBalanceBook[name]!.locked -= tradeQty;
      matchedUserBalanceBook["USD"]!.available += tradeValue;
    }

    const filledQty = qty - remainingQty;
    const excessReservation = filledQty * price - totalTradedValue;

    usdBalance.locked -= excessReservation;
    usdBalance.available += excessReservation;

    if (remainingQty > 0) {
      const bidsMap = ORDERBOOK[name]?.bidsMap!;
      const sortedBids = ORDERBOOK[name]?.sortedBids!;
      //sit on the orderbook
      let existingOrders = bidsMap.get(price);
      const newOrder: RestingOrder = {
        orderId: orderId,
        price: price,
        userId: userId,
        qty: remainingQty,
      };
      if (existingOrders == undefined || existingOrders.length <= 0) {
        bidsMap.set(price, [newOrder]);
        sortedBids.push(price);
        sortedBids.sort((a, b) => b - a);
      } else {
        existingOrders.push(newOrder);
        bidsMap.set(price, existingOrders);
      }
    }

    res.status(200).json({
      message: "Transaction success",
      orderId: orderId,
    });
    return;
  }

  if (side === "sell") {
    //TODO
  }
});

app.listen(3000);
