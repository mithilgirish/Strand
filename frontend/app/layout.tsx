import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Layout components
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "STRAND Platform",
  description: "Causal Construction Intelligence Platform for EPC Delivery",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className={`${geistSans.variable} ${geistMono.variable} h-full bg-[#0E0E1F] text-slate-100 flex overflow-hidden`}>
        {/* Sidebar */}
        <Sidebar />

        {/* Content Container */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Top Bar */}
          <TopBar />

          {/* Main Page Area */}
          <main className="flex-1 overflow-y-auto bg-[#0E0E1F]">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
