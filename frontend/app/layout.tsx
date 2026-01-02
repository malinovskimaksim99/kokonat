import type { Metadata } from "next";
import { Inter, Merriweather } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const merriweather = Merriweather({
  weight: ["300", "400", "700", "900"],
  subsets: ["latin", "cyrillic"], // Added cyrillic for Ukrainian support
  variable: "--font-merriweather",
});

export const metadata: Metadata = {
  title: "AI Writer Agent", // Updated title
  description: "Advanced AI Creative Writing Assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" className="dark">
      <body
        className={`${inter.variable} ${merriweather.variable} antialiased bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
