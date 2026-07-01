import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OperatorLayer Lite",
  description: "Fake-money spend controls for AI agents."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

