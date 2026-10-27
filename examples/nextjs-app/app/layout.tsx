import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Grounded AI Response Example",
  description: "A Next.js App Router example for React AI Grounded Responses.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
