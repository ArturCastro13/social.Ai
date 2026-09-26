"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AjustesRedes, CampoQuantidade, type Redes } from "./AjustesRedes";
import { dominioDe } from "@/components/estudio/useGeracao";
import type { DadosFormulario } from "@/components/estudio/Formulario";
import { brandSemSite } from "@/lib/brand/sem-site";
import {
  fraseDoTom,
  lerEmpresaSalva,
  lerPreferenciasSalvas,
  normalizarLink,
  PERFIS,
  PERGUNTAS_FOUNDER,
  saberSalvo,
  salvarEmpresa,
  salvarPreferencias,
  sugestoesPadrao,
  tipoDaInspiracao,
  type PerfilAlvo,
  type RedeArroba,
} from "@/lib/client/onboarding";
import { FORMATOS_MOTOR, FREQUENCIAS, OBJETIVOS, REGUAS_TOM, type FormatoMotor, type Frequencia, type ObjetivoId } from "@/lib/motor/constantes";
import { conhecimentoPreenchido, type Preferencias, type SugestoesOnboarding, type TomDeVoz } from "@/lib/motor/contrato";
import { NICHOS, type BrandProfile } from "@/lib/types";
import { PassoSaber, SABER_VAZIO, type Saber } from "./PassoSaber";
import { TelaTurbinar, TURBO_VAZIO, type Turbo } from "./TelaTurbinar";
import { EMPRESA_VAZIA, empresaParaMarca, TelaSemSite, type Empresa } from "./TelaSemSite";
import { CampoConcorrentes, useConcorrentes } from "./Concorrentes";
import { Chip } from "./ui";
import { MateriaisEmpresa, useMateriaisEmpresa } from "./MateriaisEmpresa";
import { ResumoNegocio } from "./ResumoNegocio";
import type { ContextoConfirmado } from "@/lib/contexto/contrato";

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
 * Sem site (`dados.semSite`), começa pela tela da empresa e monta a marca com `brandSemSite`, sem abrir /api/brand.
 */
