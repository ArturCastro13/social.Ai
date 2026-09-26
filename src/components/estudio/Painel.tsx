"use client";

import { useMemo, useState } from "react";
import { baixarZip, type Personalizacao } from "@/lib/client/artes";
import { NICHOS, type Analise, type Rede } from "@/lib/types";
import { EmailGate } from "./EmailGate";
import { PostCard } from "./PostCard";
import { Validacao } from "./Validacao";

const NOMES_REDE: Record<Rede, string> = { instagram: "Instagram", linkedin: "LinkedIn", x: "X", facebook: "Facebook" };
const COR_REDE: Record<Rede, string> = { instagram: "#e1306c", linkedin: "#0a66c2", x: "#16130f", facebook: "#1877f2" };

const ORIGEM: Record<Analise["origem"], { rotulo: string; classe: string }> = {
  ia: { rotulo: "Escrito pela IA agora", classe: "bg-salvia text-papel" },
  cache: { rotulo: "Análise salva desta URL", classe: "bg-salvia/80 text-papel" },
  demo: { rotulo: "Exemplo pré-processado", classe: "bg-limao text-tinta" },
  local: { rotulo: "Motor local, sem IA", classe: "bg-papel-3 text-tinta" },
};

function emailSalvo(): string | null {
  try {
    return localStorage.getItem("socialai_email");
  } catch {
    return null;
  }
}

