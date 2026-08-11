import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SignedInPageActions } from "@/components/SignedInPageActions";
import {
  APPLICATION_STYLE_COOKIE_NAME,
  DEFAULT_APPLICATION_STYLE,
  isApplicationStyle,
} from "@/lib/applicationStyle";
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
  title: "Thido | Think clearly. Draft confidently.",
  description: "An AI document companion for thoughtful first drafts and collaborative refinement.",
  icons: { icon: "/thido-docpal-mark.svg" },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [cookieStore, session] = await Promise.all([
    cookies(),
    getCurrentSession(),
  ]);
  const savedTheme = cookieStore.get(THEME_COOKIE_NAME)?.value;
  const theme = isTheme(savedTheme) ? savedTheme : "light";
  const savedApplicationStyle = cookieStore.get(
    APPLICATION_STYLE_COOKIE_NAME,
  )?.value;
  const applicationStyle = isApplicationStyle(session?.user?.applicationStyle)
    ? session.user.applicationStyle
    : isApplicationStyle(savedApplicationStyle)
      ? savedApplicationStyle
      : DEFAULT_APPLICATION_STYLE;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      data-theme={theme}
      data-app-style={applicationStyle}
    >
      <body className="flex min-h-full flex-col">
        <SignedInPageActions signedIn={Boolean(session?.user?.id)} />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