export function TelaAjustes({
  dados,
  onGerar,
}: {
  dados: DadosFormulario;
  /** `redes` volta com os @, a quantidade e a paleta do print, que agora são escolhidos aqui. */
  onGerar: (p: Preferencias, brand: BrandProfile | null, redes: Partial<DadosFormulario>) => void;
}) {
  const semSite = !!dados.semSite;
  const dominio = dominioDe(dados.url);
  const materiais = useMateriaisEmpresa(dados.semSite ? "empresa-sem-site-desta-sessao" : dominio);
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
  // Passo "O que só você sabe" vem antes dos ajustes e aproveita o tempo de leitura do site.
  const [passo, setPasso] = useState<"empresa" | "saber" | "ajustes">(semSite ? "empresa" : "saber");
  const [empresa, setEmpresa] = useState<Empresa>(EMPRESA_VAZIA);
  const concorrentes = useConcorrentes();
  const [objetivoLivre, setObjetivoLivre] = useState("");
  const execucao = useRef(0);
  const [saber, setSaber] = useState<Saber>(SABER_VAZIO);
  const [usarSaber, setUsarSaber] = useState(true);
  const [link, setLink] = useState("");
  const [contextoSalvo, setContextoSalvo] = useState<{ chave: string; valor: ContextoConfirmado } | null>(null);
  const [erroContexto, setErroContexto] = useState("");
  const assinatura = JSON.stringify({ dominio: brand?.dominio, descricao: brand?.description, saber: usarSaber ? saber : {}, publico, materiais: materiais.estado.revisao, paleta: redes.paletaInstagram, empresa: semSite ? empresa : null });
  const contexto = contextoSalvo?.chave === assinatura ? contextoSalvo.valor : undefined;
  const invalidarConcorrentes = concorrentes.invalidar;
  useEffect(() => { invalidarConcorrentes(); }, [assinatura, invalidarConcorrentes]);
  const invalidarContexto = useCallback(() => { setContextoSalvo(null); invalidarConcorrentes(); }, [invalidarConcorrentes]);

  function aplicarSugestao(s: SugestoesOnboarding) {
    setPublico(s.publico_alvo);
    setObjetivos(s.objetivos);
    setTom(s.tom_de_voz);
    setMexeuNoTom(false);
    setFormatos(s.formatos);
    setFrequencia(s.frequencia);
  }

  /**
   * Pega as sugestões do /api/inferir e aplica o que a pessoa ajustou da última vez nesta marca.
   * Com `pronta` (sem site), a marca já vem montada; sem ela, o site é lido pelo /api/brand.
   */
  async function carregar(pronta?: BrandProfile, publicoInformado = "") {
    const minha = ++execucao.current;
    const vivo = () => execucao.current === minha;
    setCarregando(true);
    let b: BrandProfile | null = pronta ?? null;
    if (!pronta) {
      const handles = { instagram: dados.instagram || undefined, linkedin: dados.linkedin || undefined, x: dados.x || undefined, facebook: dados.facebook || undefined };
      try {
        b = await postar<BrandProfile>(
          "/api/brand",
          { url: dados.url, ...handles, paletaInstagram: dados.paletaInstagram.length ? dados.paletaInstagram : undefined },
          25000,
        );
      } catch {
        b = null; // a geração tenta de novo e mostra o erro com calma
      }
    }
    const padrao = sugestoesPadrao(perfilInicial);
    let s = padrao;
    try {
      s = sugestaoValida(await postar<Partial<SugestoesOnboarding>>("/api/inferir", b ? { brand: b } : { url: dados.url }, 15000), padrao);
    } catch {
      /* sem inferência, seguem os padrões locais */
    }
    if (!vivo()) return;
    // O público que o founder escreveu vale mais que o deduzido.
    if (publicoInformado.trim()) s = { ...s, publico_alvo: publicoInformado.trim().slice(0, 300) };
    setBrand(b);
    setSugestao(s);
    const salvasAntes = lerPreferenciasSalvas(pronta ? pronta.dominio : dominioDe(dados.url));
    // Links salvos entram antes da busca, para a busca não marcar nada por cima da escolha antiga.
    concorrentes.restaurar(salvasAntes?.concorrentes ?? []);
    // Sem site, a busca já saiu da tela da empresa. Com site, sai agora e não trava a tela.
    // Concorrentes só são buscados após a revisão conjunta de respostas e materiais.
    const salvas = salvasAntes;
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
        // Só preenche se a pessoa não escreveu o @ na tela da empresa.
        if (rede) setFounder((atual) => (atual.valor.trim() ? atual : { valor: f[rede] ?? "", rede }));
      }
      const cf = salvas.conhecimento_founder;
      // Só preenche se a pessoa ainda não começou a escrever enquanto o site carregava.
      // Respostas antigas (com as perguntas da versão anterior) ficam guardadas, mas a tela mostra só as três novas.
      if (cf) setSaber((atual) => (Object.values(atual).some((v) => v.trim()) ? atual : { ...SABER_VAZIO, ...saberSalvo(cf) }));
      setLink(salvas.link_destino ?? "");
      setObjetivoLivre(salvas.objetivo_livre ?? "");
      const insp = salvas.inspiracoes.map((i) => i.url).slice(0, 3);
      setTurbo({
        inspiracoes: [...insp, "", "", ""].slice(0, 3),
        brandBook: salvas.brand_book_texto ?? "",
        fala: f.transcricao_audio ?? "",
        proibicoes: salvas.proibicoes,
      });
    } else {
      setDaUltimaVez(false);
      aplicarSugestao(s);
    }
    setCarregando(false);
  }

  useEffect(() => {
    if (semSite) {
      // Quem já contou sobre a empresa antes não precisa digitar tudo de novo.
      const salva = lerEmpresaSalva<Empresa>();
      if (salva) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setEmpresa({
          ...EMPRESA_VAZIA,
          ...salva,
          redes: { ...EMPRESA_VAZIA.redes, ...salva.redes },
          semRede: { ...EMPRESA_VAZIA.semRede, ...salva.semRede },
          paleta: Array.isArray(salva.paleta) ? salva.paleta : [],
        });
      }
    } else {
      carregar();
    }
    // Invalida a leitura em andamento quando a tela sai (a resposta atrasada não mexe em nada).
    const exec = execucao;
    return () => {
      exec.current++;
    };
    // Roda uma vez por site; a tela é remontada quando os dados mudam.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Sem site: a marca nasce do que a pessoa contou. Só pede sugestões de novo se nome ou descrição mudaram. */
  function confirmarEmpresa() {
    const b = brandSemSite(empresaParaMarca(empresa));
    salvarEmpresa(empresa);
    const mesmaMarca = brand?.dominio === b.dominio && !carregando;
    setBrand(b);
    if (!mesmaMarca) carregar(b, empresa.publico);
    else if (empresa.publico.trim() && !publico.trim()) setPublico(empresa.publico.trim().slice(0, 300));
    setPasso("saber");
    window.scrollTo({ top: 0 });
  }

  const frase = useMemo(() => (mexeuNoTom ? fraseDoTom(tom) : sugestao.exemplo_tom), [mexeuNoTom, tom, sugestao.exemplo_tom]);
  const nicho = contexto ? (NICHOS.find(n => n.id === contexto.entendimento.nicho)?.nome ?? contexto.entendimento.segmento) : "segmento a confirmar";
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
    const conhecimento = usarSaber
      ? conhecimentoPreenchido({
          problema_cliente: saber.problema_cliente.slice(0, 600),
          objecao_cliente: saber.objecao_cliente.slice(0, 600),
          diferencial: saber.diferencial.slice(0, 600),
          crenca_contraria: saber.crenca_contraria.slice(0, 600),
          historia: saber.historia.slice(0, 600),
        })
      : null;
    const destino = normalizarLink(link);
    const objetivoEscrito = objetivoLivre.trim().slice(0, 200);
    return {
      ...(contexto ? { contexto_empresa: contexto } : {}),
      perfil_alvo: perfil,
      ...((contexto?.entendimento.publico || publico).trim() ? { publico_alvo: (contexto?.entendimento.publico || publico).trim().slice(0, 300) } : {}),
      ...(conhecimento ? { conhecimento_founder: conhecimento } : {}),
      ...(destino ? { link_destino: destino.slice(0, 500) } : {}),
      founder: {
        ...(arroba ? { [founder.rede]: arroba } : {}),
        ...(turbo.fala.trim() ? { transcricao_audio: turbo.fala.trim().slice(0, 6000) } : {}),
      },
      objetivos,
      ...(objetivoEscrito ? { objetivo_livre: objetivoEscrito } : {}),
      tom_de_voz: tom,
      formatos_permitidos: formatos,
      frequencia_escolhida: frequencia,
      proibicoes: turbo.proibicoes,
      inspiracoes,
      ...(turbo.brandBook.trim() ? { brand_book_texto: turbo.brandBook.trim().slice(0, 20000) } : {}),
      noticias: [],
      concorrentes: concorrentes.finais(),
    };
  }

  function gerar(e: React.FormEvent) {
    e.preventDefault();
    if (materiais.pendente || (brand && !contexto) || (!brand && materiais.materiais.length)) {
      setErroContexto("Confira e confirme o contexto da empresa antes de gerar a pauta.");
      document.getElementById("contexto-empresa")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const p = montarPreferencias();
    const quem = { perfil, founder: founder.valor.trim() || undefined, redeFounder: founder.valor.trim() ? founder.rede : undefined };
    if (semSite) {
      const dadosEmpresa = empresaParaMarca(empresa);
      const b = brandSemSite(dadosEmpresa);
      salvarPreferencias(b.dominio, p);
      const h = dadosEmpresa.handles ?? {};
      onGerar(p, b, {
        url: b.url,
        instagram: h.instagram ?? "",
        linkedin: h.linkedin ?? "",
        x: h.x ?? "",
        facebook: h.facebook ?? "",
        quantidade: redes.quantidade,
        paletaInstagram: dadosEmpresa.paleta ?? [],
        ...quem,
      });
      return;
    }
    salvarPreferencias(dominio, p);
    const arroba = redes.empresa.valor.trim();
    onGerar(p, redes.paletaInstagram.length ? null : brand, {
      instagram: redes.empresa.rede === "instagram" ? arroba : "",
      linkedin: redes.empresa.rede === "linkedin" ? arroba : "",
      x: redes.empresa.rede === "x" ? arroba : "",
      facebook: redes.facebook.trim(),
      quantidade: redes.quantidade,
      paletaInstagram: redes.paletaInstagram,
      ...quem,
    });
  }

  function alternarTurbo() {
    setAbrirTurbo((v) => !v);
    if (!abrirTurbo) requestAnimationFrame(() => turboRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function irPara(p: typeof passo) {
    setPasso(p);
    window.scrollTo({ top: 0 });
  }

  if (passo === "empresa") {
    return (
      <TelaSemSite
        materiais={materiais}
        empresa={empresa}
        onChange={setEmpresa}
        founder={founder}
        onFounder={setFounder}
        concorrentes={concorrentes}
        onContinuar={confirmarEmpresa}
      />
    );
  }

  const nomeEmpresa = empresa.nome.trim() || "a sua empresa";

  if (passo === "saber") {
    return (
      <PassoSaber
        saber={saber}
        onChange={setSaber}
        lendo={carregando && !semSite ? dominio : null}
        espera={carregando && semSite ? `Enquanto isso, a gente prepara as sugestões para ${nomeEmpresa}.` : null}
        semSite={semSite}
        onVoltar={semSite ? () => irPara("empresa") : undefined}
        onContinuar={(usar) => {
          setUsarSaber(usar);
          setPasso("ajustes");
          window.scrollTo({ top: 0 });
        }}
      />
    );
  }

  const respondidas = usarSaber ? PERGUNTAS_FOUNDER.filter((p) => saber[p.id].trim()).length : 0;
  const linkInvalido = link.trim() !== "" && !normalizarLink(link);

  if (carregando) {
    return (
      <div role="status" aria-live="polite">
        <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">{semSite ? `Pensando em ${nomeEmpresa}` : `Lendo ${dominio}`}</h1>
        <p className="mt-3 text-tinta-2">
          {semSite ? "Montando as sugestões com o que você contou, para você só corrigir." : "Tirando do site o que dá para tirar, para você só corrigir."}{" "}
          <span className="inline-block animate-pisca text-pauta">▍</span>
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
            {[contexto?.paleta?.primaria ?? brand.paleta.primaria, contexto?.paleta?.secundaria ?? brand.paleta.secundaria, contexto?.paleta?.destaque ?? brand.paleta.destaque].map((c, i) => (
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
          {semSite ? "Trouxe os ajustes que você fez da última vez para esta empresa." : "Trouxe os ajustes que você fez da última vez neste site."}
          <button
            type="button"
            onClick={() => {
              aplicarSugestao(sugestao);
              setDaUltimaVez(false);
            }}
            className="underline decoration-tinta/30 underline-offset-4 hover:text-tinta hover:decoration-tinta"
          >
            {semSite ? "usar a sugestão nova" : "usar o que o site sugere"}
          </button>
        </p>
      )}

      <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-tinta/10 bg-white px-4 py-3 text-sm text-tinta-2">
        <span>
          <strong className="text-tinta">Sobre o seu negócio:</strong>{" "}
          {respondidas ? `${respondidas} de 3 respondidas, e elas viram assunto de post.` : `pulado por agora. Os posts saem só do ${semSite ? "que você contou" : "site"}.`}
        </span>
        <button
          type="button"
          onClick={() => irPara("saber")}
          className="underline decoration-tinta/30 underline-offset-4 hover:text-tinta hover:decoration-tinta"
        >
          {respondidas ? "editar" : "responder agora"}
        </button>
      </p>

      {semSite && (
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-tinta/10 bg-white px-4 py-3 text-sm text-tinta-2">
          <span>
            <strong className="text-tinta">Sua empresa e redes:</strong> {resumoRedes(empresa)}
          </span>
          <button
            type="button"
            onClick={() => irPara("empresa")}
            className="underline decoration-tinta/30 underline-offset-4 hover:text-tinta hover:decoration-tinta"
          >
            editar
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

        <div>
          <label htmlFor="ajuste-link" className={`block ${SUBTITULO}`}>
            Para onde você quer mandar quem gostar do post? <span className="font-sans text-sm font-normal text-tinta-3">(opcional)</span>
          </label>
          <p className="mt-1 text-sm text-tinta-3">Link de agendamento, WhatsApp ou página de cadastro. Entra no fim dos posts feitos para gerar cliente.</p>
          <input
            id="ajuste-link"
            inputMode="url"
            autoCapitalize="none"
            spellCheck={false}
            value={link}
            onChange={(e) => setLink(e.target.value)}
            maxLength={500}
            placeholder="wa.me/5511999999999 ou calendly.com/seu-nome"
            aria-invalid={linkInvalido}
            className="mt-3 h-11 w-full min-w-0 rounded-full border border-tinta/20 bg-white px-4 text-base outline-none transition-colors placeholder:text-tinta-3 focus:border-tinta"
          />
          {linkInvalido && <p className="mt-1 pl-4 text-xs text-pauta-escura">Esse não parece um link. Ele vai ficar de fora.</p>}
        </div>

        {/* Sem site, os concorrentes já foram pedidos na tela da empresa. */}

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

        {semSite ? (
          <fieldset>
            <legend className={SUBTITULO}>Quantos posts</legend>
            <div className="mt-3">
              <CampoQuantidade valor={redes.quantidade} onChange={(quantidade) => setRedes((r) => ({ ...r, quantidade }))} />
            </div>
          </fieldset>
        ) : (
          <AjustesRedes redes={redes} onChange={setRedes} founder={founder} onFounder={setFounder} titulo={SUBTITULO} />
        )}

        <MateriaisEmpresa controle={materiais} />
        {brand && <ResumoNegocio
          entrada={{ brand, founder: usarSaber ? saber : {}, materiais: materiais.materiais, publico, ...(semSite ? { descricaoManual: empresa.descricao } : {}) }}
          revisao={materiais.estado.revisao} chaveEntrada={assinatura} pendente={materiais.pendente} confirmado={!!contexto}
          onInvalidar={invalidarContexto}
          onConfirmar={c => { setContextoSalvo({ chave: assinatura, valor: c }); setErroContexto(""); concorrentes.buscar(brand, c.entendimento.publico, c); }}
        />}
        <CampoConcorrentes controle={concorrentes} titulo={SUBTITULO} />

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
          <label htmlFor="ajuste-objetivo-livre" className="mt-4 block text-sm text-tinta-2">
            Ou escreva com as suas palavras <span className="text-tinta-3">(opcional)</span>
          </label>
          <input
            id="ajuste-objetivo-livre"
            value={objetivoLivre}
            onChange={(e) => setObjetivoLivre(e.target.value)}
            maxLength={200}
            autoComplete="off"
            placeholder="Ex.: fechar 10 clínicas novas até dezembro"
            className="mt-1 h-11 w-full min-w-0 rounded-full border border-tinta/20 bg-white px-4 text-base outline-none transition-colors placeholder:text-tinta-3 focus:border-tinta"
          />
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
      {erroContexto && <p role="alert" className="mt-3 text-sm text-pauta-escura">{erroContexto}</p>}
    </form>
  );
}

const NOMES_REDES = { instagram: "Instagram", linkedin: "LinkedIn", x: "X", facebook: "Facebook" } as const;

/** "Instagram e LinkedIn" ou "nenhuma rede ainda", para o resumo da tela de ajustes. */
function resumoRedes(e: Empresa): string {
  const com = (Object.keys(NOMES_REDES) as (keyof typeof NOMES_REDES)[]).filter((r) => !e.semRede[r] && e.redes[r].trim()).map((r) => NOMES_REDES[r]);
  const redes = com.length ? (com.length === 1 ? com[0] : `${com.slice(0, -1).join(", ")} e ${com[com.length - 1]}`) : "nenhuma rede ainda";
  return `${e.nome.trim()}, ${redes}.`;
}
