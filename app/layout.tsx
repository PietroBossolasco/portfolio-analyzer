import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Portfolio Dashboard",
  description: "Dashboard patrimoniale Trade Republic (PDF + CSV)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${inter.variable} ${sora.variable}`}>
      <head>
        {/* applica la modalità privacy prima del paint per evitare flash */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('privacy')==='on'){document.documentElement.dataset.privacy='on'}}catch(e){}",
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
