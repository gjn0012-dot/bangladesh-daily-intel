import type { Metadata } from "next";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  title: "孟加拉每日头条｜业务情报与项目机会",
  description: "面向孟加拉市场开发与项目经营的新闻情报、可信度核验和机会预警平台。",
  manifest: `${basePath}/manifest.webmanifest`,
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: `${basePath}/favicon.svg`,
    shortcut: `${basePath}/favicon.svg`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className="antialiased"
      >
        {children}
      </body>
    </html>
  );
}
