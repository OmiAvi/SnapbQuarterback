import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SnapbQuarterback",
  description:
    "Build your own ranking of all 32 NFL starting quarterbacks, save your board, and compare it with other fans.",
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
