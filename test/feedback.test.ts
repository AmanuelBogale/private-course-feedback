import { describe, it, expect, beforeEach } from 'vitest';
import {
  createCircuitContext,
  createConstructorContext,
  dummyContractAddress,
} from '@midnight-ntwrk/compact-runtime';
import { Contract, ledger, pureCircuits } from '../contract/managed/feedback/contract/index.js';
import { witnesses, type FeedbackPrivateState } from '../contract/witnesses.js';

const COIN = '00'.repeat(32);
const ADDR = dummyContractAddress();
const key = (n: number) => {
  const a = new Uint8Array(32);
  a[31] = n;
  return a;
};
const ORGANIZER = key(100);
const ALICE = key(1);
const BOB = key(2);
const MALLORY = key(3);

const as = (ctx: any, sk: Uint8Array) => ({
  ...ctx,
  currentPrivateState: { secretKey: sk } as FeedbackPrivateState,
});

describe('anonymous course feedback', () => {
  let contract: Contract<FeedbackPrivateState>;
  let ctx: any;

  beforeEach(() => {
    contract = new Contract<FeedbackPrivateState>(witnesses);
    const ctor = contract.initialState(
      createConstructorContext({ secretKey: ORGANIZER }, COIN),
    );
    ctx = createCircuitContext(ADDR, COIN, ctor.currentContractState, {
      secretKey: ORGANIZER,
    });
    // The organizer enrolls Alice and Bob (not Mallory).
    ctx = contract.impureCircuits.enroll(ctx, pureCircuits.derivePublicKey(ALICE)).context;
    ctx = contract.impureCircuits.enroll(ctx, pureCircuits.derivePublicKey(BOB)).context;
  });

  const state = () => ledger(ctx.currentQueryContext.state);

  it('lets an enrolled student post a review that adds to the star count', () => {
    ctx = contract.impureCircuits.submitReview(as(ctx, ALICE), 5n).context;
    expect(state().fiveStar).toBe(1n);
    expect(state().oneStar).toBe(0n);
  });

  it('counts different students separately', () => {
    ctx = contract.impureCircuits.submitReview(as(ctx, ALICE), 5n).context;
    ctx = contract.impureCircuits.submitReview(as(ctx, BOB), 2n).context;
    expect(state().fiveStar).toBe(1n);
    expect(state().twoStar).toBe(1n);
    expect(state().usedNullifiers.size()).toBe(2n);
  });

  it('blocks a second review from the same student', () => {
    ctx = contract.impureCircuits.submitReview(as(ctx, ALICE), 4n).context;
    expect(() => contract.impureCircuits.submitReview(as(ctx, ALICE), 1n)).toThrow(
      'Already reviewed',
    );
    expect(state().oneStar).toBe(0n);
  });

  it('rejects a student who was never enrolled', () => {
    expect(() => contract.impureCircuits.submitReview(as(ctx, MALLORY), 5n)).toThrow(
      'not enrolled',
    );
  });

  it("rejects someone who submits another student's path", () => {
    const stolen = new Contract<FeedbackPrivateState>({
      ...witnesses,
      findEnrolledPath: ({ privateState, ledger: l }) => [
        privateState,
        l.enrolled.findPathForLeaf(pureCircuits.derivePublicKey(ALICE))!,
      ],
    });
    expect(() => stolen.impureCircuits.submitReview(as(ctx, MALLORY), 5n)).toThrow(
      'Path is not for this student',
    );
  });

  it('only lets the organizer enroll students', () => {
    expect(() =>
      contract.impureCircuits.enroll(as(ctx, MALLORY), pureCircuits.derivePublicKey(MALLORY)),
    ).toThrow('Only the organizer can enroll');
  });

  it('rejects ratings outside 1 to 5', () => {
    expect(() => contract.impureCircuits.submitReview(as(ctx, ALICE), 0n)).toThrow(
      'Rating must be 1 to 5',
    );
    expect(() => contract.impureCircuits.submitReview(as(ctx, ALICE), 6n)).toThrow(
      'Rating must be 1 to 5',
    );
  });

  it("does not put a student's enrolled key or secret on the ledger when they review", () => {
    ctx = contract.impureCircuits.submitReview(as(ctx, ALICE), 3n).context;
    const nullifiers = [...state().usedNullifiers];
    expect(nullifiers.length).toBe(1);
    expect(state().usedNullifiers.member(pureCircuits.derivePublicKey(ALICE))).toBe(false);
    expect(state().usedNullifiers.member(ALICE)).toBe(false);
  });
});
