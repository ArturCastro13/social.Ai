import { hexToRgb, rgbToHsl } from "@/lib/color";

// Nome da cor em inglês para a direção de arte. O modelo de imagem segue melhor "deep cobalt blue" do que um hex solto;
// vai o nome e o hex juntos.

const MATIZES: [number, string][] = [
  [12, "red"],
  [25, "red orange"],
  [42, "orange"],
  [55, "amber"],
  [68, "yellow"],
  [85, "lime"],
  [150, "green"],
  [172, "teal"],
  [195, "cyan"],
  [215, "azure blue"],
  [245, "blue"],
  [265, "indigo"],
  [290, "violet"],
  [315, "magenta"],
  [352, "pink"],
  [360, "red"],
];

export function nomeDaCor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "neutral";
  const { h, s, l } = rgbToHsl(rgb);
  if (l > 0.94) return "white";
  if (l < 0.09) return "near black";
  if (s < 0.12) return l > 0.7 ? "light gray" : l < 0.3 ? "charcoal gray" : "gray";
  let base = MATIZES.find(([ate]) => h < ate)?.[1] ?? "red";
  // Laranja e vermelho escuros viram marrom; rosa claro e forte é "hot pink" na fala de designer.
  if ((base === "orange" || base === "red orange" || base === "amber") && l < 0.35) base = "brown";
  const tom = l < 0.3 ? "deep" : l > 0.72 ? "pale" : s > 0.75 ? "vivid" : s < 0.35 ? "muted" : "";
  if (base === "pink" && tom === "vivid" && l > 0.55) return "hot pink";
  return [tom, base].filter(Boolean).join(" ");
}
