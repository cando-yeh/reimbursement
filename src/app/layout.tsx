import type { Metadata } from "next";
import { Inter, Noto_Sans_TC } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/Providers/ClientProviders";
import Layout from "@/components/Layout/Layout";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const notoSansTC = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ['400', '500', '700', '900'],
  variable: '--font-noto-sans-tc',
});

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
      <body className={`${inter.variable} ${notoSansTC.variable} antialiased`}>
        <ClientProviders>
          <Layout>
            {children}
          </Layout>
        </ClientProviders>
      </body>
    </html>
  );
}
