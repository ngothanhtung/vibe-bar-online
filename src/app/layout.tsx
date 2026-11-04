import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Bungee } from "next/font/google";
import "./globals.css";

const body = Be_Vietnam_Pro({
  variable: "--font-body",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "700"],
});

const display = Bungee({
  variable: "--font-display",
  subsets: ["latin", "vietnamese"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Vibe Bar",
  description: "Vibe Bar: đi chùa online thì có rồi, giờ tới lượt quẩy bar online: gọi bia, cụng ly, bắn pháo giấy, xin quẻ đêm nay cùng cả nước.",
};

export const viewport: Viewport = {
  themeColor: "#05020a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${body.variable} ${display.variable} h-full antialiased`}>
      <body className="h-full">{children}</body>
    </html>
  );
}
