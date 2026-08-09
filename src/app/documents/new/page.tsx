import { NewDocumentLanding } from "@/components/landing/NewDocumentLanding";
import { getCurrentSession } from "@/lib/currentSession";

export default async function NewDocumentPage({
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
