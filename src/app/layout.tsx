import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"], display: "swap" });
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
  title: "social.Ai | Seu negócio está na sua cabeça. Seu marketing não deveria estar.",
  description:
    "Transforme o que você sabe sobre o seu mercado, produto e cliente em marketing que gera resultado. Sem passar horas pesquisando, criando, revisando ou ensinando uma IA sobre a sua própria empresa.",
};

export const viewport: Viewport = {
  themeColor: "#f7f6f2",
  // Deixa a barra de abas do celular usar a área segura (env(safe-area-inset-bottom)).
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${geist.variable} ${bricolage.variable} ${instrument.variable} ${jetbrains.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        {children}
      </body>
    </html>
  );
}
