import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SprXintel — School Intelligence",
  description: "Crawl, enrich, and explore school websites.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="bg-grain min-h-screen">
        <div className="relative z-10 flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-w-0">
            <div className="mx-auto max-w-[1480px] px-6 py-8 sm:px-8 sm:py-10 lg:px-12">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
