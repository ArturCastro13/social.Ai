import type { PostGerado, TemplateId } from "@/lib/types";

type Slide = { titulo: string; texto: string };

const frases = (s: string) =>
  s.split(/(?<=[.!?])\s+|\n+/).map((x) => x.trim()).filter((x) => x.length > 3);

/**
 * Quando o usuário troca o template de um post no painel, o conteúdo foi escrito para outro formato.
 * Aqui ele é remontado no formato que o template novo espera, sem chamar IA.
 */
export function adaptarSlides(post: PostGerado, template: TemplateId): Slide[] {
  const s = post.slides.length ? post.slides : [{ titulo: post.gancho, texto: "" }];
  const principal = s[0];
  const todoTexto = s.map((x) => [x.titulo, x.texto].filter(Boolean).join(". ")).join(" ");

  switch (template) {
    case "capa-gancho": {
      if (s.length >= 3) return s;
      const miolo = frases(todoTexto).slice(0, 4).map((t, i) => ({ titulo: `${i + 1}.`, texto: t }));
      return [{ titulo: post.gancho, texto: "" }, ...miolo, { titulo: "Gostou?", texto: "Salva e compartilha com quem precisa ver isso." }];
    }
    case "lista":
    case "checklist": {
      if (s.length >= 3) return s;
      const itens = frases(todoTexto).filter((t) => t !== post.gancho).slice(0, 5);
      return [{ titulo: post.gancho, texto: "" }, ...itens.map((t) => ({ titulo: t.replace(/[.!]$/, ""), texto: "" }))];
    }
    case "antes-depois": {
      if (s.length >= 2 && s.length <= 3) return s;
      return [
        { titulo: "Antes", texto: s[1]?.texto || "O jeito antigo de fazer." },
        { titulo: "Depois", texto: principal.texto || post.gancho },
      ];
    }
    case "citacao":
      return [{ titulo: principal.titulo && principal.texto ? principal.titulo : "", texto: principal.texto || principal.titulo || post.gancho }];
    case "print-x":
      return [{ titulo: "", texto: (principal.texto || post.gancho).slice(0, 280) }];
    case "bastidor":
      return [{ titulo: principal.titulo || post.gancho, texto: principal.texto }];
    case "dado-impacto": {
      const num = todoTexto.match(/(\+?\d[\d.,]*\s?(?:%|mil|mi|bi|x|k|min)?)/i)?.[1];
      if (/^\s*[\d+]/.test(principal.titulo)) return [principal];
      return [{ titulo: num ?? principal.titulo, texto: principal.texto || post.gancho }];
    }
  }
}
