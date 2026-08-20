"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { trackRedditConversion } from "@/lib/redditPixelEvents";

export function RedditSignupConversion() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("signup") !== "1") return;
    const conversionId = searchParams.get("conversionId");
    if (conversionId) trackRedditConversion("SignUp", conversionId);

    const params = new URLSearchParams(searchParams);
    params.delete("signup");
    params.delete("conversionId");
    const query = params.toString();
    router.replace(`${window.location.pathname}${query ? `?${query}` : ""}`, {
      scroll: false,
    });
    // Only ever consume the one-shot `?signup=1` trigger on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
