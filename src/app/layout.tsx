import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";
import { GoogleAdsTag } from "@/components/GoogleAdsTag";
import { RedditPixel } from "@/components/RedditPixel";
import { SignedInPageActions } from "@/components/SignedInPageActions";
import { SignupConversions } from "@/components/SignupConversions";
import { getCurrentSession } from "@/lib/currentSession";
import { isTheme, THEME_COOKIE_NAME } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Thido | Plan your days in plain language.",
  description:
    "A day planner with AI. Type a task the way you would say it, and Thido puts it under the right day and time, then reviews your plan when you ask.",
  icons: { icon: "/thido-docpal-mark.svg" },
};

async function SessionPageActions() {
  const session = await getCurrentSession();

  return <SignedInPageActions signedIn={Boolean(session?.user?.id)} />;
}

async function SessionRedditPixel() {
  const session = await getCurrentSession();

  return (
    <RedditPixel
      email={session?.user?.email}
      externalId={session?.user?.id}
    />
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const savedTheme = cookieStore.get(THEME_COOKIE_NAME)?.value;
  const theme = isTheme(savedTheme) ? savedTheme : "light";

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      data-theme={theme}
    >
      <body className="flex min-h-full flex-col">
        <Suspense fallback={null}>
          <SessionPageActions />
        </Suspense>
        {children}
        <Analytics />
        <GoogleAdsTag />
        <Suspense fallback={null}>
          <SessionRedditPixel />
        </Suspense>
        <Suspense fallback={null}>
          <SignupConversions />
        </Suspense>
      </body>
    </html>
  );
}
