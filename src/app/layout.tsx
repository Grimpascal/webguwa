import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import FaviconUpdater from "@/components/FaviconUpdater";
import Footer from "@/components/Footer";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    const res = await fetch(`${apiUrl}/api/settings/public`, { cache: 'no-store' });
    const json = await res.json();
    const webName = json.data?.web_name || 'YOI Store';
    return {
      title: `${webName} - Top Up Game Cepat, Aman & Terpercaya`,
      description: `Platform top up game terpercaya di Indonesia. Top up Diamond Mobile Legends, Free Fire, UC PUBG Mobile murah, cepat otomatis 24 jam secara instan dan otomatis.`,
    };
  } catch (e) {
    return {
      title: "YOI Store - Top Up Game Cepat, Aman & Terpercaya",
      description: "Platform top up game terpercaya di Indonesia. Top up Diamond Mobile Legends, Free Fire, UC PUBG Mobile murah, cepat otomatis 24 jam secara instan dan otomatis.",
    };
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${outfit.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground animate-fade-in">
        <AuthProvider>
          <FaviconUpdater />
          {/* Header/Navbar */}
          <Navbar />

          {/* Main Content */}
          <main className="flex-grow flex flex-col">{children}</main>

          {/* Footer */}
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
