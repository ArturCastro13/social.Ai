"use client";

import type { BrandProfile } from "@/lib/types";

export interface Etapa {
  id: string;
  texto: string;
  estado: "pendente" | "andando" | "feito";
}

/** Tela de redação: mostra o que o sistema está fazendo, com os dados reais assim que chegam. */
export function Carregando({ etapas, brand, dominio }: { etapas: Etapa[]; brand: BrandProfile | null; dominio: string }) {
  return (
    <div className="prova animate-subir border-2 border-tinta bg-white p-5 shadow-[8px_8px_0_var(--color-tinta)] sm:p-8" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-4 border-b border-tinta/15 pb-4">
        <p className="retranca text-pauta">Na redação · {dominio}</p>
        <span className="flex items-center gap-2 retranca text-tinta-3">
          <span className="h-2 w-2 animate-pisca rounded-full bg-pauta" /> ao vivo
        </span>
      </div>

      <ol className="mt-5 space-y-3 font-mono text-sm sm:text-[0.95rem]">
        {etapas.map((e) => (
          <li key={e.id} className={`flex items-start gap-3 transition-opacity ${e.estado === "pendente" ? "opacity-30" : "opacity-100"}`}>
            <span className="mt-0.5 w-5 shrink-0 text-center">
              {e.estado === "feito" ? <span className="text-salvia">✓</span> : e.estado === "andando" ? <span className="inline-block animate-pisca text-pauta">▍</span> : "·"}
            </span>
            <span className={e.estado === "andando" ? "text-tinta" : "text-tinta-2"}>{e.texto}</span>
          </li>
        ))}
      </ol>

      {brand && (
        <div className="mt-6 grid animate-subir gap-4 border-t border-dashed border-tinta/25 pt-5 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="flex">
            {[brand.paleta.primaria, brand.paleta.secundaria, brand.paleta.destaque, brand.paleta.texto].map((c, i) => (
              <span
                key={c + i}
                title={c}
                className="h-14 w-14 border-2 border-white shadow-sm first:ml-0 -ml-3 rounded-full"
                style={{ background: c, animation: `subir .5s ${i * 0.12}s both` }}
              />
            ))}
          </div>
          <div className="text-sm leading-relaxed text-tinta-2">
            <p>
              <strong className="text-tinta">{brand.nome}</strong> · {brand.fontes.titulo}
              {brand.fontes.corpo !== brand.fontes.titulo ? ` e ${brand.fontes.corpo}` : ""}
              {brand.fontes.sugeridas ? " (sugeridas)" : ""}
            </p>
            {brand.headings.h1[0] && <p className="mt-1 line-clamp-2 font-serif text-lg italic text-tinta">“{brand.headings.h1[0]}”</p>}
          </div>
        </div>
      )}
    </div>
  );
}
