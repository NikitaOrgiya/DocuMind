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
  title: "DocuMind — AI-ассистент по базе знаний",
  description:
    "DocuMind отвечает на вопросы по подготовленной базе документов с помощью retrieval-augmented generation и всегда показывает свои источники.",
  other: {
    // Google Translate honors this even when a browser's UI language
    // differs from the page's declared `lang` — see translate="no" below,
    // which is the primary defense (a correctly declared lang="ru" page
    // usually isn't offered translation to a ru-locale browser at all).
    google: "notranslate",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      translate="no"
      className={`notranslate ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex h-full min-h-full flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
