import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk, PT_Mono } from "next/font/google";
import "./globals.css";

const inter = Space_Grotesk({ subsets: ["latin"] });

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Admin | Hasapay WAAS",
  description: "Admin dashboard for Hasapay",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
