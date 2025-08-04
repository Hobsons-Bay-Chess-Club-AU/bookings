import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import CookieConsentWrapper from "@/components/ui/cookie-consent-wrapper";
import ConditionalLayout from "@/components/layout/conditional-nav";
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
  title: "Hobsons Bay Chess Club Bookings",
  description: "Bookings for Hobsons Bay Chess Club events",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        cz-shortcut-listen="true"
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <CookieConsentWrapper>
          <ConditionalLayout>
            {children}
          </ConditionalLayout>
        </CookieConsentWrapper>
      </body>
    </html>
  );
}
