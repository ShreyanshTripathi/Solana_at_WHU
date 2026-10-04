import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Nav } from "@/components/Nav";
import { authConfig } from "@/lib/auth/config";
import { I18nProvider } from "@/lib/i18n/client";
import { getI18n } from "@/lib/i18n/server";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: "Volty", description: m.meta.description };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { locale } = await getI18n();
  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* Browser extensions (e.g. Grammarly) add attributes to <body> before React loads; ignore those differences here only. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <I18nProvider locale={locale}>
          <Providers privyAppId={authConfig().privyEnabled ? authConfig().privyAppId : null}>
            <Nav />
            {children}
          </Providers>
        </I18nProvider>
      </body>
    </html>
  );
}
