"use client";

/* eslint-disable @next/next/no-img-element */
import { useMemo } from "react";
import { urlArte } from "@/lib/client/artes";
import { analiseProvisoria } from "@/lib/client/capas";
import type { BrandProfile } from "@/lib/types";
import type { EstadoAoVivo } from "./useGeracao";
import { useCapasAoVivo } from "./useCapas";

/** A geração ao vivo: a pesquisa no topo e um cartão por post (na fila, escrevendo, pintando a capa, pronto). */
export function AoVivo({
  estado,
  quantidade,
  totalVirais,
  brand,
  nicho,
  publico,
}: {
  estado: EstadoAoVivo;
  quantidade: number;
  totalVirais: number;
  brand: BrandProfile;
  nicho?: string;
  publico?: string;
}) {
  const prontos = Object.values(estado.posts);
  const analiseId = prontos[0]?.post.id.replace(/-p\d+$/, "") ?? "ao-vivo";
  const provisoria = useMemo(
    () => analiseProvisoria({ id: analiseId, brand, posts: prontos.map((p) => p.post), nicho, publico }),
    [analiseId, brand, prontos, nicho, publico],
  );
  const capas = useCapasAoVivo(
    provisoria,
    prontos.filter((p) => p.previa).map((p) => p.post),
  );
  const escrevendo = estado.escrevendo;
  const r = estado.resumo;
  const linha =
    prontos.length >= quantidade
      ? "Posts prontos. Fechando o calendário e os roteiros."
      : `Escrevendo o post ${Math.min(quantidade, (escrevendo?.indice ?? prontos.length) + 1)} de ${quantidade}. As capas chegam em seguida.`;

  return (
    <div className="animate-subir rounded-3xl border border-tinta/10 bg-white p-5 shadow-[0_30px_60px_-40px_rgba(22,19,15,.35)] sm:p-7" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-4">
        <p className="min-w-0 truncate font-display text-lg font-semibold tracking-[-0.01em]">Criando os posts da {brand.nome}</p>
        <span className="flex shrink-0 items-center gap-2 rounded-full bg-papel px-3 py-1 text-xs font-medium text-tinta-2">
          <span className="h-2 w-2 animate-pisca rounded-full bg-pauta" /> ao vivo
        </span>
      </div>
      <p className="mt-1 text-sm text-tinta-2">{linha}</p>

      <ul className="mt-4 flex flex-wrap gap-2 text-xs text-tinta-2">
        <li className="rounded-full border border-tinta/10 bg-papel px-3 py-1">
          Lidos <strong className="text-tinta">{totalVirais} virais</strong> da biblioteca
          {r?.virais_ao_vivo ? (
            <>
              {" "}
              e <strong className="text-tinta">{r.virais_ao_vivo} ao vivo</strong> do seu nicho
            </>
          ) : null}
        </li>
        {r?.concorrentes.length ? (
          <li className="rounded-full border border-tinta/10 bg-papel px-3 py-1">
            <strong className="text-tinta">{r.concorrentes.length} concorrentes</strong>: {r.concorrentes.join(", ")}
          </li>
        ) : null}
        {r?.em_alta.length ? (
          <li className="rounded-full border border-tinta/10 bg-papel px-3 py-1">
            Em alta: <strong className="text-tinta">{r.em_alta.slice(0, 2).join(", ")}</strong>
          </li>
        ) : null}
      </ul>

      <ol className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: quantidade }).map((_, i) => {
          const pronto = estado.posts[i];
          if (pronto) {
            const capa = capas[pronto.post.id];
            return (
              <li key={i} className="overflow-hidden rounded-2xl border border-tinta/10 bg-papel">
                <div className="relative aspect-[4/5]">
                  <img
                    src={urlArte(provisoria, pronto.post, { slide: 0, tamanho: "feed", foto: capa?.url ?? null })}
                    alt={`Post ${i + 1}: ${pronto.post.gancho}`}
                    className="h-full w-full object-cover"
                  />
                  {capa?.estado === "pintando" && (
                    <div className="absolute inset-x-0 top-0 flex h-1/2 items-center justify-center overflow-hidden">
                      {capa.parcial ? (
                        <img src={capa.parcial} alt="" className="absolute inset-0 h-full w-full scale-105 object-cover blur-sm" />
                      ) : (
                        <div className="absolute inset-0 animate-pulse bg-papel-3/70" />
                      )}
                      <span className="relative rounded-full bg-tinta/80 px-3 py-1 text-[11px] font-semibold text-papel">Pintando a capa…</span>
                    </div>
                  )}
                </div>
                <p className="px-3 py-2 text-[11px] font-semibold text-aprovado">✓ Post {i + 1} pronto</p>
              </li>
            );
          }
          if (escrevendo?.indice === i) {
            return (
              <li key={i} className="flex aspect-[4/5] flex-col justify-end rounded-2xl border border-pauta/30 bg-papel p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-pauta">Escrevendo…</p>
                {escrevendo.gancho ? <p className="mt-1 font-display text-base font-semibold leading-tight text-tinta">{escrevendo.gancho}</p> : null}
                <span className="mt-1 inline-block h-4 w-0.5 animate-pisca bg-pauta" aria-hidden="true" />
              </li>
            );
          }
          return (
            <li key={i} className="flex aspect-[4/5] flex-col justify-end gap-2 rounded-2xl bg-papel p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-tinta-3">Na fila</p>
              <span className="h-2.5 w-4/5 rounded bg-papel-3" />
              <span className="h-2.5 w-3/5 rounded bg-papel-3" />
            </li>
          );
        })}
      </ol>
    </div>
  );
}
