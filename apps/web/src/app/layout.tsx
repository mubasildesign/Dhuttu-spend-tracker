import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const sans = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-ibm-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f3f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0c0e" },
  ],
};

export const metadata: Metadata = {
  title: "Dhuttu — your cash spend tracker",
  description: "Everyday spends, trip budgets, and invest plans.",
  applicationName: "Dhuttu",
  appleWebApp: {
    capable: true,
    title: "Dhuttu",
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/brand/dhuttu-icon-light.png?v=wallet-1", type: "image/png" }],
    apple: [{ url: "/brand/dhuttu-icon-light.png?v=wallet-1", type: "image/png" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
