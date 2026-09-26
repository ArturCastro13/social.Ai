/* eslint-disable @next/next/no-img-element */
import type { CSSProperties, ReactNode } from "react";
import type { BrandProfile, PostGerado, TemplateId } from "@/lib/types";
import type { Tema } from "./tema";

// Templates de arte para o Satori (só flexbox e um subconjunto de CSS).
// Cada um espelha um formato viral da base e se adapta a vertical, quadrado e paisagem.

export interface ArteProps {
  post: PostGerado;
  template: TemplateId;
  slide: number;
  brand: BrandProfile;
  tema: Tema;
  w: number;
  h: number;
  logo: string | null; // data URI já baixado, ou null para usar o nome escrito
  foto: string | null;
}

const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu;
export const limpar = (s: string) => s.replace(EMOJI, "").replace(/\s{2,}/g, " ").trim();

/** Tamanho de fonte que cabe na caixa, estimando largura média de caractere. */
export function caber(texto: string, largura: number, altura: number, max: number, min: number, lh = 1.08, larguraChar = 0.54) {
  const palavras = limpar(texto).split(" ");
  for (let s = max; s > min; s -= 2) {
    const porLinha = Math.max(1, Math.floor(largura / (s * larguraChar)));
    let linhas = 1, atual = 0;
    for (const p of palavras) {
      const n = p.length + (atual ? 1 : 0);
      if (atual + n > porLinha) {
        linhas++;
        atual = p.length;
      } else atual += n;
    }
    if (linhas * s * lh <= altura) return s;
  }
  return min;
}

/**
 * O Satori não aplica kerning GPOS, então em títulos pesados a pontuação fica afastada da letra.
 * Encosta ponto, vírgula e afins puxando um pouco para a esquerda.
 */
export function Kern({ t, fs }: { t: string; fs: number }) {
  const texto = limpar(t);
  if (!/[.,!?:;]/.test(texto)) return <>{texto}</>;
  // Cada palavra vira um item de flex-wrap; a pontuação encosta na palavra com margem negativa.
  return (
    <div style={{ display: "flex", flexWrap: "wrap", columnGap: fs * 0.27 }}>
      {texto.split(" ").map((palavra, i) => {
        const m = palavra.match(/^(.*?)([.,!?:;]+)$/);
        if (!m || !m[1]) return <div key={i}>{palavra}</div>;
        return (
          <div key={i} style={{ display: "flex" }}>
            <div>{m[1]}</div>
            <div style={{ marginLeft: -fs * 0.13 }}>{m[2]}</div>
          </div>
        );
      })}
    </div>
  );
}

const col = (extra: CSSProperties = {}): CSSProperties => ({ display: "flex", flexDirection: "column", ...extra });
const row = (extra: CSSProperties = {}): CSSProperties => ({ display: "flex", flexDirection: "row", ...extra });

function handleDe(brand: BrandProfile, post: PostGerado) {
  return brand.handles[post.rede_principal] ?? brand.handles.instagram ?? brand.handles.linkedin ?? brand.dominio;
}

function Marca({ p, cor, fundoClaro, tamanho = 1 }: { p: ArteProps; cor: string; fundoClaro: boolean; tamanho?: number }) {
  const u = Math.min(p.w, p.h) / 1080;
  // Logo em imagem só em fundo claro: em fundo colorido, logo escuro some. Lá vai o nome escrito.
  if (p.logo && fundoClaro) {
    return <img src={p.logo} alt="" style={{ height: 54 * u * tamanho, maxWidth: 300 * u * tamanho, objectFit: "contain" }} />;
  }
  return (
    <div style={{ fontFamily: "Titulo", fontSize: 38 * u * tamanho, color: cor, letterSpacing: -0.5 }}>{limpar(p.brand.nome)}</div>
  );
}

