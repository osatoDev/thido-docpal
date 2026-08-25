"use client";

import { useEffect } from "react";

import {
  APPLICATION_STYLE_COOKIE_NAME,
  type ApplicationStyle,
} from "@/lib/applicationStyle";

export function ApplicationStyleSync({
  applicationStyle,
}: {
  applicationStyle: ApplicationStyle;
}) {
  useEffect(() => {
    document.documentElement.dataset.appStyle = applicationStyle;
    document.cookie = `${APPLICATION_STYLE_COOKIE_NAME}=${applicationStyle}; Max-Age=31536000; Path=/; SameSite=Lax${
      window.location.protocol === "https:" ? "; Secure" : ""
    }`;
  }, [applicationStyle]);

  return null;
}
