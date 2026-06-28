import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import FloatingChat from "@/components/FloatingChat";
import InteractionFeedback from "@/components/InteractionFeedback";
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
  title: "Nihongo Sense Lab",
  description: "Advanced Japanese learning workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <InteractionFeedback />
        {children}
        <FloatingChat />
      </body>
    </html>
  );
}
