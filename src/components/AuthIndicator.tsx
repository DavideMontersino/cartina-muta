import { signOut, useSession } from "../auth/client";

/** Small "signed in as X · sign out" chip. Renders nothing when signed out. */
export function AuthIndicator() {
  const { data: session, isPending } = useSession();
  if (isPending || !session?.user) return null;

  return (
    <div className="auth-indicator">
      <span className="auth-indicator__name">
        {session.user.name || session.user.email}
      </span>
      <button
        type="button"
        className="auth-indicator__signout"
        onClick={() => signOut()}
      >
        Esci
      </button>
    </div>
  );
}
