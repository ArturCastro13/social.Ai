"use client";

import { useMemo, useState } from "react";
import { baixarZip, type Personalizacao } from "@/lib/client/artes";
import { NICHOS, type Analise, type Rede } from "@/lib/types";
import { IdeiasEMetricas } from "./IdeiasEMetricas";
import { PostCard } from "./PostCard";

const NOMES_REDE: Record<Rede, string> = { instagram: "Instagram", linkedin: "LinkedIn", x: "X", facebook: "Facebook" };
const COR_REDE: Record<Rede, string> = { instagram: "#e1306c", linkedin: "#0a66c2", x: "#16130f", facebook: "#1877f2" };

const ORIGEM: Record<Analise["origem"], { rotulo: string; classe: string }> = {
  ia: { rotulo: "Escrito pela IA agora", classe: "bg-tinta text-papel" },
  cache: { rotulo: "Análise salva desta URL", classe: "bg-tinta/85 text-papel" },
  demo: { rotulo: "Exemplo pré-processado", classe: "bg-pauta/10 text-pauta-escura" },
  local: { rotulo: "Motor local, sem IA", classe: "bg-papel-2 text-tinta" },
};

const TITULO_SECAO = "font-display text-3xl font-semibold tracking-[-0.02em] sm:text-4xl";
const CHIP = "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium";

