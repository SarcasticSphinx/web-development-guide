import type { Metadata } from "next";
import { Poppins, JetBrains_Mono } from "next/font/google";
import { ClientShell } from "@/components/ClientShell";
import { getAllDocsWithContent } from "@/lib/docs-server";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Envato Next.js Documentation",
  description:
    "TypeScript & Next.js Documentation for Envato Marketplace Submissions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const docsWithContent = getAllDocsWithContent();

  return (
    <html lang="en" className={`${poppins.variable} ${jetbrainsMono.variable}`}>
      <body suppressHydrationWarning>
        <ClientShell docsWithContent={docsWithContent}>{children}</ClientShell>
      </body>
    </html>
  );
}