function Rodape({ p, cor, fundoClaro, contador }: { p: ArteProps; cor: string; fundoClaro: boolean; contador?: string }) {
  const u = Math.min(p.w, p.h) / 1080;
  return (
    <div style={row({ alignItems: "center", justifyContent: "space-between", width: "100%" })}>
      <Marca p={p} cor={cor} fundoClaro={fundoClaro} />
      <div style={row({ alignItems: "center", gap: 24 * u, fontFamily: "Corpo", fontSize: 28 * u, color: cor, opacity: 0.8 })}>
        <div>{handleDe(p.brand, p.post)}</div>
        {contador ? <div style={{ fontWeight: 700 }}>{contador}</div> : null}
      </div>
    </div>
  );
}

function Moldura({ p, bg, children, style }: { p: ArteProps; bg: string; children: ReactNode; style?: CSSProperties }) {
  const u = Math.min(p.w, p.h) / 1080;
  const paisagem = p.w / p.h > 1.3;
  return (
    <div
      style={col({
        width: p.w,
        height: p.h,
        background: bg,
        padding: (paisagem ? 60 : 84) * u,
        position: "relative",
        overflow: "hidden",
        justifyContent: "space-between",
        ...style,
      })}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- capa-gancho (carrossel)

function CapaGancho(p: ArteProps) {
  const { tema, post, w, h } = p;
  const u = Math.min(w, h) / 1080;
  const total = post.slides.length;
  const i = Math.min(p.slide, total - 1);
  const s = post.slides[i];
  const contador = `${i + 1}/${total}`;
  const areaW = w - 168 * u;

  if (i === 0) {
    const titulo = limpar(s.titulo || post.gancho);
    const fs = caber(titulo, areaW, h * 0.5, 150 * u, 56 * u);
    return (
      <Moldura p={p} bg={tema.primaria}>
        <div style={{ position: "absolute", right: -260 * u, bottom: -300 * u, width: 820 * u, height: 820 * u, borderRadius: 9999, background: tema.destaqueNaPrimaria, opacity: 0.22 }} />
        <div style={{ position: "absolute", right: 120 * u, bottom: 160 * u, width: 180 * u, height: 180 * u, borderRadius: 9999, border: `${6 * u}px solid ${tema.naPrimaria}`, opacity: 0.35 }} />
        <div style={row({ justifyContent: "space-between", alignItems: "center" })}>
          <Marca p={p} cor={tema.naPrimaria} fundoClaro={false} />
          <div style={{ fontFamily: "Corpo", fontWeight: 700, fontSize: 28 * u, color: tema.naPrimaria, opacity: 0.8 }}>{contador}</div>
        </div>
        <div style={col({ gap: 32 * u })}>
          <div style={{ display: "flex", fontFamily: "Titulo", fontSize: fs, lineHeight: 1.02, color: tema.naPrimaria, letterSpacing: -fs * 0.03 }}><Kern t={titulo} fs={fs} /></div>
          {s.texto ? (
            <div style={{ fontFamily: "Corpo", fontSize: 40 * u, lineHeight: 1.3, color: tema.naPrimaria, opacity: 0.88, maxWidth: areaW * 0.85 }}>{limpar(s.texto)}</div>
          ) : null}
        </div>
        <div style={row({ alignItems: "center", gap: 16 * u })}>
          <div style={row({ alignItems: "center", gap: 14 * u, background: tema.naPrimaria, color: tema.primaria, borderRadius: 999, padding: `${14 * u}px ${30 * u}px`, fontFamily: "Corpo", fontWeight: 700, fontSize: 28 * u })}>
            Arraste para o lado →
          </div>
        </div>
      </Moldura>
    );
  }

  if (i === total - 1) {
    const titulo = limpar(s.titulo);
    const fs = caber(titulo, areaW, h * 0.32, 104 * u, 48 * u);
    return (
      <Moldura p={p} bg={tema.escuro}>
        <div style={{ position: "absolute", left: -200 * u, top: -200 * u, width: 600 * u, height: 600 * u, borderRadius: 9999, background: tema.primaria, opacity: 0.35 }} />
        <div style={row({ justifyContent: "flex-end", fontFamily: "Corpo", fontWeight: 700, fontSize: 28 * u, color: tema.naEscuro, opacity: 0.7 })}>{contador}</div>
        <div style={col({ gap: 36 * u })}>
          <div style={{ display: "flex", fontFamily: "Titulo", fontSize: fs, lineHeight: 1.05, color: tema.naEscuro, letterSpacing: -fs * 0.02 }}><Kern t={titulo} fs={fs} /></div>
          <div style={{ fontFamily: "Corpo", fontSize: 42 * u, lineHeight: 1.35, color: tema.destaqueNoEscuro }}>{limpar(s.texto)}</div>
        </div>
        <div style={col({ gap: 20 * u })}>
          <div style={{ height: 4 * u, width: "100%", background: tema.naEscuro, opacity: 0.2 }} />
          <div style={row({ justifyContent: "space-between", alignItems: "center" })}>
            <Marca p={p} cor={tema.naEscuro} fundoClaro={false} />
            <div style={{ fontFamily: "Corpo", fontWeight: 700, fontSize: 34 * u, color: tema.naEscuro }}>{`Siga ${handleDe(p.brand, post)}`}</div>
          </div>
        </div>
      </Moldura>
    );
  }

  const numeroSo = /^\d+[.)]?$/.test(s.titulo.trim());
  const tituloLimpo = limpar(s.titulo.replace(/^\d+[.)]\s*/, ""));
  const texto = limpar(s.texto);
  const fsTexto = caber(texto, areaW, h * 0.34, 50 * u, 30 * u, 1.35, 0.5);
  const fsTitulo = caber(tituloLimpo, areaW, h * 0.2, 76 * u, 40 * u);
  return (
    <Moldura p={p} bg={tema.claro}>
      <div style={col({ gap: 22 * u })}>
        <div style={row({ justifyContent: "space-between", fontFamily: "Corpo", fontWeight: 700, fontSize: 28 * u, color: tema.mutedNoClaro })}>
          <div>{limpar(post.gancho).slice(0, 48)}</div>
          <div>{contador}</div>
        </div>
        <div style={row({ width: "100%", height: 8 * u, background: tema.mutedNoClaro, opacity: 0.25, borderRadius: 99 })}>
          <div style={{ width: `${((i + 1) / total) * 100}%`, height: "100%", background: tema.primariaNoClaro, borderRadius: 99 }} />
        </div>
      </div>
      <div style={col({ gap: 34 * u })}>
        <div style={{ fontFamily: "Titulo", fontSize: 180 * u, lineHeight: 0.9, color: tema.primariaNoClaro, letterSpacing: -6 * u }}>{String(i).padStart(2, "0")}</div>
        {!numeroSo && tituloLimpo ? (
          <div style={{ display: "flex", fontFamily: "Titulo", fontSize: fsTitulo, lineHeight: 1.05, color: tema.tintaNoClaro, letterSpacing: -1.5 * u }}><Kern t={tituloLimpo} fs={fsTitulo} /></div>
        ) : null}
        <div style={{ fontFamily: "Corpo", fontSize: fsTexto, lineHeight: 1.35, color: numeroSo ? tema.tintaNoClaro : tema.mutedNoClaro }}>{texto}</div>
      </div>
      <Rodape p={p} cor={tema.tintaNoClaro} fundoClaro />
    </Moldura>
  );
}