export function Painel({ analise, onNova }: { analise: Analise; onNova: () => void }) {
  const [pers, setPers] = useState<Record<string, Personalizacao>>({});
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

  async function baixarUma(url: string, nome: string) {
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
  }

  async function baixarTudo() {
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
  }

  return (
    <section id="resultado" className="scroll-mt-4 border-t border-tinta/10 bg-papel">
      {/* Cabeçalho do resultado */}
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:pt-14">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`${CHIP} ${ORIGEM[analise.origem].classe}`}>{ORIGEM[analise.origem].rotulo}</span>
          <span className={`${CHIP} border border-tinta/10 bg-white text-tinta-2`}>Nicho: {nicho}</span>
          <span className={`${CHIP} border border-tinta/10 bg-white text-tinta-2`}>{analise.posts.length} posts</span>
          <button
            type="button"
            onClick={onNova}
            className="ml-auto inline-flex h-9 items-center rounded-full border border-tinta/15 bg-white px-4 text-sm font-medium text-tinta-2 transition hover:border-tinta/30 hover:text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta"
          >
            ← analisar outro site
          </button>
        </div>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <p className="text-sm font-medium text-tinta-3">Pauta de {b.nome}</p>
            <h2 className="mt-2 font-display text-4xl font-semibold leading-[1.05] tracking-[-0.03em] sm:text-6xl">{analise.posicionamento}</h2>
          </div>
          <div className="flex items-end gap-4 rounded-3xl bg-white p-4 shadow-[0_30px_60px_-40px_rgba(22,19,15,.35)] lg:justify-self-end">
            <div className="flex gap-1.5">
              {[b.paleta.primaria, b.paleta.secundaria, b.paleta.destaque, b.paleta.fundo, b.paleta.texto].map((c, i) => (
                <div key={c + i} className="flex flex-col items-center gap-1">
                  <span className="h-14 w-9 rounded-xl border border-tinta/10 sm:w-11" style={{ background: c }} />
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
          <ul className="mt-6 space-y-1 rounded-2xl border border-pauta/25 bg-pauta/5 px-4 py-3 text-sm text-tinta-2">
            {analise.avisos.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        )}
      </div>

      <IdeiasEMetricas analise={analise} />

      {/* Diagnóstico */}
      <div className="border-t border-tinta/10">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-[1fr_2fr] lg:gap-16">
          <div className="space-y-6">
            <h3 className={TITULO_SECAO}>Diagnóstico</h3>
            <div>
              <h4 className="text-sm font-medium text-tinta-3">O negócio</h4>
              <p className="mt-1 leading-relaxed">{analise.resumo_negocio}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-tinta-3">Quem compra</h4>
              <p className="mt-1 leading-relaxed">{analise.publico}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-tinta-3">Tom de voz</h4>
              <p className="mt-1 leading-relaxed">{analise.tom_de_voz}</p>
            </div>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow-[0_30px_60px_-40px_rgba(22,19,15,.35)] sm:p-8">
            <h4 className="font-display text-2xl font-semibold leading-tight tracking-[-0.02em] sm:text-3xl">
              O que os virais de {nicho} fazem e você ainda não
            </h4>
            <ol className="mt-6 space-y-5">
              {analise.diagnostico.map((d, i) => (
                <li key={d.titulo} className="grid grid-cols-[2.25rem_1fr] gap-3 border-t border-tinta/10 pt-5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-papel font-display text-sm font-semibold text-tinta">{i + 1}</span>
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
      <div className="border-t border-tinta/10">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h3 className={TITULO_SECAO}>Estratégia</h3>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {analise.pilares.map((p, i) => (
              <div key={p.nome} className="rounded-3xl border border-tinta/10 bg-white p-6">
                <p className="text-xs font-medium text-tinta-3">Pilar {i + 1}</p>
                <p className="mt-2 font-display text-2xl font-semibold leading-tight tracking-[-0.02em]">{p.nome}</p>
                <p className="mt-2 text-sm leading-relaxed text-tinta-2">{p.descricao}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 divide-y divide-tinta/10 rounded-3xl border border-tinta/10 bg-white px-6">
            {analise.estrategia.map((e) => (
              <div key={e.rede} className="grid gap-2 py-4 sm:grid-cols-[10rem_9rem_1fr] sm:items-baseline">
                <p className="flex items-center gap-2 font-semibold">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: COR_REDE[e.rede] }} />
                  {NOMES_REDE[e.rede]}
                </p>
                <p className="text-sm tabular-nums text-tinta-2">{e.frequencia_semanal} {e.frequencia_semanal === 1 ? "vez" : "vezes"} por semana</p>
                <p className="text-sm leading-relaxed text-tinta-2">{e.foco}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Calendário */}
      <div className="border-t border-tinta/10 bg-papel-2/40">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h3 className={TITULO_SECAO}>Calendário</h3>
          <p className="mt-2 text-tinta-2">As próximas semanas, já decididas.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {semanas.map((s) => (
              <div key={s.titulo} className="rounded-3xl bg-white p-5 shadow-[0_30px_60px_-40px_rgba(22,19,15,.35)]">
                <p className="border-b border-tinta/10 pb-3 text-sm font-semibold text-tinta">{s.titulo}</p>
                <ul className="mt-2 space-y-1">
                  {s.itens.map((c) => {
                    const p = analise.posts.find((x) => x.id === c.post_id);
                    return (
                      <li key={c.post_id}>
                        <a
                          href={`#post-${c.post_id}`}
                          className="-mx-2 grid grid-cols-[3.2rem_1fr] gap-3 rounded-xl px-2 py-2 transition hover:bg-papel focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-pauta"
                        >
                          <span className="text-sm leading-tight tabular-nums">
                            <span className="block font-semibold text-tinta">{c.data.slice(8, 10)}/{c.data.slice(5, 7)}</span>
                            <span className="text-xs text-tinta-3">{c.horario}</span>
                          </span>
                          <span className="text-sm leading-snug">
                            <span className="text-xs text-tinta-3">{c.dia_semana} · {NOMES_REDE[c.rede]}</span>
                            <span className="block text-tinta">{p?.gancho}</span>
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
      <div className="border-t border-tinta/10">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h3 className={TITULO_SECAO}>Posts prontos</h3>
              <p className="mt-2 text-tinta-2">Troque a cor, troque o modelo, poste.</p>
            </div>
            <button
              type="button"
              onClick={baixarTudo}
              disabled={!!zip}
              className="inline-flex h-12 items-center rounded-full bg-pauta px-6 font-semibold text-white transition hover:bg-pauta-escura focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pauta disabled:opacity-70"
            >
              {zip ? `Montando o ZIP ${Math.round((zip.feito / Math.max(zip.total, 1)) * 100)}%` : "Baixar tudo em ZIP"}
            </button>
          </div>
          {aviso && (
            <p className="mt-4 rounded-2xl border border-pauta/25 bg-pauta/5 px-4 py-3 text-sm" role="alert">
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
    </section>
  );
}
