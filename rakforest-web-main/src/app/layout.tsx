import type { Metadata, Viewport } from "next";
import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";

export const metadata: Metadata = {
  title: "RakForest — ระบบเฝ้าระวังไฟป่าและตรวจจับเสียงผิดปกติในป่าไม้",
  description:
    "ระบบศูนย์สั่งการ GIS ตรวจจับเสียงผิดปกติในป่าด้วย AI (AudioCNN) บริหารจัดการโซนป่าไม้ เสาไมค์ตรวจจับเสียง และปฏิบัติการภาคสนาม",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#1B4332",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="min-h-screen bg-[#F2F4F1] text-[#14241B] antialiased"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
