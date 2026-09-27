/* eslint-disable @next/next/no-img-element */
import { HOST_SEM_SITE } from "@/lib/brand/sem-site";
import { contrastRatio, mix, withAlpha } from "@/lib/color";
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

/** Tira o [PREENCHER: ...] da arte: o cartão do post pede para completar, a imagem nunca mostra o marcador. */
export function semPlaceholder(s: string): string {
  // Nota (desvio do plano): "%" fica de fora da junção com o espaço anterior. O plano original juntava também o
  // "%" à palavra ("Ganhe%"), mas o próprio teste do plano espera o espaço antes do símbolo ("Ganhe % de tempo.").
  return s.replace(/\s*\[PREENCHER[^\]]*\]\s*/gi, " ").replace(/\s+([.,;:!?])/g, "$1").replace(/\s{2,}/g, " ").trim();
}

export const limpar = (s: string) => semPlaceholder(s.replace(EMOJI, "")).replace(/\s{2,}/g, " ").trim();

const palavraNormal = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/** Divide o título em palavras e marca as que formam o destaque (sem diferença de acento, caixa e pontuação). */
export function marcarDestaque(texto: string, destaque?: string | null): { palavra: string; marcada: boolean }[] {
  const palavras = limpar(texto).split(" ").filter(Boolean);
  const out = palavras.map((palavra) => ({ palavra, marcada: false }));
  const alvo = limpar(destaque ?? "").split(" ").map(palavraNormal).filter(Boolean);
  if (!alvo.length) return out;
  const norm = palavras.map(palavraNormal);
  for (let i = 0; i + alvo.length <= norm.length; i++) {
    if (alvo.every((a, k) => norm[i + k] === a)) {
      for (let k = 0; k < alvo.length; k++) out[i + k].marcada = true;
      break;
    }
  }
  return out;
}

/** Tamanho de fonte que cabe na caixa, estimando largura média de caractere. */
function contarLinhas(palavras: string[], largura: number, s: number, larguraChar: number) {
  const porLinha = Math.max(1, Math.floor(largura / (s * larguraChar)));
  let linhas = 1, atual = 0;
  for (const p of palavras) {
    const n = p.length + (atual ? 1 : 0);
    if (atual + n > porLinha) {
      linhas++;
      atual = p.length;
    } else atual += n;
  }
  return linhas;
}

export function caber(texto: string, largura: number, altura: number, max: number, min: number, lh = 1.08, larguraChar = 0.54) {
  const palavras = limpar(texto).split(" ");
  for (let s = max; s > min; s -= 2) {
    if (contarLinhas(palavras, largura, s, larguraChar) * s * lh <= altura) return s;
  }
  return min;
}

