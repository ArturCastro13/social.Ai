"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AjustesRedes, type Redes } from "./AjustesRedes";
import { dominioDe } from "@/components/estudio/useGeracao";
import type { DadosFormulario } from "@/components/estudio/Formulario";
import {
  fraseDoTom,
  lerPreferenciasSalvas,
  normalizarLink,
  PERFIS,
  salvarPreferencias,
  sugestoesPadrao,
  tipoDaInspiracao,
  type PerfilAlvo,
  type RedeArroba,
} from "@/lib/client/onboarding";
import { FORMATOS_MOTOR, FREQUENCIAS, OBJETIVOS, REGUAS_TOM, type FormatoMotor, type Frequencia, type ObjetivoId } from "@/lib/motor/constantes";
import type { Preferencias, SugestoesOnboarding, TomDeVoz } from "@/lib/motor/contrato";
import { NICHOS, type BrandProfile } from "@/lib/types";
import { TelaTurbinar, TURBO_VAZIO, type Turbo } from "./TelaTurbinar";
import { Chip } from "./ui";

const SUBTITULO = "font-display text-lg font-semibold tracking-[-0.01em]";

type Regua = keyof TomDeVoz;

function descreverRegua(v: number, esquerda: string, direita: string) {
  if (v < 0.2) return `bem ${esquerda}`;
  if (v < 0.4) return `mais ${esquerda}`;
  if (v <= 0.6) return "no meio";
  if (v <= 0.8) return `mais ${direita}`;
  return `bem ${direita}`;
}

async function postar<T>(caminho: string, corpo: unknown, ms: number): Promise<T> {
  const res = await fetch(caminho, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(ms),
  });
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as T;
}

/** Aceita só o que a interface conhece, para uma resposta estranha do backend não quebrar os chips. */
function sugestaoValida(s: Partial<SugestoesOnboarding> | null, padrao: SugestoesOnboarding): SugestoesOnboarding {
  if (!s || typeof s !== "object") return padrao;
  const objetivos = (s.objetivos ?? []).filter((o) => OBJETIVOS.some((x) => x.id === o)).slice(0, 2);
  const formatos = (s.formatos ?? []).filter((f) => FORMATOS_MOTOR.some((x) => x.id === f));
  const tom = { ...padrao.tom_de_voz };
  for (const r of REGUAS_TOM) {
    const v = Number(s.tom_de_voz?.[r.id]);
    if (Number.isFinite(v)) tom[r.id] = Math.min(1, Math.max(0, v));
  }
  return {
    nicho: s.nicho || padrao.nicho,
    publico_alvo: typeof s.publico_alvo === "string" ? s.publico_alvo.trim().slice(0, 300) : padrao.publico_alvo,
    objetivos: objetivos.length ? objetivos : padrao.objetivos,
    tom_de_voz: tom,
    exemplo_tom: s.exemplo_tom?.trim() || fraseDoTom(tom),
    formatos: formatos.length ? formatos : padrao.formatos,
    frequencia: FREQUENCIAS.some((f) => f.id === s.frequencia) ? (s.frequencia as Frequencia) : padrao.frequencia,
    porque_frequencia: s.porque_frequencia?.trim() || padrao.porque_frequencia,
  };
}

/**
 * Tela 2: "A gente entendeu isso. Ajusta o que estiver errado."
 * Lê o site, pede as sugestões ao /api/inferir e mostra tudo já marcado. A tela 3 abre aqui mesmo.
 */
