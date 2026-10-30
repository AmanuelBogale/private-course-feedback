import type { Witnesses } from './managed/feedback/contract/index.js';

// Everything in here stays on the student's own device.
export type FeedbackPrivateState = {
  readonly secretKey: Uint8Array;
};

export const witnesses: Witnesses<FeedbackPrivateState> = {
  secretKey: ({ privateState }) => [privateState, privateState.secretKey],

  // Finds this student's place in the public Merkle tree of enrolled keys.
  findEnrolledPath: ({ privateState, ledger }, pk) => {
    const path = ledger.enrolled.findPathForLeaf(pk);
    if (!path) throw new Error('This student is not enrolled');
    return [privateState, path];
  },
};
