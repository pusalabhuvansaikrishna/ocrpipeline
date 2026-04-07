import type { Metadata } from "next";
import { League_Spartan } from "next/font/google";
import "./globals.css";
import HeaderWrapper from "./HeaderWrapper"; // ✅ ONLY this

const leagueSpartan = League_Spartan({
  subsets: ["latin"],
  variable: "--font-league-spartan",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "FASTOCR - A product of IIITH",
  description: "Fast OCR Tool",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className="scroll-smooth"
      suppressHydrationWarning
    >
      <body
        className={`${leagueSpartan.variable} bg-gray-950 text-gray-100 font-sans antialiased`}
      >
        {/* ✅ THIS is the fix */}
        <HeaderWrapper />

        <main className="pt-24">
          {children}
        </main>
      </body>
    </html>
  );
}9