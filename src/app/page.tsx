import { redirect } from "next/navigation";

import { MarketingLanding } from "@/components/landing/MarketingLanding";
import { getCurrentSession } from "@/lib/currentSession";

export default async function Home() {
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    return <MarketingLanding />;
  }
  redirect("/plan");
}
