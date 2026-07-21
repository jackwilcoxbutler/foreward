import type { Metadata } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "Rounds — Share your round, hole by hole",
    template: "%s · Rounds",
  },
  description:
    "Search your course, enter your scorecard, and share a colorful golf summary made for the group chat.",
  openGraph: {
    title: "Rounds — Share your round, hole by hole",
    description: "A golf scorecard made for the group chat.",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Rounds — Share your round, hole by hole",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
