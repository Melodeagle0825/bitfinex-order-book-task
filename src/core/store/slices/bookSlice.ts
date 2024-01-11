import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { IOrderBookItem } from "../../interfaces/book.type";

export interface BookSlice {
  bids: {
    [price: string]: IOrderBookItem
  },
  asks: {
    [price: string]: IOrderBookItem
  },

  // price snapshot
  psnap: {
    "bids": Array<string>,
    "asks": Array<string>
  },

  // message count
  mcnt: number
}

const initialState: BookSlice = {
  bids: {},
  asks: {},
  psnap: {
    "bids": [],
    "asks": []
  },
  mcnt: 0
};

const bookSlice = createSlice({
  name: "book",
  initialState,
  reducers: {
    initializeBooksThunk(state) {
      state = initialState;
    },
    increaseMessageCountThunk(state) {
      state.mcnt += 1;
    },
    updateBidItemThunk(state, { payload }: PayloadAction<IOrderBookItem>) {
      state.bids[payload.price] = payload
    },
    deleteBidItemThunk(state, { payload }: PayloadAction<string>) {
      delete state.bids[payload]
    },
    updateAskItemThunk(state, { payload }: PayloadAction<IOrderBookItem>) {
      state.asks[payload.price] = payload
    },
    deleteAskItemThunk(state, { payload }: PayloadAction<string>) {
      delete state.asks[payload]
    },
    updatePsnapItemThunk(state, { payload }: PayloadAction<{ side: "bids" | "asks", prices: Array<string> }>) {
      state.psnap[payload.side] = payload.prices;
    },
  }
});

export const {
  initializeBooksThunk,
  increaseMessageCountThunk,
  updateBidItemThunk,
  updateAskItemThunk,
  updatePsnapItemThunk,
  deleteBidItemThunk,
  deleteAskItemThunk
} = bookSlice.actions;

export default bookSlice.reducer;
