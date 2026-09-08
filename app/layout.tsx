import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://otherlife-store-preview.povend-dev.chatgpt.site"),
  title: "OTHERLIFE — Beyond Ordinary",
  description: "Premium streetwear designed in Morocco. Beyond ordinary.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "OTHERLIFE — Beyond Ordinary",
    description: "Premium streetwear designed in Morocco.",
    url: "https://otherlife-store-preview.povend-dev.chatgpt.site",
    siteName: "OTHERLIFE",
    images: [{ url: "/og.png", width: 1729, height: 910, alt: "OTHERLIFE — Beyond Ordinary" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OTHERLIFE — Beyond Ordinary",
    description: "Premium streetwear designed in Morocco.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
