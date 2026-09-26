import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], display: "swap" });
const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "social.Ai | O CMO de IA do founder que faz tudo sozinho",
  description:
    "Cole a URL do seu site. Em um minuto você recebe diagnóstico, estratégia e posts prontos na identidade da sua marca, baseados no que viraliza no seu nicho.",
};

export const viewport: Viewport = {
  themeColor: "#f4efe6",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${bricolage.variable} ${instrument.variable} ${jetbrains.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