// ---------------------------------------------------------------- lista e checklist

function Lista(p: ArteProps & { check?: boolean }) {
  const { tema, post, w, h } = p;
  const u = Math.min(w, h) / 1080;
  const paisagem = w / h > 1.3;
  const [cab, ...itens] = post.slides;
  const titulo = limpar(cab?.titulo || post.gancho);
  const lista = itens.slice(0, paisagem ? 6 : 6);
  const larguraItem = paisagem ? (w - 120 * u) / 2 - 24 * u : w - 168 * u;
  const fsItem = Math.min(46 * u, ...lista.map((it) => caber(it.titulo, larguraItem - 110 * u, 110 * u, 46 * u, 26 * u, 1.15, 0.52)));
  return (
    <Moldura p={p} bg={tema.claro}>
      <div style={{ position: "absolute", right: -120 * u, top: -120 * u, width: 360 * u, height: 360 * u, borderRadius: 9999, background: tema.primaria, opacity: 0.12 }} />
      <div style={{ fontFamily: "Titulo", fontSize: caber(titulo, w - 168 * u, h * (paisagem ? 0.26 : 0.22), 88 * u, 40 * u), lineHeight: 1.04, color: tema.tintaNoClaro, letterSpacing: -2 * u, maxWidth: w * 0.86 }}>
        {titulo}
      </div>
      <div style={row({ flexWrap: "wrap", gap: `${(paisagem ? 18 : 26) * u}px ${48 * u}px` })}>
        {lista.map((it, k) => (
          <div key={k} style={row({ alignItems: "center", gap: 28 * u, width: larguraItem })}>
            {p.check ? (
              <div style={row({ width: 64 * u, height: 64 * u, flexShrink: 0, borderRadius: 14 * u, border: `${5 * u}px solid ${tema.primariaNoClaro}`, alignItems: "center", justifyContent: "center" })}>
                <div style={{ width: 16 * u, height: 30 * u, borderRight: `${6 * u}px solid ${tema.primariaNoClaro}`, borderBottom: `${6 * u}px solid ${tema.primariaNoClaro}`, transform: "rotate(45deg)", marginTop: -8 * u }} />
              </div>
            ) : (
              <div style={row({ width: 72 * u, height: 72 * u, flexShrink: 0, borderRadius: 9999, background: tema.primaria, color: tema.naPrimaria, alignItems: "center", justifyContent: "center", fontFamily: "Titulo", fontSize: 36 * u })}>
                {k + 1}
              </div>
            )}
            <div style={col({ gap: 4 * u, flex: 1 })}>
              <div style={{ fontFamily: "Corpo", fontWeight: 700, fontSize: fsItem, lineHeight: 1.15, color: tema.tintaNoClaro }}>{limpar(it.titulo)}</div>
              {it.texto ? <div style={{ fontFamily: "Corpo", fontSize: fsItem * 0.7, lineHeight: 1.3, color: tema.mutedNoClaro }}>{limpar(it.texto)}</div> : null}
            </div>
          </div>
        ))}
      </div>
      <Rodape p={p} cor={tema.tintaNoClaro} fundoClaro />
    </Moldura>
  );
}

