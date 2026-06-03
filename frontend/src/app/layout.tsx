import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BRAHMO Composition Agent — Token Budget + 8-Block Assembly",
  description:
    "An intelligent context composition engine that assembles, compresses, and fits structured knowledge nodes into a strict token budget for AI-assisted clinical decision support.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
