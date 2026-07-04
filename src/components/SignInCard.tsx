import { useSession } from "../auth/client";
import { MagicLinkForm } from "./MagicLinkForm";
import { NamePrompt } from "./NamePrompt";

/**
 * Leaderboard sign-in shown in the result overlay after a completed game.
 * - signed in with a name → confirm they're on the leaderboard
 * - signed in without a name → prompt for one
 * - signed out → name + email magic-link form
 */
export function SignInCard() {
  const { data: session, isPending } = useSession();
  if (isPending) return null;
  const user = session?.user;

  if (user?.name) {
    return (
      <div className="signin signin--done">
        <p className="signin__hint signin__hint--center">
          Sei nella classifica come <strong>{user.name}</strong>.
        </p>
      </div>
    );
  }

  if (user) {
    return <NamePrompt />;
  }

  return <MagicLinkForm hint="Salva il tuo nome per la classifica" showName />;
}
