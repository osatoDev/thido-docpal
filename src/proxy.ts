import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;
  const hasSessionCookie = req.cookies.getAll().some(({ name }) =>
    name.startsWith("authjs.session-token") ||
    name.startsWith("__Secure-authjs.session-token"),
  );

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${req.nextUrl.search}`);
    loginUrl.searchParams.set(
      "notice",
      hasSessionCookie ? "session-expired" : "sign-in-required",
    );
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/documents/:id/edit/:path*",
    "/feedback/:path*",
    "/settings/:path*",
  ],
};
