# Private Course Feedback

Anonymous course feedback on [Midnight](https://midnight.network), built for the Midnight Buildathon (Wave 3, Oct 27 to Nov 16, 2026).

Students rate a course from 1 to 5 stars. The course organizer can see the totals but cannot tell which student gave which rating. A student can review only once.

## The problem

Course feedback is often not honest because students fear being identified. Anonymous forms solve that, but anyone can fill them in many times. This project gives both: **only enrolled students can review, each only once, and nobody can link a review to a student.**

## How it works

1. The organizer deploys the contract. Their secret key stays on their device and only a hash of it is stored on-chain.
2. Each student creates a secret key on their own device and gives the organizer a **public key** (a hash of the secret). The organizer enrolls it. Enrolled public keys go into a public Merkle tree.
3. To review, the student's device proves in zero knowledge: "my key is somewhere in the tree of enrolled students", without saying which leaf.
4. The proof also publishes a **nullifier**, a different hash of the same secret. If the nullifier was already used, the review is rejected. This stops double reviewing, and the nullifier cannot be linked to the enrolled key.
5. Only the star counters change publicly.

## Midnight integration

| Piece | Where | Visible to everyone? |
|---|---|---|
| Organizer key hash, enrolled Merkle tree, nullifier set, star counters | Public ledger (`contract/feedback.compact`) | Yes |
| Student secret key, the student's Merkle path | Private state on the student's device (`contract/witnesses.ts`) | No |
| Membership proof, rating range check, one-review check | Zero-knowledge circuit (`submitReview`) | Only that it passed |

The contract uses `HistoricMerkleTree<10, Bytes<32>>` (up to 1,024 students per course), a `Set` of nullifiers, two domain-separated `persistentHash` derivations, and `disclose()` only where a value is meant to be public.

## Repository layout

```
contract/feedback.compact   the Compact contract
contract/witnesses.ts       private-state code that runs on the student's device
test/feedback.test.ts       simulator tests (8 tests, no network needed)
```

## Setup and testing

Requirements: Node.js 22, the Compact compiler 0.31.1. On Windows, use WSL2 with Ubuntu.

```
git clone https://github.com/<owner>/private-course-feedback.git
cd private-course-feedback
npm install
compact update 0.31.1
compact compile contract/feedback.compact contract/managed/feedback
npm test
```

Expected result: 8 passing tests. The tests check that:
- an enrolled student can review and the star counts add up
- a second review from the same student is rejected
- a student who was never enrolled is rejected
- a student who reuses another student's membership path is rejected
- only the organizer can enroll
- ratings outside 1 to 5 are rejected
- the review does not put the student's enrolled key or secret on the ledger

## Privacy limits (please read)

- **Small groups give weak anonymity.** If only 3 students are enrolled, an observer can narrow things down.
- **The ledger shows each rating as it arrives.** It shows the star counter going up, but not who submitted it.
- **Transaction metadata is not hidden.** The wallet that pays the fee, and the timing, are visible. A student should submit from a fresh wallet if this matters.
- **The organizer sees the public keys they enroll.** The organizer cannot tell which enrolled key later posted a review.
- **A lost secret key cannot be recovered.** That student cannot review.

## Progress in Wave 3

- [x] Compact contract with enrollment, membership proof, nullifiers and star counters
- [x] Witness code and 8 passing simulator tests
- [ ] Browser frontend using the Midnight wallet
- [ ] Deployment to Midnight Preprod
- [ ] Demo video and slide deck

## License

Apache License 2.0. See [LICENSE](LICENSE).
