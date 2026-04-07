import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import { AppSidebar } from "@/components/app-sidebar";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PNCP Search – Busca de Licitações",
  description: "Busca e análise de licitações do Portal Nacional de Contratações Públicas (PNCP).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <Providers>
          <div className="flex h-screen">
            <AppSidebar />
            <main className="flex-1 overflow-auto p-6 pt-20 md:pt-6">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
