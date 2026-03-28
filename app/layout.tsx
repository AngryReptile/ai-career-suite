import type { Metadata } from "next";
import { Inter, Space_Mono, VT323 } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  variable: "--font-space-mono",
  subsets: ["latin"],
});

const vt323 = VT323({
  weight: "400",
  variable: "--font-vt323",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Career Suite",
  description: "Advanced AI tools to land your dream job",
};

import { Providers } from "@/components/Providers";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { LiquidGlassEffects } from "@/components/LiquidGlassEffects";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${spaceMono.variable} ${vt323.variable} antialiased font-sans`}
      >
        <LiquidGlassEffects />
        <AnimatedBackground />
        <div className="relative z-0 min-h-screen">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
