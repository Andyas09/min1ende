import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "SD Match - MIN 1 Ende | Smart Digital Make A Match",
  description:
    "Aplikasi Edukasi Interaktif Model Pembelajaran Kooperatif Make A Match (Belajar, Bermain, Berpikir, Berargumentasi) untuk MIN 1 Ende, Flores, Nusa Tenggara Timur.",
  icons: {
    icon: "/logo/min1ende.webp",
    apple: "/logo/min1ende.webp",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
