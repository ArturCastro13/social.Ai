"use client";

import { useEffect, useRef, useState } from "react";
import type { Personalizacao } from "@/lib/client/artes";
import { lerSemCapa, pedirCapa, precisaCapa, type EstadoCapa } from "@/lib/client/capas";
import type { Analise, PostGerado } from "@/lib/types";

/** Painel: pede a capa de cada post que precisa, uma vez, e guarda a URL na personalização do post. */
export function useCapasAutomaticas(
  analise: Analise,
  pers: Record<string, Personalizacao>,
  mudarPers: (id: string, p: Personalizacao) => void,
  pronto: boolean,
): Record<string, EstadoCapa> {
  const [estados, setEstados] = useState<Record<string, EstadoCapa>>({});
  const iniciados = useRef(new Set<string>());
  const persRef = useRef(pers);
  const mudarRef = useRef(mudarPers);
  useEffect(() => {
    persRef.current = pers;
    mudarRef.current = mudarPers;
  });
  useEffect(() => {
    if (!pronto) return;
    const recusadas = lerSemCapa(analise.id);
    for (const post of analise.posts) {
      if (iniciados.current.has(post.id) || recusadas.has(post.id) || !precisaCapa(analise, post, persRef.current[post.id]?.foto)) continue;
      iniciados.current.add(post.id);
      setEstados((e) => ({ ...e, [post.id]: "pintando" }));
      pedirCapa(analise, post)
        .then((url) => {
          mudarRef.current(post.id, { ...persRef.current[post.id], foto: url });
          setEstados((e) => ({ ...e, [post.id]: "pronta" }));
        })
        .catch(() => setEstados((e) => ({ ...e, [post.id]: "erro" })));
    }
  }, [analise, pronto]);
  return estados;
}

/** Tela ao vivo: pede a capa de cada prévia assim que ela chega, com a prévia borrada quando o servidor manda. */
export function useCapasAoVivo(analise: Analise, previas: PostGerado[]): Record<string, { estado: EstadoCapa; url?: string; parcial?: string }> {
  const [capas, setCapas] = useState<Record<string, { estado: EstadoCapa; url?: string; parcial?: string }>>({});
  const iniciados = useRef(new Set<string>());
  useEffect(() => {
    for (const post of previas) {
      if (iniciados.current.has(post.id) || !precisaCapa(analise, post)) continue;
      iniciados.current.add(post.id);
      setCapas((c) => ({ ...c, [post.id]: { estado: "pintando" } }));
      pedirCapa(analise, post, (parcial) => setCapas((c) => ({ ...c, [post.id]: { ...c[post.id], estado: "pintando", parcial } })))
        .then((url) => setCapas((c) => ({ ...c, [post.id]: { estado: "pronta", url } })))
        .catch(() => setCapas((c) => ({ ...c, [post.id]: { estado: "erro" } })));
    }
  }, [analise, previas]);
  return capas;
}