/** Altura estimada de um texto já com a fonte escolhida, pela mesma conta do caber. */
export function alturaTexto(texto: string, largura: number, fs: number, lh = 1.08, larguraChar = 0.54) {
  return texto ? contarLinhas(limpar(texto).split(" "), largura, fs, larguraChar) * fs * lh : 0;
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

/** Domínio para mostrar na arte. Marca sem site tem só um endereço interno, que nunca aparece. */
function dominioVisivel(brand: BrandProfile): string {
  return brand.dominio.includes(HOST_SEM_SITE) ? "" : brand.dominio;
}

/** @ da marca inventado a partir do nome, só quando não há @ nem domínio de verdade. */
const arrobaDoNome = (brand: BrandProfile) => "@" + limpar(brand.nome).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");

function handleDe(brand: BrandProfile, post: PostGerado) {
  return brand.handles[post.rede_principal] ?? brand.handles.instagram ?? brand.handles.linkedin ?? (dominioVisivel(brand) || limpar(brand.nome));
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

// ---------------------------------------------------------------- estilo creator: peças comuns

/** Faixa de cor da marca no topo da arte (ou só da imagem, quando ela ocupa a faixa de cima). */
function FaixaTopo({ p, largura }: { p: ArteProps; largura: number }) {
  const u = Math.min(p.w, p.h) / 1080;
  return <div style={{ position: "absolute", left: 0, top: 0, width: largura, height: 14 * u, background: p.tema.primaria }} />;
}

/** Fundo de papel no tom da marca com a faixa no topo: a base de quase todos os templates. */
function Papel({ p, children, style }: { p: ArteProps; children: ReactNode; style?: CSSProperties }) {
  return (
    <Moldura p={p} bg={p.tema.papel} style={style}>
      <FaixaTopo p={p} largura={p.w} />
      {children}
    </Moldura>
  );
}

/** Autor no topo, como nos carrosséis de creator: avatar (logo ou inicial), nome e @. */
function Autor({ p, cor, corSec, tamanho = 1 }: { p: ArteProps; cor: string; corSec: string; tamanho?: number }) {
  const u = (Math.min(p.w, p.h) / 1080) * tamanho;
  const nome = limpar(p.brand.nome);
  const lado = 76 * u;
  return (
    <div style={row({ alignItems: "center", gap: 20 * u })}>
      {p.logo ? (
        <div style={row({ width: lado, height: lado, borderRadius: 9999, background: "#ffffff", alignItems: "center", justifyContent: "center", overflow: "hidden", border: `${2 * u}px solid ${withAlpha(cor, 0.15)}` })}>
          <img src={p.logo} alt="" style={{ width: lado * 0.68, height: lado * 0.68, objectFit: "contain" }} />
        </div>
      ) : (
        <div style={row({ width: lado, height: lado, borderRadius: 9999, background: p.tema.primaria, color: p.tema.naPrimaria, alignItems: "center", justifyContent: "center", fontFamily: "Titulo", fontSize: 36 * u })}>
          {nome.charAt(0).toUpperCase()}
        </div>
      )}
      <div style={col({ gap: 2 * u })}>
        <div style={{ fontFamily: "Corpo", fontWeight: 700, fontSize: 30 * u, color: cor }}>{nome}</div>
        <div style={{ fontFamily: "Corpo", fontSize: 24 * u, color: corSec }}>{handleDe(p.brand, p.post)}</div>
      </div>
    </div>
  );
}

/** Título display com o trecho de destaque sobre um marca-texto na cor da marca. */
function TituloCreator({ texto, destaque, fs, cor, marca, lh = 0.98 }: { texto: string; destaque?: string | null; fs: number; cor: string; marca: string; lh?: number }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", columnGap: fs * 0.24, rowGap: fs * 0.06, fontFamily: "Titulo", fontSize: fs, lineHeight: lh, color: cor, letterSpacing: -fs * 0.035 }}>
      {marcarDestaque(texto, destaque).map((w, i) => (
        <div
          key={i}
          style={
            w.marcada
              ? { display: "flex", backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0) 50%, ${marca} 50%, ${marca} 94%, rgba(0,0,0,0) 94%)`, padding: `0 ${fs * 0.05}px`, margin: `0 ${-fs * 0.05}px` }
              : { display: "flex" }
          }
        >
          {w.palavra}
        </div>
      ))}
    </div>
  );
}

/** Contador e barra de progresso no rodapé do carrossel. */
function Progresso({ p, i, total, cor, trilho }: { p: ArteProps; i: number; total: number; cor: string; trilho: string }) {
  const u = Math.min(p.w, p.h) / 1080;
  return (
    <div style={col({ gap: 14 * u, width: "100%" })}>
      <div style={row({ justifyContent: "space-between", fontFamily: "Corpo", fontWeight: 700, fontSize: 24 * u, letterSpacing: 2 * u, color: cor })}>
        <div>{`${i + 1} / ${total}`}</div>
        <div>{i + 1 < total ? "DESLIZE →" : ""}</div>
      </div>
      <div style={row({ width: "100%", height: 6 * u, borderRadius: 99, background: trilho })}>
        <div style={{ width: `${((i + 1) / total) * 100}%`, height: "100%", borderRadius: 99, background: p.tema.primaria }} />
      </div>
    </div>
  );
}

/** Onde a imagem da IA fica: faixa de cima (retrato e quadrado) ou metade esquerda (paisagem). */
function faixaDaFoto(p: ArteProps, fracao: number) {
  const paisagem = p.w / p.h > 1.3;
  return paisagem ? { w: Math.round(p.w * 0.44), h: p.h, paisagem } : { w: p.w, h: Math.round(p.h * fracao), paisagem };
}

/** A imagem da IA na faixa, com a faixa de cor da marca por cima. */
function FotoFaixa({ p, foto, w, h }: { p: ArteProps; foto: string; w: number; h: number }) {
  return (
    <div style={{ display: "flex", position: "absolute", left: 0, top: 0, width: w, height: h }}>
      <img src={foto} alt="" style={{ position: "absolute", left: 0, top: 0, width: w, height: h, objectFit: "cover" }} />
      <FaixaTopo p={p} largura={w} />
    </div>
  );
}

/** Padding da arte quando a imagem ocupa a faixa: o conteúdo começa depois dela. */
function depoisDaFoto(p: ArteProps, f: { w: number; h: number; paisagem: boolean } | null): CSSProperties | undefined {
  const u = Math.min(p.w, p.h) / 1080;
  if (!f) return undefined;
  return f.paisagem ? { paddingLeft: f.w + 60 * u } : { paddingTop: f.h + 44 * u };
}

// ---------------------------------------------------------------- foto de fundo (imagem da IA)

/** Cor do véu sobre a foto: o escuro da marca, puxado para o preto para não acinzentar a imagem. */
const corDoVeu = (tema: Tema) => mix(tema.escuro, "#000000", 0.3);

/**
 * Opacidade mínima do véu para cada texto ter contraste com qualquer foto por baixo. Confere o pior caso
 * (foto branca sob o véu), do mesmo jeito que o tema confere cada par de cores. Nunca abaixo de 0,7: menos que isso
 * deixa a foto com cara de lavada, nem clara nem escura.
 */
export function veuLegivel(veu: string, textos: [cor: string, minimo: number][]): number {
  for (let a = 0.7; a < 0.97; a += 0.02) {
    const pior = mix("#ffffff", veu, a);
    if (textos.every(([cor, min]) => contrastRatio(cor, pior) >= min)) return Math.round(a * 100) / 100;
  }
  return 0.97;
}

/**
 * Foto em tela cheia com véu só onde o texto fica: embaixo (retrato e quadrado) ou à esquerda (paisagem),
 * mais uma faixa no topo para a marca. `bloco` é o tamanho do texto (altura embaixo, largura à esquerda):
 * o véu cobre esse bloco com a opacidade cheia e some aos poucos depois dele. Devolve também a opacidade.
 */
function FundoFoto({ p, foto, textos, bloco, lado, topo = true }: { p: ArteProps; foto: string; textos: [string, number][]; bloco: number; lado: "baixo" | "esquerda"; topo?: boolean }) {
  const u = Math.min(p.w, p.h) / 1080;
  const cor = corDoVeu(p.tema);
  const alfa = veuLegivel(cor, textos);
  const cheio = withAlpha(cor, alfa);
  const nada = withAlpha(cor, 0);
  const total = lado === "baixo" ? p.h : p.w;
  // Padding da moldura, o bloco e um respiro. Nunca menos de 30% nem mais de 70% da arte.
  const ate = Math.round(Math.min(0.7, Math.max(0.3, (bloco + 130 * u) / total)) * 100);
  // Um bloco só, em posição absoluta: fragmento com filhos absolutos sai deslocado pelo padding no Satori.
  return (
    <div style={{ display: "flex", position: "absolute", left: 0, top: 0, width: p.w, height: p.h }}>
      <img src={foto} alt="" style={{ position: "absolute", left: 0, top: 0, width: p.w, height: p.h, objectFit: "cover" }} />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: p.w,
          height: p.h,
          backgroundImage: `linear-gradient(${lado === "baixo" ? "to top" : "to right"}, ${cheio} 0%, ${cheio} ${ate}%, ${withAlpha(cor, alfa * 0.45)} ${Math.min(100, ate + 12)}%, ${nada} ${Math.min(100, ate + 28)}%)`,
        }}
      />
      {topo ? (
        <div style={{ position: "absolute", left: 0, top: 0, width: p.w, height: 250 * u, backgroundImage: `linear-gradient(to bottom, ${cheio} 0%, ${withAlpha(cor, alfa * 0.8)} 45%, ${nada} 100%)` }} />
      ) : null}
    </div>
  );
}

const SOMBRA_TEXTO = "0 2px 18px rgba(0,0,0,0.35)";

// ---------------------------------------------------------------- capa-gancho (carrossel)

function CapaGancho(p: ArteProps) {
  const { tema, post, w, h } = p;
  const u = Math.min(w, h) / 1080;
  const paisagem = w / h > 1.3;
  const total = post.slides.length;
  const i = Math.min(p.slide, total - 1);
  const s = post.slides[i];
  const areaW = w - (paisagem ? 120 : 168) * u;
  const trilho = withAlpha(tema.tintaNoPapel, 0.12);

  if (i === 0) {
    const titulo = limpar(s.titulo || post.gancho);
    const sub = limpar(s.texto);
    const f = p.foto ? faixaDaFoto(p, 0.5) : null;
    const textoW = f?.paisagem ? w - f.w - 120 * u : areaW;
    const fs = f ? caber(titulo, textoW, f.paisagem ? h * 0.42 : h * 0.22, 104 * u, 44 * u, 0.98) : caber(titulo, areaW, h * (paisagem ? 0.46 : 0.42), 150 * u, 56 * u, 0.98);
    const fsSub = caber(sub, textoW * 0.92, h * (f ? 0.07 : 0.1), (f ? 34 : 40) * u, 24 * u, 1.3, 0.5);
    return (
      <Papel p={p} style={depoisDaFoto(p, f)}>
        {f && p.foto ? <FotoFaixa p={p} foto={p.foto} w={f.w} h={f.h} /> : null}
        <Autor p={p} cor={tema.tintaNoPapel} corSec={tema.mutedNoPapel} tamanho={f ? 0.85 : 1} />
        <div style={col({ gap: (f ? 18 : 26) * u, maxWidth: textoW })}>
          <TituloCreator texto={titulo} destaque={post.destaque} fs={fs} cor={tema.tintaNoPapel} marca={tema.marcaTexto} />
          {sub ? <div style={{ fontFamily: "Corpo", fontSize: fsSub, lineHeight: 1.3, color: tema.mutedNoPapel, maxWidth: textoW * 0.92 }}>{sub}</div> : null}
        </div>
        <Progresso p={p} i={0} total={total} cor={tema.tintaNoPapel} trilho={trilho} />
      </Papel>
    );
  }

  if (i === total - 1) {
    const titulo = limpar(s.titulo);
    const texto = limpar(s.texto);
    const fs = caber(titulo, areaW, h * 0.3, 100 * u, 44 * u, 1.02);
    const acao = dominioVisivel(p.brand) || handleDe(p.brand, post);
    return (
      <Moldura p={p} bg={tema.escuro}>
        <FaixaTopo p={p} largura={w} />
        <Autor p={p} cor={tema.naEscuro} corSec={withAlpha(tema.naEscuro, 0.7)} tamanho={0.85} />
        <div style={col({ gap: 28 * u })}>
          <TituloCreator texto={titulo} fs={fs} cor={tema.naEscuro} marca={tema.escuro} lh={1.02} />
          {texto ? (
            <div style={{ fontFamily: "Corpo", fontSize: caber(texto, areaW, h * 0.14, 38 * u, 26 * u, 1.35, 0.5), lineHeight: 1.35, color: withAlpha(tema.naEscuro, 0.78) }}>{texto}</div>
          ) : null}
          <div style={row({ alignItems: "center" })}>
            <div style={row({ background: tema.primaria, color: tema.naPrimaria, borderRadius: 999, padding: `${16 * u}px ${34 * u}px`, fontFamily: "Corpo", fontWeight: 700, fontSize: 30 * u })}>{acao}</div>
          </div>
        </div>
        <Progresso p={p} i={i} total={total} cor={tema.naEscuro} trilho={withAlpha(tema.naEscuro, 0.18)} />
      </Moldura>
    );
  }

  const numeroSo = /^\d+[.)]?$/.test(s.titulo.trim());
  const tituloLimpo = limpar(s.titulo.replace(/^\d+[.)]\s*/, ""));
  const texto = limpar(s.texto);
  const fsTitulo = caber(tituloLimpo, areaW, h * 0.2, 80 * u, 40 * u, 1.02);
  const fsTexto = caber(texto, areaW, h * 0.3, 44 * u, 28 * u, 1.38, 0.5);
  return (
    <Papel p={p}>
      <Autor p={p} cor={tema.tintaNoPapel} corSec={tema.mutedNoPapel} tamanho={0.75} />
      <div style={col({ gap: 24 * u })}>
        <div style={{ fontFamily: "Titulo", fontSize: (paisagem ? 110 : 150) * u, lineHeight: 0.85, color: tema.primariaNoPapel, letterSpacing: -6 * u }}>{String(i).padStart(2, "0")}</div>
        {!numeroSo && tituloLimpo ? <TituloCreator texto={tituloLimpo} fs={fsTitulo} cor={tema.tintaNoPapel} marca={tema.marcaTexto} lh={1.02} /> : null}
        {texto ? <div style={{ fontFamily: "Corpo", fontSize: fsTexto, lineHeight: 1.38, color: tema.mutedNoPapel }}>{texto}</div> : null}
      </div>
      <Progresso p={p} i={i} total={total} cor={tema.tintaNoPapel} trilho={trilho} />
    </Papel>
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
  const autor = limpar(s.titulo || "").toLowerCase() === limpar(p.brand.nome).toLowerCase() || !s.titulo ? null : limpar(s.titulo);
  if (p.foto) {
    const paisagem = w / h > 1.3;
    const larguraTexto = paisagem ? w * 0.52 : w - 168 * u;
    const fsFoto = caber(frase, larguraTexto, h * (paisagem ? 0.5 : 0.3), 88 * u, 36 * u, 1.12);
    const aspas = tema.destaqueNoEscuro;
    const bloco = paisagem ? larguraTexto : 100 * u + alturaTexto(frase, larguraTexto, fsFoto, 1.12) + (autor ? 70 * u : 0) + 90 * u;
    return (
      <Moldura p={p} bg={tema.escuro}>
        <FundoFoto p={p} foto={p.foto} textos={[[tema.naEscuro, 4.5], [aspas, 3]]} bloco={bloco} lado={paisagem ? "esquerda" : "baixo"} topo={false} />
        <div style={{ height: 1 }} />
        <div style={col({ gap: 30 * u, maxWidth: larguraTexto })}>
          <div style={{ fontFamily: "Titulo", fontSize: 150 * u, lineHeight: 0.6, height: 70 * u, color: aspas }}>“</div>
          <div style={{ display: "flex", fontFamily: "Titulo", fontSize: fsFoto, lineHeight: 1.12, color: tema.naEscuro, letterSpacing: -fsFoto * 0.02, textShadow: SOMBRA_TEXTO }}><Kern t={frase} fs={fsFoto} /></div>
          {autor ? (
            <div style={row({ alignItems: "center", gap: 20 * u })}>
              <div style={{ width: 70 * u, height: 6 * u, background: aspas }} />
              <div style={{ fontFamily: "Corpo", fontWeight: 700, fontSize: 32 * u, color: tema.naEscuro }}>{autor}</div>
            </div>
          ) : null}
          <Rodape p={p} cor={tema.naEscuro} fundoClaro={false} />
        </div>
      </Moldura>
    );
  }
  return (
    <Moldura p={p} bg={tema.primaria}>
      <div style={{ position: "absolute", left: 40 * u, top: -120 * u, fontFamily: "Titulo", fontSize: 560 * u, color: tema.destaqueNaPrimaria, opacity: 0.35, lineHeight: 1 }}>“</div>
      <div style={{ height: 120 * u }} />
      <div style={{ display: "flex", fontFamily: "Titulo", fontSize: fs, lineHeight: 1.12, color: tema.naPrimaria, letterSpacing: -fs * 0.02 }}><Kern t={frase} fs={fs} /></div>
      <div style={col({ gap: 26 * u })}>
        {autor ? (
          <div style={row({ alignItems: "center", gap: 20 * u })}>
            <div style={{ width: 70 * u, height: 6 * u, background: tema.destaqueNaPrimaria }} />
            <div style={{ fontFamily: "Corpo", fontWeight: 700, fontSize: 34 * u, color: tema.naPrimaria }}>{autor}</div>
          </div>
        ) : null}
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
  if (p.foto) {
    const larguraTexto = paisagem ? w * 0.5 : w - 168 * u;
    const fsNumFoto = caber(numero, larguraTexto, h * (paisagem ? 0.36 : 0.22), 300 * u, 96 * u, 1, 0.6);
    const fsTextoFoto = caber(texto, larguraTexto, h * (paisagem ? 0.22 : 0.14), 46 * u, 28 * u, 1.3, 0.5);
    const bloco = paisagem ? larguraTexto : fsNumFoto * 0.9 + alturaTexto(texto, larguraTexto, fsTextoFoto, 1.3, 0.5) + 110 * u;
    return (
      <Moldura p={p} bg={tema.escuro}>
        <FundoFoto p={p} foto={p.foto} textos={[[tema.naEscuro, 4.5], [tema.destaqueNoEscuro, 3]]} bloco={bloco} lado={paisagem ? "esquerda" : "baixo"} />
        <div style={row({ alignItems: "center", gap: 16 * u })}>
          <div style={{ width: 18 * u, height: 18 * u, borderRadius: 99, background: tema.destaqueNoEscuro }} />
          <div style={{ fontFamily: "Corpo", fontWeight: 700, fontSize: 26 * u, letterSpacing: 4 * u, color: tema.naEscuro }}>EM NÚMEROS</div>
        </div>
        <div style={col({ gap: 24 * u, maxWidth: larguraTexto })}>
          <div style={{ fontFamily: "Titulo", fontSize: fsNumFoto, lineHeight: 0.9, color: tema.destaqueNoEscuro, letterSpacing: -fsNumFoto * 0.04, textShadow: SOMBRA_TEXTO }}>{numero}</div>
          <div style={{ fontFamily: "Corpo", fontSize: fsTextoFoto, lineHeight: 1.3, color: tema.naEscuro }}>{texto}</div>
          <Rodape p={p} cor={tema.naEscuro} fundoClaro={false} />
        </div>
      </Moldura>
    );
  }
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
  const handle = brand.handles.x ?? brand.handles.instagram ?? (dominioVisivel(brand) ? "@" + brand.dominio.split(".")[0] : arrobaDoNome(brand));
  return (
    <Moldura p={p} bg={tema.primaria} style={{ alignItems: "center", justifyContent: "center" }}>
      {p.foto ? (
        // O cartão é branco com texto escuro: a foto fica inteira, só um pouco mais escura para o cartão saltar.
        <div style={{ display: "flex", position: "absolute", left: 0, top: 0, width: w, height: h }}>
          <img src={p.foto} alt="" style={{ position: "absolute", left: 0, top: 0, width: w, height: h, objectFit: "cover" }} />
          <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, background: withAlpha(tema.escuro, 0.18) }} />
        </div>
      ) : (
        <>
          <div style={{ position: "absolute", left: -180 * u, top: -180 * u, width: 520 * u, height: 520 * u, borderRadius: 9999, background: tema.destaqueNaPrimaria, opacity: 0.25 }} />
          <div style={{ position: "absolute", right: -140 * u, bottom: -160 * u, width: 440 * u, height: 440 * u, borderRadius: 9999, background: tema.naPrimaria, opacity: 0.12 }} />
        </>
      )}
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
        {dominioVisivel(brand) ? <div style={{ height: 2 * u, background: "#eff3f4", width: "100%" }} /> : null}
        {dominioVisivel(brand) ? <div style={{ fontFamily: "Corpo", fontSize: 28 * u, color: "#536471" }}>{brand.dominio}</div> : null}
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
