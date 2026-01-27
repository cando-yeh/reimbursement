import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/Providers/ClientProviders";
import Layout from "@/components/Layout/Layout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "請款報銷系統",
  description: "全端 Next.js 請款報銷系統",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className={`${inter.className} antialiased`}>
        <ClientProviders>
          <Layout>
            {children}
          </Layout>
        </ClientProviders>
      </body>
    </html>
  );
}
