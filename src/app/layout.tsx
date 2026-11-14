import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

const description = "Streaming LLM chat with auth, persistence, and usage-based credit billing.";

export const metadata: Metadata = {
  title: "Nimbus AI: full-stack AI SaaS starter",
  description,
  openGraph: {
    title: "Nimbus AI: full-stack AI SaaS starter",
    description,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${GeistSans.variable} ${GeistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