// ---------------------------------------------------------------- citação

function Citacao(p: ArteProps) {
  const { tema, post, w, h } = p;
  const u = Math.min(w, h) / 1080;
  const s = post.slides[0];
  const frase = limpar(s.texto || post.gancho);
  const fs = caber(frase, w - 168 * u, h * 0.52, 104 * u, 40 * u, 1.12);
  return (
    <Moldura p={p} bg={tema.primaria}>
      <div style={{ position: "absolute", left: 40 * u, top: -120 * u, fontFamily: "Titulo", fontSize: 560 * u, color: tema.destaqueNaPrimaria, opacity: 0.35, lineHeight: 1 }}>“</div>
      <div style={{ height: 120 * u }} />
      <div style={{ display: "flex", fontFamily: "Titulo", fontSize: fs, lineHeight: 1.12, color: tema.naPrimaria, letterSpacing: -fs * 0.02 }}><Kern t={frase} fs={fs} /></div>
      <div style={col({ gap: 26 * u })}>
        {limpar(s.titulo || "").toLowerCase() === limpar(p.brand.nome).toLowerCase() || !s.titulo ? null : (
        <div style={row({ alignItems: "center", gap: 20 * u })}>
          <div style={{ width: 70 * u, height: 6 * u, background: tema.destaqueNaPrimaria }} />
          <div style={{ fontFamily: "Corpo", fontWeight: 700, fontSize: 34 * u, color: tema.naPrimaria }}>{limpar(s.titulo)}</div>
        </div>
        )}
        <Rodape p={p} cor={tema.naPrimaria} fundoClaro={false} />
      </div>
    </Moldura>
  );
}

