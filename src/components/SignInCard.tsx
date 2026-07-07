import { useEffect, useRef, useState } from "react";
import { useSession } from "../auth/client";
import { type SubmitScoreResult, submitScore } from "../leaderboard/client";
import type { ScoreSubmissionPayload } from "../leaderboard/types";
import { MagicLinkForm } from "./MagicLinkForm";
import { NamePrompt } from "./NamePrompt";

interface SignInCardProps {
  submission: ScoreSubmissionPayload | null;
}

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "done"; result: SubmitScoreResult }
  | { status: "error"; message: string };

/**
 * Leaderboard sign-in shown in the result overlay after a completed game.
 * - signed in with a name → submit the score (once) and show the rank
 * - signed in without a name → prompt for one
 * - signed out → name + email magic-link form
 */
export function SignInCard({ submission }: SignInCardProps) {
  const { data: session, isPending } = useSession();
  const user = session?.user;
  const [submitState, setSubmitState] = useState<SubmitState>({
    status: "idle",
  });
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!user?.name || !submission || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitState({ status: "submitting" });
    submitScore(submission).then((res) => {
      if (res.ok) {
        setSubmitState({ status: "done", result: res.value });
      } else {
        submittedRef.current = false;
        setSubmitState({ status: "error", message: res.error });
      }
    });
  }, [user?.name, submission]);

  if (isPending) return null;

  if (user?.name) {
    return (
      <div className="signin signin--done">
        {submitState.status === "submitting" && (
          <p className="signin__hint signin__hint--center">Salvataggio…</p>
        )}
        {submitState.status === "done" && (
          <p className="signin__hint signin__hint--center">
            Sei nella classifica come <strong>{user.name}</strong> — posizione{" "}
            <strong>#{submitState.result.rank}</strong> su{" "}
            {submitState.result.totalPlayers}.
          </p>
        )}
        {submitState.status === "error" && (
          <p className="signin__hint signin__hint--center">
            Sei nella classifica come <strong>{user.name}</strong>.{" "}
            <span className="signin__error">{submitState.message}</span>
          </p>
        )}
        {submitState.status === "idle" && (
          <p className="signin__hint signin__hint--center">
            Sei nella classifica come <strong>{user.name}</strong>.
          </p>
        )}
      </div>
    );
  }

  if (user) {
    return <NamePrompt />;
  }

  return (
    <MagicLinkForm
      hint="Salva il punteggio: ti mandiamo un link via email"
      showName
      pendingSubmission={submission}
    />
  );
}
