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
  title: "幽冥修仙 MUD | Netherworld Cultivation MUD",
  description: "Kiroween 2026 · Resurrection 赛道。重现 Telnet 时代文字修仙 MUD：LangGraph.js 多智能体驱动、3 位独立记忆 NPC、严格 RAG 藏经阁、人工确认中断卡与纯函数数值护栏。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
