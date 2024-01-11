import CRC from "crc-32";
import _ from "lodash";
import { useState } from "react";
import configs from "../configs";
import { PrecisionCategory } from "../interfaces/bitfinex.type";
import { IOrderBookItem } from "../interfaces/book.type";
import {
  BookSlice,
  deleteAskItemThunk,
  deleteBidItemThunk,
  increaseMessageCountThunk,
  initializeBooksThunk,
  updateAskItemThunk,
  updateBidItemThunk,
  updatePsnapItemThunk
} from "../store/slices/bookSlice";
import { useAppDispatch, useAppSelector } from "./rtkHooks";

interface UseOrderBookProps {
  pair: string; // e.g. tBTCUSD
  prec: PrecisionCategory
}

export default function useOrderBook({ pair, prec }: UseOrderBookProps) {
  const dispatch = useAppDispatch();
  const { bids, asks, psnap, mcnt } = useAppSelector((store) => store.book);
  const [isConnectionDisabled, setDisableConnection] = useState(true);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [cli, setCli] = useState<WebSocket | null>(null);
  const [channelId, setChannelId] = useState("");
  let seq: number | null = 0;
  let bids_: BookSlice["bids"] = {};
  let asks_: BookSlice["asks"] = {};
  let psnap_: BookSlice["psnap"] = { bids: [], asks: [] };
  let mcnt_ = 0;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  function connect() {
    setDisableConnection(false);
    console.log("connecting", connecting);
    console.log("connected", connected);
    if (connecting || connected) return;
    setConnecting(true);

    const cli_ = new WebSocket(configs.wshost);
    setCli(cli_);

    cli_.addEventListener('open', function open() {
      console.log('WS open')
      setConnecting(false);
      setConnected(true);
      dispatch(initializeBooksThunk());
      cli_.send(JSON.stringify({ event: 'conf', flags: 65536 + 131072 }))
      cli_.send(JSON.stringify({ event: 'subscribe', channel: 'book', pair: pair, prec, len: 100 }))
    })

    cli_.addEventListener('close', function open() {
      seq = null;
      console.log('WS close')
      setConnecting(false);
      setConnected(false);
    })

    cli_.addEventListener('message', function (rawData) {
      const msg = JSON.parse(rawData.data);
      if (msg.event === "subscribed") {
        setChannelId(msg.chanId);
      }
      if (msg.event === "unsubscribed") {
        setConnecting(false);
        setConnected(false);
      }

      if (msg.event) return;
      if (msg[1] === 'hb') {
        seq = +msg[2]
        return
      } else if (msg[1] === 'cs') {
        seq = +msg[3]

        const checksum = msg[2]
        const csdata = []; // checksum data
        const bids_keys = psnap_['bids']
        const asks_keys = psnap_['asks']

        for (let i = 0; i < 25; i++) {
          if (bids_keys[i]) {
            const price = bids_keys[i]
            const pp = bids[price]
            if (pp) {
              csdata.push(pp.price, pp.amount)
            }
          }
          if (asks_keys[i]) {
            const price = asks_keys[i]
            const pp = asks[price]
            if (pp) {
              csdata.push(pp.price, -pp.amount)
            }
          }
        }

        const cs_str = csdata.join(':')
        const cs_calc = CRC.str(cs_str)

        if (cs_calc !== checksum) {
          console.error('CHECKSUM_FAILED')
        }
        return;
      }

      if (mcnt_ === 0) {
        _.each(msg[1], function (msgKeys) {
          const pp: IOrderBookItem = { price: msgKeys[0], count: msgKeys[1], amount: msgKeys[2] }
          pp.amount = Math.abs(pp.amount)
          if (pp.amount >= 0) {
            dispatch(updateBidItemThunk(pp));
            bids_[pp.price] = pp;
          }
          else {
            dispatch(updateAskItemThunk(pp));
            asks_[pp.price] = pp;
          }
        })
      } else {
        const cseq = +msg[2]
        const msgKeys = msg[1]

        if (!seq) {
          seq = cseq - 1;
        }

        if (cseq - seq !== 1) {
          console.error('OUT OF SEQUENCE', seq, cseq)
          return;
        }

        seq = cseq

        let pp = { price: msgKeys[0], count: msgKeys[1], amount: msgKeys[2] }

        if (!pp.count) {
          if (pp.amount > 0 && bids_[pp.price]) {
            dispatch(deleteBidItemThunk(pp.price));
            delete bids_[pp.price];
          } else if (pp.amount < 0 && asks_[pp.price]) {
            dispatch(deleteAskItemThunk(pp.price));
            delete asks_[pp.price];
          }
        } else {
          const isBids = pp.amount >= 0;
          console.log(">>> ~ isBids:", isBids);
          pp.amount = Math.abs(pp.amount)
          if (isBids) {
            dispatch(updateBidItemThunk(pp));
            bids_[pp.price] = pp;
          }
          else {
            dispatch(updateAskItemThunk(pp));
            asks_[pp.price] = pp;
          }
        }
      }

      _.each(['bids', 'asks'], function (side: "bids" | "asks") {
        let sbook = side === "bids" ? bids_ : asks_
        let bprices = Object.keys(sbook)

        let prices = bprices.sort(function (a, b) {
          if (side === 'bids') {
            return +a >= +b ? -1 : 1
          } else {
            return +a <= +b ? -1 : 1
          }
        })

        dispatch(updatePsnapItemThunk({ side, prices }));
        psnap_[side] = prices;
      })

      dispatch(increaseMessageCountThunk())
      mcnt_++;
    })
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  function disconnect() {
    cli?.send(JSON.stringify({ event: 'unsubscribe', chanId: channelId }));
    setDisableConnection(true);
  }

  // recover after a lost network connection
  setInterval(function () {
    if (connected || isConnectionDisabled) return
    connect()
  }, 60000)

  return {
    bids,
    asks,
    psnap,
    mcnt,
    connect,
    disconnect
  }
}