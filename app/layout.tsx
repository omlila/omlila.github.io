import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Omlila Labs | Offline-First AI",
  description: "Privacy from the cloud. Connectivity for the remote. Reliable AI tools for daily life, designed to work wherever you are.",
  keywords: ["Offline AI", "5G Community Software", "Nepal AI Startup"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased bg-stone-950 text-stone-200 font-sans`}>
        {children}
      </body>
    </html>
  );
}
