import type { Metadata } from "next";
import { cookies } from "next/headers";
import { IBM_Plex_Mono, Inter, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";
import { GoogleAdsTag } from "@/components/GoogleAdsTag";
import { RedditPixel } from "@/components/RedditPixel";
import { SignupConversions } from "@/components/SignupConversions";
import { getCurrentSession } from "@/lib/currentSession";
import { isTheme, THEME_COOKIE_NAME } from "@/lib/theme";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Thido | Write it like you'd say it",
  description:
    "A day planner with AI. Type a task in one line, and Thido puts it on the right day, at the right time, in order. Ask for a quick read on any day.",
  icons: { icon: "/thido-docpal-mark.svg" },
};

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
      className={`${inter.variable} ${spaceGrotesk.variable} ${plexMono.variable} h-full antialiased`}
      data-theme={theme}
    >
      <body className="flex min-h-full flex-col">
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
