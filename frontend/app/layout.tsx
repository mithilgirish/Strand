import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Layout components
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
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
    <html lang="en" className="h-full antialiased dark" data-theme="dark">
      <body className={`${outfit.variable} ${jetbrainsMono.variable} h-full bg-background text-on-background flex overflow-hidden font-sans`}>
        {/* Sidebar */}
        <Sidebar />

        {/* Content Container */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Top Bar */}
          <TopBar />

          {/* Main Page Area */}
          <main className="flex-1 overflow-y-auto bg-background p-10">
            <div className="max-w-[1440px] mx-auto h-full">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
