import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SnapbQuarterback",
  description:
    "Build your own ranking of all 32 NFL starting quarterbacks, try blind mode, or pick a champion in the QB bracket.",
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
