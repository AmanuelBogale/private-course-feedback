import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DeploymentCard } from "@/components/deployment-card";
import { useContractState } from "@/hooks/use-contract-state";
import { useDeployment } from "@/hooks/use-deployment";
import {
  deployFeedback,
  enrollStudent,
  joinFeedback,
  myPublicKey,
  results$,
  submitReview,
} from "@/midnight/feedback-api";

const STAR_LABELS = ["1 star", "2 stars", "3 stars", "4 stars", "5 stars"];

export function FeedbackPanel() {
  const deployment = useDeployment({ deploy: deployFeedback, join: joinFeedback });
  const { providers, contract, address, busy, error, run } = deployment;

  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [studentKey, setStudentKey] = useState("");
  const [rating, setRating] = useState(5);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (providers && address && contract) {
      myPublicKey(providers, address)
        .then((key) => {
          if (!cancelled) setPublicKey(key);
        })
        .catch(() => {
          if (!cancelled) setPublicKey(null);
        });
    } else {
      setPublicKey(null);
    }
    return () => {
      cancelled = true;
    };
  }, [providers, address, contract]);

  const resultsObservable = useMemo(
    () => (providers && address ? results$(providers, address) : null),
    [providers, address],
  );
  const { state: results, error: stateError } = useContractState(resultsObservable);

  const copyKey = async () => {
    if (!publicKey) return;
    await navigator.clipboard.writeText(publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const onEnroll = () =>
    run("enrolling", async () => {
      if (!contract) return;
      await enrollStudent(contract, studentKey);
      setStudentKey("");
    });

  const onReview = () =>
    run("reviewing", async () => {
      if (!contract) return;
      await submitReview(contract, rating);
    });

  const maxCount = results ? results.counts.reduce((a, b) => (b > a ? b : a), 1n) : 1n;

  return (
    <div className="flex flex-col gap-6">
      <DeploymentCard deployment={deployment} />

      {providers && address && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>2. Your public key</CardTitle>
              <CardDescription>
                Students: send this key to the course organizer so they can enroll you. It is a
                hash of a secret that stays in this browser. Keep your passphrase safe: losing the
                secret means you cannot review.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <code className="break-all rounded bg-muted p-2 text-xs" data-testid="public-key">
                {publicKey ?? "Loading..."}
              </code>
              <div>
                <Button variant="outline" onClick={() => void copyKey()} disabled={!publicKey}>
                  {copied ? "Copied" : "Copy public key"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Organizer: enroll a student</CardTitle>
              <CardDescription>
                Paste a student's public key. Only the browser that deployed the course can enroll.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void onEnroll();
                }}
              >
                <Input
                  aria-label="Student public key"
                  placeholder="64 hex characters"
                  value={studentKey}
                  onChange={(e) => setStudentKey(e.target.value)}
                />
                <Button type="submit" disabled={busy !== null || !contract || studentKey.trim() === ""}>
                  {busy === "enrolling" && <Loader2 className="animate-spin" />}
                  Enroll
                </Button>
              </form>
              {busy === "enrolling" && (
                <p className="text-xs text-muted-foreground">
                  Proving, then waiting for wallet approval and finalization.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Student: leave an anonymous review</CardTitle>
              <CardDescription>
                Your device proves you are on the enrolled list without saying which student you
                are. You can review once.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Button
                    key={n}
                    type="button"
                    variant={rating === n ? "default" : "outline"}
                    onClick={() => setRating(n)}
                  >
                    {n}
                  </Button>
                ))}
              </div>
              <div>
                <Button onClick={() => void onReview()} disabled={busy !== null || !contract}>
                  {busy === "reviewing" && <Loader2 className="animate-spin" />}
                  Submit {rating}-star review
                </Button>
              </div>
              {busy === "reviewing" && (
                <p className="text-xs text-muted-foreground">
                  Building the membership proof. This can take a little while on a laptop.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Results</CardTitle>
              <CardDescription>
                Star counts straight from the public ledger. No review is tied to a student.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2" data-testid="results">
              {results === null ? (
                <span className="text-muted-foreground">Loading...</span>
              ) : (
                <>
                  {results.counts.map((count, i) => (
                    <div key={STAR_LABELS[i]} className="flex items-center gap-3 text-sm">
                      <span className="w-16">{STAR_LABELS[i]}</span>
                      <div className="h-3 flex-1 rounded bg-muted">
                        <div
                          className="h-3 rounded bg-primary"
                          style={{ width: `${Number((count * 100n) / maxCount)}%` }}
                        />
                      </div>
                      <span className="w-8 text-right">{count.toString()}</span>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Total reviews: {results.total.toString()}
                  </p>
                </>
              )}
              {stateError && <p className="text-xs text-destructive">{stateError.message}</p>}
            </CardContent>
          </Card>
        </>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
