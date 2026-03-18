import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
import "./globals.css";
import WakeLock from "@/components/WakeLock";
import { UserProvider } from "@/lib/userContext";
import { runMigrations } from "@/lib/migrate";

// Run DB migrations on server startup (idempotent)
runMigrations().catch((err) => console.error("Migration error:", err));

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Unbreakable",
  description: "App de entrenamiento progresivo",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Unbreakable",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable}`}>
        <WakeLock />
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  );
}
