import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://snapquarterback.com";
const previewImage = new URL("/opengraph-image.png", siteUrl).toString();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "snapquarterback",
  description:
    "Build your own ranking of all 32 NFL starting quarterbacks, try blind mode, or pick a champion in the QB bracket.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "snapquarterback",
    description:
      "Build your own ranking of all 32 NFL starting quarterbacks, try blind mode, or pick a champion in the QB bracket.",
    url: siteUrl,
    siteName: "snapquarterback",
    images: [
      {
        url: previewImage,
        width: 4356,
        height: 2715,
        alt: "snapquarterback hat logo",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "snapquarterback",
    description:
      "Build your own ranking of all 32 NFL starting quarterbacks, try blind mode, or pick a champion in the QB bracket.",
    images: [new URL("/twitter-image.png", siteUrl).toString()],
  },
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