// ---------------------------------------------------------------- dado de impacto

function DadoImpacto(p: ArteProps) {
  const { tema, post, w, h } = p;
  const u = Math.min(w, h) / 1080;
  const paisagem = w / h > 1.3;
  const s = post.slides[0];
  const numero = limpar(s.titulo || "");
  const fsNum = caber(numero, paisagem ? w * 0.5 : w - 168 * u, h * 0.42, 400 * u, 120 * u, 1, 0.6);
  const texto = limpar(s.texto || post.gancho);
  return (
    <Moldura p={p} bg={tema.escuro}>
      {Array.from({ length: 6 }).map((_, k) => (
        <div key={k} style={{ position: "absolute", left: 0, top: (h / 6) * k, width: w, height: 1, background: tema.naEscuro, opacity: 0.06 }} />
      ))}
      <div style={row({ alignItems: "center", gap: 16 * u })}>
        <div style={{ width: 18 * u, height: 18 * u, borderRadius: 99, background: tema.destaqueNoEscuro }} />
        <div style={{ fontFamily: "Corpo", fontWeight: 700, fontSize: 26 * u, letterSpacing: 4 * u, color: tema.naEscuro, opacity: 0.75 }}>EM NÚMEROS</div>
      </div>
      <div style={paisagem ? row({ alignItems: "center", gap: 56 * u }) : col({ gap: 30 * u })}>
        <div style={{ fontFamily: "Titulo", fontSize: fsNum, lineHeight: 0.9, color: tema.destaqueNoEscuro, letterSpacing: -fsNum * 0.04 }}>{numero}</div>
        <div style={{ fontFamily: "Corpo", fontSize: caber(texto, paisagem ? w * 0.36 : w - 168 * u, h * 0.3, 54 * u, 30 * u, 1.3, 0.5), lineHeight: 1.3, color: tema.naEscuro, maxWidth: paisagem ? w * 0.38 : w * 0.85 }}>
          {texto}
        </div>
      </div>
      <Rodape p={p} cor={tema.naEscuro} fundoClaro={false} />
    </Moldura>
  );
}

// ---------------------------------------------------------------- print estilo post de X

