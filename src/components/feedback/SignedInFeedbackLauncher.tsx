import { FounderFeedbackLauncher } from "@/components/feedback/FounderFeedbackLauncher";
import { auth } from "@/lib/auth";

export async function SignedInFeedbackLauncher() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return <FounderFeedbackLauncher />;
}