export function TelaAjustes({
  dados,
  onGerar,
}: {
  dados: DadosFormulario;
  /** `redes` volta com os @, a quantidade e a paleta do print, que agora são escolhidos aqui. */
  onGerar: (p: Preferencias, brand: BrandProfile | null, redes: Partial<DadosFormulario>) => void;
}) {
  const dominio = dominioDe(dados.url);
  const perfilInicial: PerfilAlvo = dados.perfil ?? "empresa";
  const [carregando, setCarregando] = useState(true);
  const [brand, setBrand] = useState<BrandProfile | null>(null);
  const [sugestao, setSugestao] = useState<SugestoesOnboarding>(() => sugestoesPadrao(perfilInicial));
  const [daUltimaVez, setDaUltimaVez] = useState(false);

  const [perfil, setPerfil] = useState<PerfilAlvo>(perfilInicial);
  const [founder, setFounder] = useState<{ valor: string; rede: RedeArroba }>({ valor: dados.founder ?? "", rede: dados.redeFounder ?? "linkedin" });
  const [redes, setRedes] = useState<Redes>(() => {
    const rede = (["instagram", "linkedin", "x"] as const).find((r) => dados[r]) ?? "instagram";
    return { empresa: { valor: dados[rede] ?? "", rede }, facebook: dados.facebook, quantidade: dados.quantidade, paletaInstagram: dados.paletaInstagram };
  });
  const [publico, setPublico] = useState(sugestao.publico_alvo);
  const [objetivos, setObjetivos] = useState<ObjetivoId[]>(sugestao.objetivos);
  const [tom, setTom] = useState<TomDeVoz>(sugestao.tom_de_voz);
  const [mexeuNoTom, setMexeuNoTom] = useState(false);
  const [formatos, setFormatos] = useState<FormatoMotor[]>(sugestao.formatos);
  const [frequencia, setFrequencia] = useState<Frequencia>(sugestao.frequencia);
  const [abrirTurbo, setAbrirTurbo] = useState(false);
  const [turbo, setTurbo] = useState<Turbo>(TURBO_VAZIO);
  const turboRef = useRef<HTMLDivElement>(null);

  function aplicarSugestao(s: SugestoesOnboarding) {
    setPublico(s.publico_alvo);
    setObjetivos(s.objetivos);
    setTom(s.tom_de_voz);
    setMexeuNoTom(false);
    setFormatos(s.formatos);
    setFrequencia(s.frequencia);
  }

  useEffect(() => {
    let vivo = true;
    (async () => {
      const handles = { instagram: dados.instagram || undefined, linkedin: dados.linkedin || undefined, x: dados.x || undefined, facebook: dados.facebook || undefined };
      let b: BrandProfile | null = null;
      try {
        b = await postar<BrandProfile>(
          "/api/brand",
          { url: dados.url, ...handles, paletaInstagram: dados.paletaInstagram.length ? dados.paletaInstagram : undefined },
          25000,
        );
      } catch {
        b = null; // a geração tenta de novo e mostra o erro com calma
      }
      const padrao = sugestoesPadrao(perfilInicial);
      let s = padrao;
      try {
        s = sugestaoValida(await postar<Partial<SugestoesOnboarding>>("/api/inferir", b ? { brand: b } : { url: dados.url }, 15000), padrao);
      } catch {
        /* sem inferência, seguem os padrões locais */
      }
      if (!vivo) return;
      setBrand(b);
      setSugestao(s);
      const salvas = lerPreferenciasSalvas(dominioDe(dados.url));
      if (salvas) {
        setDaUltimaVez(true);
        if (!dados.perfil && salvas.perfil_alvo) setPerfil(salvas.perfil_alvo);
        setPublico(salvas.publico_alvo?.trim() || s.publico_alvo);
        setObjetivos(salvas.objetivos.length ? salvas.objetivos : s.objetivos);
        setTom(salvas.tom_de_voz ?? s.tom_de_voz);
        setMexeuNoTom(!!salvas.tom_de_voz);
        setFormatos(salvas.formatos_permitidos.length ? salvas.formatos_permitidos : s.formatos);
        setFrequencia(salvas.frequencia_escolhida ?? s.frequencia);
        const f = salvas.founder ?? {};
        if (!dados.founder) {
          const rede = (["linkedin", "instagram", "x"] as const).find((r) => f[r]);
          if (rede) setFounder({ valor: f[rede] ?? "", rede });
        }
        const insp = salvas.inspiracoes.map((i) => i.url).slice(0, 3);
        setTurbo({
          inspiracoes: [...insp, "", "", ""].slice(0, 3),
          brandBook: salvas.brand_book_texto ?? "",
          fala: f.transcricao_audio ?? "",
          proibicoes: salvas.proibicoes,
        });
      } else {
        aplicarSugestao(s);
      }
      setCarregando(false);
    })();
    return () => {
      vivo = false;
    };
    // Roda uma vez por site; a tela é remontada quando os dados mudam.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const frase = useMemo(() => (mexeuNoTom ? fraseDoTom(tom) : sugestao.exemplo_tom), [mexeuNoTom, tom, sugestao.exemplo_tom]);
  const nicho = NICHOS.find((n) => n.id === sugestao.nicho)?.nome;
  const freqSugerida = FREQUENCIAS.find((f) => f.id === sugestao.frequencia);

  function alternarObjetivo(id: ObjetivoId) {
    setObjetivos((atual) => (atual.includes(id) ? atual.filter((o) => o !== id) : [...atual, id].slice(-2)));
  }

  function alternarFormato(id: FormatoMotor) {
    setFormatos((atual) => (atual.includes(id) ? (atual.length > 1 ? atual.filter((f) => f !== id) : atual) : [...atual, id]));
  }

  function montarPreferencias(): Preferencias {
    const arroba = founder.valor.trim();
    const inspiracoes = turbo.inspiracoes
      .map(normalizarLink)
      .filter((u): u is string => !!u)
      .slice(0, 3)
      .map((url) => ({ url, tipo: tipoDaInspiracao(url) }));
    return {
      perfil_alvo: perfil,
      ...(publico.trim() ? { publico_alvo: publico.trim().slice(0, 300) } : {}),
      founder: {
        ...(arroba ? { [founder.rede]: arroba } : {}),
        ...(turbo.fala.trim() ? { transcricao_audio: turbo.fala.trim().slice(0, 6000) } : {}),
      },
      objetivos,
      tom_de_voz: tom,
      formatos_permitidos: formatos,
      frequencia_escolhida: frequencia,
      proibicoes: turbo.proibicoes,
      inspiracoes,
      ...(turbo.brandBook.trim() ? { brand_book_texto: turbo.brandBook.trim().slice(0, 20000) } : {}),
      noticias: [],
    };
  }

  function gerar(e: React.FormEvent) {
    e.preventDefault();
    const p = montarPreferencias();
    salvarPreferencias(dominio, p);
    const arroba = redes.empresa.valor.trim();
    onGerar(p, redes.paletaInstagram.length ? null : brand, {
      instagram: redes.empresa.rede === "instagram" ? arroba : "",
      linkedin: redes.empresa.rede === "linkedin" ? arroba : "",
      x: redes.empresa.rede === "x" ? arroba : "",
      facebook: redes.facebook.trim(),
      quantidade: redes.quantidade,
      paletaInstagram: redes.paletaInstagram,
      perfil,
      founder: founder.valor.trim() || undefined,
      redeFounder: founder.valor.trim() ? founder.rede : undefined,
    });
  }

  function alternarTurbo() {
    setAbrirTurbo((v) => !v);
    if (!abrirTurbo) requestAnimationFrame(() => turboRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  if (carregando) {
    return (
      <div role="status" aria-live="polite">
        <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Lendo {dominio}</h1>
        <p className="mt-3 text-tinta-2">
          Tirando do site o que dá para tirar, para você só corrigir. <span className="inline-block animate-pisca text-pauta">▍</span>
        </p>
        <div className="mt-8 space-y-6 rounded-3xl border border-tinta/10 bg-white p-5 sm:p-8" aria-hidden>
          {[5, 4, 6].map((n, i) => (
            <div key={i}>
              <div className="h-4 w-32 animate-pulse rounded-full bg-papel-2" />
              <div className="mt-3 flex flex-wrap gap-2">
                {Array.from({ length: n }).map((_, k) => (
                  <span key={k} className="h-10 animate-pulse rounded-full bg-papel" style={{ width: `${5 + ((k * 37) % 5)}rem` }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={gerar} className="animate-subir">
      <h1 className="text-balance font-display text-3xl font-semibold leading-[1.1] tracking-[-0.03em] sm:text-4xl">A gente entendeu isso. Ajusta o que estiver errado.</h1>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-tinta-2">
        {brand && (
          <span className="flex" aria-hidden>
            {[brand.paleta.primaria, brand.paleta.secundaria, brand.paleta.destaque].map((c, i) => (
              <span key={c + i} className="-ml-1.5 h-6 w-6 rounded-full border-2 border-papel first:ml-0" style={{ background: c }} />
            ))}
          </span>
        )}
        <span>
          <strong className="text-tinta">{brand?.nome ?? dominio}</strong>
          {nicho ? ` · ${nicho}` : ""}
          {brand ? "" : " · não consegui abrir o site agora, então usei um ponto de partida comum"}
        </span>
      </div>

      {daUltimaVez && (
        <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-tinta/10 bg-white px-4 py-3 text-sm text-tinta-2">
          Trouxe os ajustes que você fez da última vez neste site.
          <button
            type="button"
            onClick={() => {
              aplicarSugestao(sugestao);
              setDaUltimaVez(false);
            }}
            className="underline decoration-tinta/30 underline-offset-4 hover:text-tinta hover:decoration-tinta"
          >
            usar o que o site sugere
          </button>
        </p>
      )}

      <div className="mt-8 space-y-8 rounded-3xl border border-tinta/10 bg-white p-5 shadow-[0_30px_60px_-40px_rgba(22,19,15,.35)] sm:p-8">
        <div>
          <label htmlFor="ajuste-publico" className={`block ${SUBTITULO}`}>
            Quem você quer atingir?
          </label>
          <p className="mt-1 text-sm text-tinta-3">Quanto mais específico, mais a pessoa se reconhece no post.</p>
          <input
            id="ajuste-publico"
            value={publico}
            onChange={(e) => setPublico(e.target.value)}
            maxLength={300}
            placeholder="Ex.: dona de clínica pequena que perde paciente no WhatsApp"
            autoComplete="off"
            className="mt-3 h-11 w-full min-w-0 rounded-full border border-tinta/20 bg-white px-4 text-base outline-none transition-colors placeholder:text-tinta-3 focus:border-tinta"
          />
        </div>

        <fieldset>
          <legend className={SUBTITULO}>Quem assina os posts</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {PERFIS.map((p) => (
              <Chip key={p.id} ativo={perfil === p.id} onClick={() => setPerfil(p.id)}>
                {p.nome}
              </Chip>
            ))}
          </div>
        </fieldset>

        <AjustesRedes redes={redes} onChange={setRedes} founder={founder} onFounder={setFounder} titulo={SUBTITULO} />

        <fieldset>
          <legend className={SUBTITULO}>Objetivo</legend>
          <p className="mt-1 text-sm text-tinta-3">Até 2. Se marcar um terceiro, o mais antigo sai.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {OBJETIVOS.map((o) => (
              <Chip key={o.id} ativo={objetivos.includes(o.id)} onClick={() => alternarObjetivo(o.id)}>
                {o.nome}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className={SUBTITULO}>Tom de voz</legend>
          <div className="mt-4 space-y-4">
            {REGUAS_TOM.map((r) => {
              const v = tom[r.id as Regua];
              return (
                <div key={r.id} className="grid grid-cols-[4.75rem_minmax(0,1fr)_4.75rem] items-center gap-2 text-sm sm:grid-cols-[6rem_minmax(0,1fr)_6rem] sm:gap-3">
                  <span className="text-tinta-2" aria-hidden>
                    {r.esquerda}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={Math.round(v * 100)}
                    onChange={(e) => {
                      setTom((t) => ({ ...t, [r.id]: Number(e.target.value) / 100 }));
                      setMexeuNoTom(true);
                    }}
                    aria-label={`De ${r.esquerda} a ${r.direita}`}
                    aria-valuetext={descreverRegua(v, r.esquerda, r.direita)}
                    className="h-8 w-full min-w-0 cursor-pointer accent-tinta"
                  />
                  <span className="text-right text-tinta-2" aria-hidden>
                    {r.direita}
                  </span>
                </div>
              );
            })}
          </div>
          <figure className="mt-5 rounded-2xl bg-papel px-4 py-4 sm:px-5">
            <figcaption className="text-xs font-medium text-tinta-3">Soaria assim</figcaption>
            <blockquote className="mt-1.5 font-display text-lg font-medium leading-snug tracking-[-0.01em] text-tinta" aria-live="polite">
              “{frase}”
            </blockquote>
          </figure>
        </fieldset>

        <fieldset>
          <legend className={SUBTITULO}>Formatos</legend>
          <p className="mt-1 text-sm text-tinta-3">Marque quantos quiser. Pelo menos um fica ligado.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {FORMATOS_MOTOR.map((f) => (
              <Chip key={f.id} ativo={formatos.includes(f.id)} onClick={() => alternarFormato(f.id)}>
                {f.nome}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className={SUBTITULO}>Frequência</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {FREQUENCIAS.map((f) => (
              <Chip key={f.id} ativo={frequencia === f.id} onClick={() => setFrequencia(f.id)}>
                {f.nome}, {f.porSemana === 7 ? "diário" : `${f.porSemana} por semana`}
                {f.id === sugestao.frequencia && (
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${frequencia === f.id ? "bg-papel/15 text-papel" : "bg-pauta/10 text-pauta-escura"}`}>
                    sugerido
                  </span>
                )}
              </Chip>
            ))}
          </div>
          {freqSugerida && (
            <p className="mt-3 text-sm leading-relaxed text-tinta-2">
              <strong className="font-semibold text-tinta">Por que {freqSugerida.nome.toLowerCase()}:</strong> {sugestao.porque_frequencia}
            </p>
          )}
        </fieldset>
      </div>

      <div ref={turboRef} className="scroll-mt-24">
        {abrirTurbo && (
          <div className="mt-6">
            <TelaTurbinar turbo={turbo} onChange={setTurbo} />
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <button
          type="submit"
          className="h-14 rounded-full bg-pauta px-8 text-lg font-semibold text-white transition-colors hover:bg-pauta-escura focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta"
        >
          Gerar minha pauta
        </button>
        <button
          type="button"
          onClick={alternarTurbo}
          aria-expanded={abrirTurbo}
          aria-controls="turbinar"
          className="self-start text-sm text-tinta-2 underline decoration-tinta/30 underline-offset-4 hover:text-tinta hover:decoration-tinta sm:self-auto"
        >
          {abrirTurbo ? "Fechar o turbo" : "Quer turbinar?"}
        </button>
      </div>
    </form>
  );
}
