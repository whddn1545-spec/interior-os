import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { SwRegister } from "@/components/sw-register";

import { ThemeProvider } from "@/components/theme-provider";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://interior-os.vercel.app"),
  title: {
    template: "%s | InteriorOS",
    default: "InteriorOS - 인테리어 자영업 AI 업무 자동화",
  },
  description: "견적서 작성부터 시공 관리, 고객 문자 발송까지. 인테리어 사장님을 위한 AI 비서",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "InteriorOS",
  },
  openGraph: {
    title: "InteriorOS",
    description: "인테리어 자영업 AI 업무 자동화",
    siteName: "InteriorOS",
    locale: "ko_KR",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#b85a2e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <SwRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
