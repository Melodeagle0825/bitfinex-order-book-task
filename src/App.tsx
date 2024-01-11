import { useState } from "react";
import "./App.css";
import useOrderBook from "./core/hooks/useOrderBook";
import { PrecisionCategory } from "./core/interfaces/bitfinex.type";
import { getSum } from "./core/utils/number.util";

function App() {
  const [prec, setPrec] = useState<PrecisionCategory>("P0");
  const { bids, asks, psnap, connect, disconnect } = useOrderBook({ pair: "tBTCUSD", prec });

  const bidPrices = psnap.bids.slice(-25);
  const askPrices = psnap.asks.slice(-25);

  return (
    <div>
      <div className="actions-group">
        <button onClick={() => connect()}>
          Connect WebSocket
        </button>
        <button onClick={() => disconnect()}>
          Disconnect WebSocket
        </button>

        <label>Decimal Precision Level:</label>

        <select value={prec} onChange={(e) => setPrec(e.target.value as PrecisionCategory)}>
          <option value="P0">P0</option>
          <option value="P1">P1</option>
          <option value="P2">P2</option>
          <option value="P3">P3</option>
          <option value="P4">P4</option>
        </select>
      </div>

      <div className="order-book">
        <table>
          <thead>
            <tr>
              <th>COUNT</th>
              <th>AMOUNT</th>
              <th>TOTAL</th>
              <th>PRICE</th>
            </tr>
          </thead>
          <tbody>
            {bidPrices.map((price, bidIdx) => (
              <tr key={bidIdx}>
                <td>{bids[price].count}</td>
                <td>{+bids[price].amount.toFixed(4)}</td>
                <td>{getSum(bidPrices.slice(0, bidIdx + 1).map((it) => bids[it].amount))}</td>
                <td>{bids[price].price}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <table>
          <thead>
            <tr>
              <th>PRICE</th>
              <th>TOTAL</th>
              <th>AMOUNT</th>
              <th>COUNT</th>
            </tr>
          </thead>
          <tbody>
            {askPrices.map((price, askIdx) => (
              <tr key={askIdx}>
                <td>{asks[price].price}</td>
                <td>{getSum(askPrices.slice(0, askIdx + 1).map((it) => asks[it].amount))}</td>
                <td>{+asks[price].amount.toFixed(4)}</td>
                <td>{asks[price].count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
