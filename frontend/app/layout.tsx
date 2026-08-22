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
      <head>
        {/* Design-system fonts (DESIGN.md): Outfit for UI chrome, JetBrains Mono for data */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full bg-[#111111] text-[#f5f5f5] flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
