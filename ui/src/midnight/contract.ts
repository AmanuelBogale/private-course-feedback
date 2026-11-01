// Wires the compiled feedback contract and its witnesses for the browser.
import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";
import {
  Contract,
  ledger,
  pureCircuits,
  type Ledger,
} from "../../../contract/managed/feedback/contract/index.js";
import { witnesses, type FeedbackPrivateState } from "../../../contract/witnesses.js";
import type { PrivateStateStorage } from "./private-state";

export { Contract, ledger, pureCircuits, type Ledger, type FeedbackPrivateState };

/** Every provable circuit, i.e. every ZK key set copy-zk.mjs serves. */
export type FeedbackCircuits = "enroll" | "submitReview";

/** A student's (or the organizer's) secret key. It never leaves this browser. */
export const createInitialPrivateState = (secretKey: Uint8Array): FeedbackPrivateState => ({
  secretKey,
});
export const PRIVATE_STATE_ID = "feedbackPrivateState";

/** Persistent: the secret key survives a reload, encrypted with a passphrase. */
export const PRIVATE_STATE_STORAGE: PrivateStateStorage = "persistent";

/** Where copy-zk.mjs puts the keys and zkir, relative to the page origin. */
export const ZK_ASSETS_PATH = "managed/feedback";

export const CompiledFeedbackContract = CompiledContract.make("FeedbackContract", Contract).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets(ZK_ASSETS_PATH),
);
