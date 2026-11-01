import {
  deployContract,
  findDeployedContract,
  type FoundContract,
} from "@midnight-ntwrk/midnight-js-contracts";
import type { ContractAddress } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import { map, type Observable } from "rxjs";
import {
  CompiledFeedbackContract,
  createInitialPrivateState,
  ledger,
  pureCircuits,
  PRIVATE_STATE_ID,
  type Contract,
} from "./contract";
import type { FeedbackProviders } from "./providers";

export type FeedbackContract = FoundContract<Contract>;

const randomSecret = () => crypto.getRandomValues(new Uint8Array(32));

export const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

export function fromHex(hex: string): Uint8Array {
  const clean = hex.trim().replace(/^0x/i, "");
  if (!/^[0-9a-fA-F]{64}$/.test(clean)) {
    throw new Error("A public key is exactly 64 hexadecimal characters.");
  }
  return Uint8Array.from(clean.match(/../g)!.map((pair) => parseInt(pair, 16)));
}

/**
 * Deploy a new course as its organizer. The new secret is stored as private
 * state on this device; the constructor hashes it into the public `organizer` field.
 */
export async function deployFeedback(
  providers: FeedbackProviders,
): Promise<{ contract: FeedbackContract; address: ContractAddress }> {
  const deployed = await deployContract(providers, {
    compiledContract: CompiledFeedbackContract,
    privateStateId: PRIVATE_STATE_ID,
    initialPrivateState: createInitialPrivateState(randomSecret()),
  });
  return {
    contract: deployed,
    address: deployed.deployTxData.public.contractAddress,
  };
}

/**
 * Join an existing course. Reuse the secret already stored for this contract
 * (a reload, or the organizer coming back); create a new one only for a new student.
 */
export async function joinFeedback(
  providers: FeedbackProviders,
  address: ContractAddress,
): Promise<FeedbackContract> {
  providers.privateStateProvider.setContractAddress(address);
  const stored = await providers.privateStateProvider.get(PRIVATE_STATE_ID);
  if (stored !== null) {
    return findDeployedContract(providers, {
      compiledContract: CompiledFeedbackContract,
      contractAddress: address,
      privateStateId: PRIVATE_STATE_ID,
    });
  }
  return findDeployedContract(providers, {
    compiledContract: CompiledFeedbackContract,
    contractAddress: address,
    privateStateId: PRIVATE_STATE_ID,
    initialPrivateState: createInitialPrivateState(randomSecret()),
  });
}

/** This browser's public key for the course (hex), or null if there is no secret yet. */
export async function myPublicKey(
  providers: FeedbackProviders,
  address: ContractAddress,
): Promise<string | null> {
  providers.privateStateProvider.setContractAddress(address);
  const state = await providers.privateStateProvider.get(PRIVATE_STATE_ID);
  return state === null ? null : toHex(pureCircuits.derivePublicKey(state.secretKey));
}

/** Organizer only: add a student's public key to the Merkle tree. */
export async function enrollStudent(contract: FeedbackContract, publicKeyHex: string): Promise<void> {
  await contract.callTx.enroll(fromHex(publicKeyHex));
}

/** Enrolled students only: post one anonymous 1 to 5 star review. */
export async function submitReview(contract: FeedbackContract, rating: number): Promise<void> {
  await contract.callTx.submitReview(BigInt(rating));
}

export interface Results {
  /** Number of reviews for 1, 2, 3, 4 and 5 stars. */
  counts: [bigint, bigint, bigint, bigint, bigint];
  /** Total reviews so far (used nullifiers). */
  total: bigint;
}

/** Live results straight from the public ledger. */
export function results$(providers: FeedbackProviders, address: ContractAddress): Observable<Results> {
  return providers.publicDataProvider
    .contractStateObservable(address, { type: "latest" })
    .pipe(
      map((state) => {
        const l = ledger(state.data);
        return {
          counts: [l.oneStar, l.twoStar, l.threeStar, l.fourStar, l.fiveStar] as Results["counts"],
          total: l.usedNullifiers.size(),
        };
      }),
    );
}