function PrintX(p: ArteProps) {
  const { tema, post, w, h, brand } = p;
  const u = Math.min(w, h) / 1080;
  const paisagem = w / h > 1.3;
  const texto = limpar(post.slides[0]?.texto || post.gancho);
  const cartaoW = paisagem ? w * 0.62 : w - 150 * u;
  const fs = caber(texto, cartaoW - 120 * u, h * (paisagem ? 0.42 : 0.4), 58 * u, 30 * u, 1.32, 0.5);
  const handle = brand.handles.x ?? brand.handles.instagram ?? "@" + brand.dominio.split(".")[0];
  return (
    <Moldura p={p} bg={tema.primaria} style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", left: -180 * u, top: -180 * u, width: 520 * u, height: 520 * u, borderRadius: 9999, background: tema.destaqueNaPrimaria, opacity: 0.25 }} />
      <div style={{ position: "absolute", right: -140 * u, bottom: -160 * u, width: 440 * u, height: 440 * u, borderRadius: 9999, background: tema.naPrimaria, opacity: 0.12 }} />
      <div style={col({ width: cartaoW, background: "#ffffff", borderRadius: 40 * u, padding: 60 * u, gap: 36 * u, boxShadow: `0 ${30 * u}px ${80 * u}px rgba(0,0,0,0.25)` })}>
        <div style={row({ alignItems: "center", gap: 24 * u })}>
          <div style={row({ width: 104 * u, height: 104 * u, borderRadius: 9999, background: p.logo ? "#ffffff" : tema.primaria, border: `${3 * u}px solid #e7e7e7`, alignItems: "center", justifyContent: "center", overflow: "hidden" })}>
            {p.logo ? (
              <img src={p.logo} alt="" style={{ width: 72 * u, height: 72 * u, objectFit: "contain" }} />
            ) : (
              <div style={{ fontFamily: "Titulo", fontSize: 50 * u, color: tema.naPrimaria }}>{limpar(brand.nome).charAt(0)}</div>
            )}
          </div>
          <div style={col({ gap: 4 * u })}>
            <div style={{ fontFamily: "Corpo", fontWeight: 700, fontSize: 40 * u, color: "#0f1419" }}>{limpar(brand.nome)}</div>
            <div style={{ fontFamily: "Corpo", fontSize: 32 * u, color: "#536471" }}>{handle}</div>
          </div>
        </div>
        <div style={{ fontFamily: "Corpo", fontSize: fs, lineHeight: 1.32, color: "#0f1419" }}>{texto}</div>
        <div style={{ height: 2 * u, background: "#eff3f4", width: "100%" }} />
        <div style={{ fontFamily: "Corpo", fontSize: 28 * u, color: "#536471" }}>{brand.dominio}</div>
      </div>
    </Moldura>
  );
}

// ---------------------------------------------------------------- bastidor do founder

function Bastidor(p: ArteProps) {
  const { tema, post, w, h } = p;
  const u = Math.min(w, h) / 1080;
  const paisagem = w / h > 1.3;
  const s = post.slides[0];
  const titulo = limpar(s.titulo || post.gancho);
  const texto = limpar(s.texto);
  const areaW = p.foto && paisagem ? w * 0.52 : w - 168 * u;
  const areaH = p.foto && !paisagem ? h * 0.3 : h * 0.44;
  const fs = caber(titulo, areaW - 40 * u, areaH, 112 * u, 44 * u, 1.05);
  const conteudo = (
    <div style={row({ gap: 34 * u, alignItems: "stretch" })}>
      <div style={{ width: 12 * u, background: tema.primariaNoClaro, borderRadius: 99 }} />
      <div style={col({ gap: 30 * u, flex: 1 })}>
        <div style={{ display: "flex", fontFamily: "Titulo", fontSize: fs, lineHeight: 1.05, color: tema.tintaNoClaro, letterSpacing: -fs * 0.025 }}><Kern t={titulo} fs={fs} /></div>
        {texto ? <div style={{ fontFamily: "Corpo", fontSize: caber(texto, areaW, h * 0.2, 42 * u, 26 * u, 1.38, 0.5), lineHeight: 1.38, color: tema.mutedNoClaro }}>{texto}</div> : null}
      </div>
    </div>
  );
  return (
    <Moldura p={p} bg={tema.claro} style={p.foto && paisagem ? { paddingLeft: w * 0.42 + 60 * u } : undefined}>
      {p.foto ? (
        <img
          src={p.foto}
          alt=""
          style={
            paisagem
              ? { position: "absolute", left: 0, top: 0, width: w * 0.42, height: h, objectFit: "cover" }
              : { position: "absolute", left: 0, top: 0, width: w, height: h * 0.42, objectFit: "cover" }
          }
        />
      ) : null}
      <div style={row({ alignItems: "center", gap: 16 * u, marginTop: p.foto && !paisagem ? h * 0.42 - 40 * u : 0 })}>
        <div style={{ fontFamily: "Corpo", fontWeight: 700, fontSize: 26 * u, letterSpacing: 5 * u, color: tema.primariaNoClaro }}>BASTIDORES</div>
        <div style={{ width: 120 * u, height: 3 * u, background: tema.primariaNoClaro }} />
      </div>
      {conteudo}
      <Rodape p={p} cor={tema.tintaNoClaro} fundoClaro />
    </Moldura>
  );
}

