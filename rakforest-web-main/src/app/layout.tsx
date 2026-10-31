import type { Metadata } from "next";
import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";
export const metadata: Metadata = { title: "RakForest — ศูนย์ตรวจสอบเสียงป่า", description: "ต้นแบบสาธิตระบบตรวจสอบเสียงและส่งงานภาคสนาม" };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="th"><body>{children}<script src="https://mcp.figma.com/mcp/html-to-design/capture.js" async /></body></html>; }

