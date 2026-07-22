import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;
  const hasSessionCookie = req.cookies.getAll().some(({ name }) =>
    name.startsWith("authjs.session-token") ||
    name.startsWith("__Secure-authjs.session-token"),
  );

  const isPublicRoute =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/verify-email" ||
    pathname === "/forbidden" ||
    pathname === "/terms" ||
    pathname === "/privacy" ||
    pathname === "/documents/new" ||
    pathname.startsWith("/api/") ||
    /\.[^/]+$/.test(pathname);

  if (!isLoggedIn && !isPublicRoute) {
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