// ---------------------------------------------------------------- antes e depois

function AntesDepois(p: ArteProps) {
  const { tema, post, w, h } = p;
  const u = Math.min(w, h) / 1080;
  const paisagem = w / h > 1.1;
  const antes = post.slides[0] ?? { titulo: "Antes", texto: "" };
  const depois = post.slides[1] ?? { titulo: "Depois", texto: post.gancho };
  const cinza = "#e9e6e1";
  const metadeW = paisagem ? w / 2 : w;
  const metadeH = paisagem ? h : h / 2;
  const bloco = (s: { titulo: string; texto: string }, bg: string, cor: string, rotulo: string, riscado: boolean) => {
    const t = limpar(s.texto);
    const fs = caber(t, metadeW - 150 * u, metadeH * 0.5, 70 * u, 30 * u, 1.18);
    return (
      <div style={col({ width: metadeW, height: metadeH, background: bg, padding: (paisagem ? 60 : 76) * u, justifyContent: "center", gap: 26 * u })}>
        <div style={row({ alignItems: "center", gap: 14 * u })}>
          <div style={{ fontFamily: "Corpo", fontWeight: 700, fontSize: 26 * u, letterSpacing: 5 * u, color: cor, opacity: 0.75 }}>{rotulo}</div>
        </div>
        {limpar(s.titulo).toLowerCase() === rotulo.toLowerCase() ? null : (
          <div style={{ fontFamily: "Titulo", fontSize: 54 * u, color: cor, textDecoration: riscado ? "line-through" : "none", opacity: riscado ? 0.55 : 1 }}>{limpar(s.titulo)}</div>
        )}
        <div style={{ fontFamily: riscado ? "Corpo" : "Titulo", fontSize: fs, lineHeight: 1.18, color: cor, opacity: riscado ? 0.7 : 1 }}>{t}</div>
      </div>
    );
  };
  return (
    <div style={{ display: "flex", flexDirection: paisagem ? "row" : "column", width: w, height: h, position: "relative" }}>
      {bloco(antes, cinza, "#3d3a36", "ANTES", true)}
      {bloco(depois, tema.primaria, tema.naPrimaria, "DEPOIS", false)}
      <div
        style={row({
          position: "absolute",
          left: paisagem ? w / 2 - 56 * u : w / 2 - 56 * u,
          top: paisagem ? h / 2 - 56 * u : h / 2 - 56 * u,
          width: 112 * u,
          height: 112 * u,
          borderRadius: 9999,
          background: tema.escuro,
          color: "#ffffff",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Titulo",
          fontSize: 56 * u,
        })}
      >
        {paisagem ? "→" : "↓"}
      </div>
      <div style={row({ position: "absolute", right: 60 * u, bottom: 48 * u, alignItems: "center" })}>
        <Marca p={p} cor={tema.naPrimaria} fundoClaro={false} tamanho={0.9} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- roteador

export function Arte(p: ArteProps) {
  switch (p.template) {
    case "capa-gancho":
      return <CapaGancho {...p} />;
    case "lista":
      return <Lista {...p} />;
    case "checklist":
      return <Lista {...p} check />;
    case "citacao":
      return <Citacao {...p} />;
    case "dado-impacto":
      return <DadoImpacto {...p} />;
    case "print-x":
      return <PrintX {...p} />;
    case "bastidor":
      return <Bastidor {...p} />;
    case "antes-depois":
      return <AntesDepois {...p} />;
  }
}

/** Quantas imagens um post gera (carrossel = uma por slide). */
export function totalDeImagens(template: TemplateId, post: PostGerado): number {
  return template === "capa-gancho" ? Math.max(1, post.slides.length) : 1;
}