export function Painel({ analise, onNova }: { analise: Analise; onNova: () => void }) {
  const [pers, setPers] = useState<Record<string, Personalizacao>>({});
  const [email, setEmail] = useState<string | null>(() => (typeof window === "undefined" ? null : emailSalvo()));
  const [gate, setGate] = useState<null | (() => void)>(null);
  const [zip, setZip] = useState<{ feito: number; total: number } | null>(null);
  const [aviso, setAviso] = useState("");
  const b = analise.brand;
  const nicho = NICHOS.find((n) => n.id === analise.nicho)?.nome ?? analise.nicho;

  const semanas = useMemo(() => {
    const grupos: { titulo: string; itens: typeof analise.calendario }[] = [];
    let atual = "";
    for (const c of analise.calendario) {
      const d = new Date(c.data + "T12:00:00");
      const seg = new Date(d);
      seg.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const chave = seg.toISOString().slice(0, 10);
      if (chave !== atual) {
        atual = chave;
        grupos.push({ titulo: `Semana de ${seg.getDate().toString().padStart(2, "0")}/${(seg.getMonth() + 1).toString().padStart(2, "0")}`, itens: [] });
      }
      grupos[grupos.length - 1].itens.push(c);
    }
    return grupos;
  }, [analise]);

  function comEmail(acao: () => void) {
    if (email) acao();
    else setGate(() => acao);
  }

  function baixarUma(url: string, nome: string) {
    comEmail(async () => {
      setAviso("");
      const res = await fetch(url).catch(() => null);
      if (!res?.ok) {
        setAviso("Não deu para baixar essa arte agora. Tente de novo em instantes.");
        return;
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = nome;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    });
  }

  function baixarTudo() {
    comEmail(async () => {
      setZip({ feito: 0, total: 1 });
      setAviso("");
      try {
        const r = await baixarZip(analise, pers, (feito, total) => setZip({ feito, total }));
        if (r.falhas) setAviso(`${r.falhas} de ${r.total} imagens não vieram; o ZIP foi baixado com as demais.`);
      } catch (e) {
        setAviso((e as Error).message);
      } finally {
        setZip(null);
      }
    });
  }

  return (
    <section id="resultado" className="scroll-mt-4 border-y-2 border-tinta bg-papel">
      {/* Cabeçalho do resultado */}
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-10 sm:pt-14">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`retranca px-2 py-1 ${ORIGEM[analise.origem].classe}`}>{ORIGEM[analise.origem].rotulo}</span>
          <span className="retranca border border-tinta/25 px-2 py-1">Nicho: {nicho}</span>
          <span className="retranca border border-tinta/25 px-2 py-1">{analise.posts.length} posts</span>
          <button type="button" onClick={onNova} className="retranca ml-auto text-tinta-2 underline decoration-pauta decoration-2 underline-offset-4 hover:text-pauta">
            ← analisar outro site
          </button>
        </div>
        <div className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <p className="retranca text-pauta">Pauta · {b.nome}</p>
            <h2 className="mt-2 font-serif text-4xl leading-[1.05] sm:text-6xl">{analise.posicionamento}</h2>
          </div>
          <div className="flex items-end gap-4 lg:justify-end">
            <div className="flex">
              {[b.paleta.primaria, b.paleta.secundaria, b.paleta.destaque, b.paleta.fundo, b.paleta.texto].map((c, i) => (
                <div key={c + i} className="flex flex-col items-center gap-1">
                  <span className="h-14 w-10 border border-tinta/15 sm:w-12" style={{ background: c }} />
                  <span className="font-mono text-[10px] text-tinta-3">{c.slice(1)}</span>
                </div>
              ))}
            </div>
            <div className="text-sm text-tinta-2">
              <p className="font-semibold text-tinta">{b.fontes.titulo}</p>
              <p>{b.fontes.corpo !== b.fontes.titulo ? b.fontes.corpo : "título e corpo"}</p>
            </div>
          </div>
        </div>
        {analise.avisos.length > 0 && (
          <ul className="mt-6 space-y-1 border-l-4 border-pauta bg-pauta/5 px-4 py-3 text-sm text-tinta-2">
            {analise.avisos.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Diagnóstico */}
      <div className="border-t border-tinta/15 bg-white/50">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1fr_2fr]">
          <div className="space-y-6">
            <p className="retranca text-pauta">01 · Diagnóstico</p>
            <div>
              <h3 className="retranca text-tinta-3">O negócio</h3>
              <p className="mt-1 leading-relaxed">{analise.resumo_negocio}</p>
            </div>
            <div>
              <h3 className="retranca text-tinta-3">Quem compra</h3>
              <p className="mt-1 leading-relaxed">{analise.publico}</p>
            </div>
            <div>
              <h3 className="retranca text-tinta-3">Tom de voz</h3>
              <p className="mt-1 leading-relaxed">{analise.tom_de_voz}</p>
            </div>
          </div>
          <div>
            <h3 className="font-serif text-3xl leading-tight sm:text-4xl">
              O que os virais de {nicho} fazem <em className="sublinhado-pauta">e você ainda não</em>
            </h3>
            <ol className="mt-6 space-y-5">
              {analise.diagnostico.map((d, i) => (
                <li key={d.titulo} className="grid grid-cols-[2.5rem_1fr] gap-3 border-t border-tinta/15 pt-5">
                  <span className="font-serif text-3xl italic text-pauta">{i + 1}</span>
                  <div>
                    <p className="text-lg font-semibold leading-snug">{d.titulo}</p>
                    <p className="mt-1 leading-relaxed text-tinta-2">{d.texto}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {/* Estratégia */}
      <div className="border-t border-tinta/15">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <p className="retranca text-pauta">02 · Estratégia</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {analise.pilares.map((p, i) => (
              <div key={p.nome} className="border-2 border-tinta bg-white p-5">
                <p className="font-mono text-xs text-tinta-3">Pilar {i + 1}</p>
                <p className="mt-2 font-serif text-2xl leading-tight">{p.nome}</p>
                <p className="mt-2 text-sm leading-relaxed text-tinta-2">{p.descricao}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 divide-y divide-tinta/15 border-y border-tinta/15">
            {analise.estrategia.map((e) => (
              <div key={e.rede} className="grid gap-2 py-4 sm:grid-cols-[10rem_7rem_1fr] sm:items-baseline">
                <p className="flex items-center gap-2 font-semibold">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: COR_REDE[e.rede] }} />
                  {NOMES_REDE[e.rede]}
                </p>
                <p className="font-mono text-sm">{e.frequencia_semanal} {e.frequencia_semanal === 1 ? "vez" : "vezes"} por semana</p>
                <p className="text-sm leading-relaxed text-tinta-2">{e.foco}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Calendário */}
      <div className="border-t border-tinta/15 bg-tinta text-papel">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <p className="retranca text-limao">03 · Calendário</p>
          <h3 className="mt-2 font-serif text-3xl sm:text-4xl">As próximas semanas, já decididas.</h3>
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {semanas.map((s) => (
              <div key={s.titulo}>
                <p className="retranca border-b border-papel/20 pb-2 text-papel/60">{s.titulo}</p>
                <ul className="mt-2 space-y-2">
                  {s.itens.map((c) => {
                    const p = analise.posts.find((x) => x.id === c.post_id);
                    return (
                      <li key={c.post_id}>
                        <a href={`#post-${c.post_id}`} className="grid grid-cols-[3.2rem_1fr] gap-3 rounded-sm py-1 transition hover:bg-papel/5">
                          <span className="font-mono text-sm leading-tight">
                            <span className="block text-limao">{c.data.slice(8, 10)}/{c.data.slice(5, 7)}</span>
                            <span className="text-xs text-papel/50">{c.horario}</span>
                          </span>
                          <span className="text-sm leading-snug">
                            <span className="retranca mr-1 text-[0.62rem] text-papel/50">{c.dia_semana} · {NOMES_REDE[c.rede]}</span>
                            <span className="block">{p?.gancho}</span>
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="border-t border-tinta/15">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="retranca text-pauta">04 · Posts prontos</p>
              <h3 className="mt-2 font-serif text-3xl sm:text-4xl">Troque a cor, troque o modelo, poste.</h3>
            </div>
            <button
              type="button"
              onClick={baixarTudo}
              disabled={!!zip}
              className="h-12 border-2 border-tinta bg-pauta px-6 font-bold text-white shadow-[4px_4px_0_var(--color-tinta)] transition hover:-translate-y-0.5 disabled:opacity-70"
            >
              {zip ? `Montando o ZIP ${Math.round((zip.feito / Math.max(zip.total, 1)) * 100)}%` : "Baixar tudo em ZIP"}
            </button>
          </div>
          {aviso && (
            <p className="mt-4 border-l-4 border-pauta bg-pauta/10 px-3 py-2 text-sm" role="alert">
              {aviso}
            </p>
          )}
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {analise.posts.map((p, i) => (
              <div key={p.id} id={`post-${p.id}`} className="scroll-mt-6">
                <PostCard
                  analise={analise}
                  post={p}
                  indice={i}
                  pers={pers[p.id] ?? {}}
                  onPers={(x) => setPers((old) => ({ ...old, [p.id]: x }))}
                  onBaixar={baixarUma}
                  agenda={analise.calendario.find((c) => c.post_id === p.id)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-tinta/15 bg-papel-2">
        <div className="mx-auto max-w-3xl px-4 py-12">
          <Validacao analiseId={analise.id} email={email} />
        </div>
      </div>

      <EmailGate
        aberto={!!gate}
        onFechar={() => setGate(null)}
        onLiberado={(e) => {
          setEmail(e);
          const acao = gate;
          setGate(null);
          acao?.();
        }}
        contexto={{ url: analise.url, empresa: b.nome, analiseId: analise.id }}
      />
    </section>
  );
}
