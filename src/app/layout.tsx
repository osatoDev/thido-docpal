import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { RollbarProvider } from "@/components/observability/RollbarProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SignedInFeedbackLauncher } from "@/components/feedback/SignedInFeedbackLauncher";
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
  title: "Thido — Think clearly. Draft confidently.",
  description: "An AI document companion for thoughtful first drafts and collaborative refinement.",
  icons: { icon: "/thido-docpal-mark.svg" },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const savedTheme = (await cookies()).get(THEME_COOKIE_NAME)?.value;
  const theme = isTheme(savedTheme) ? savedTheme : "light";

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      data-theme={theme}
    >
      <body className="flex min-h-full flex-col">
        <RollbarProvider>
          {children}
          <SignedInFeedbackLauncher />
          <ThemeToggle />
          <Analytics />
        </RollbarProvider>
      </body>
    </html>
  );
}
