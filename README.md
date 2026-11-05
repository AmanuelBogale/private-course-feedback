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

The contract uses `HistoricMerkleTree<10, Bytes<32>>` (up to 1,024 students per course), a `Set` of nullifiers, domain-separated `persistentHash` derivations, and `disclose()` only where a value is meant to be public.

## Repository layout

```
contract/feedback.compact   the Compact contract
contract/witnesses.ts       private-state code that runs on the student's device
test/feedback.test.ts       simulator tests (8 tests, no network needed)
ui/                         browser app (Vite + React), connects to the Lace wallet
```

The browser app is adapted from Midnight's own `hello-world` example UI (Apache-2.0).

## Setup and testing

Requirements: Node.js 22 and the Compact compiler 0.31.1. On Windows, use WSL2 with Ubuntu.

```
git clone https://github.com/AmanuelBogale/private-course-feedback.git
cd private-course-feedback
npm install
compact update 0.31.1
npm run compile
npm test
```

Expected result: 8 passing tests. They check that:
- an enrolled student can review and the star counts add up
- a second review from the same student is rejected
- a student who was never enrolled is rejected
- a student who reuses another student's membership path is rejected
- only the organizer can enroll
- ratings outside 1 to 5 are rejected
- the review does not put the student's enrolled key or secret on the ledger

## Run the web app on Midnight Preprod

You need the Lace wallet with a Midnight account on Preprod, funded with test tokens (tNIGHT from the faucet, then "Generate tDUST"), and Docker.

1. Start the proof server and leave it running:
   ```
   docker run -d --name proof-server -p 6300:6300 midnightntwrk/proof-server:8.0.3 midnight-proof-server -v
   ```
2. In Lace, set the network to Testnet, Midnight Preprod, with the proof server set to Local (`http://localhost:6300`).
3. Start the app:
   ```
   npm run ui:dev
   ```
4. Open `http://localhost:5173`, choose `preprod`, click Connect Wallet and approve in Lace.
5. Set a passphrase. It encrypts the secret key kept in your browser. There is no recovery, so write it down.
6. The organizer clicks Deploy, copies each student's public key into "Enroll", and shares the contract address. A student pastes the address into Join, copies their own public key to the organizer, and, once enrolled, submits a review.

Tested with Chrome and the Lace extension. In one Edge setup the wallet connection failed with a wallet-side error, so Chrome is the recommended browser.

## Privacy limits (please read)

- **Small groups give weak anonymity.** If only 3 students are enrolled, an observer can narrow things down.
- **The ledger shows each rating as it arrives.** It shows the star counter going up, but not who submitted it.
- **Transaction metadata is not hidden.** The wallet that pays the fee, and the timing, are visible. A student should submit from a fresh wallet if this matters.
- **The organizer sees the public keys they enroll.** The organizer cannot tell which enrolled key later posted a review.
- **A lost secret key cannot be recovered.** That student cannot review.
- One deployed contract is one course, and reviews are star ratings only (no text) in this version.

## Progress in Wave 3

- [x] Compact contract with enrollment, membership proof, nullifiers and star counters
- [x] Witness code and 8 passing simulator tests
- [x] Browser frontend that connects to Lace on Preprod
- [ ] First deployment and end-to-end review on Midnight Preprod
- [ ] Small pilot with real students, results, and lessons learned
- [ ] Demo video and slide deck

## License

Apache License 2.0. See [LICENSE](LICENSE).
