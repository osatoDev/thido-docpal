import { NewDocumentLanding } from "@/components/landing/NewDocumentLanding";
import { getCurrentSession } from "@/lib/currentSession";

/**
 * The "try Thido" entry point from the marketing landing page: the brief form
 * that turns a short prompt into a first draft. Guests can start here without an
 * account; the draft is claimed after they sign in. `/documents/new` remains the
 * post-sign-in resume target.
 */
export default async function TryThidoPage({
  searchParams,
}: {
  searchParams: Promise<{ resume?: string | string[] }>;
}) {
  const [session, params] = await Promise.all([
    getCurrentSession(),
    searchParams,
  ]);
  const resume = Array.isArray(params.resume) ? params.resume[0] : params.resume;

  return (
    <NewDocumentLanding
      user={session?.user ?? null}
      resumeGuestDraft={resume === "1"}
    />
  );
}
