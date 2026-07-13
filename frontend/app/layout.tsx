import type { Metadata } from "next";
import "./globals.css";

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
      <body className="h-full bg-[#111111] text-[#f5f5f5] flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
