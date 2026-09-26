"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// Ditado pelo navegador (Web Speech API). Um microfone só por tela: gravar num campo para o que estiver
// gravando em outro. O TypeScript não traz o construtor, então descrevemos só o que usamos.
interface Reconhecedor {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: SpeechRecognitionResultList }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}
type ConstrutorReconhecedor = new () => Reconhecedor;

function construtorDeVoz(): ConstrutorReconhecedor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: ConstrutorReconhecedor; webkitSpeechRecognition?: ConstrutorReconhecedor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
const semAssinatura = () => () => {};

export interface Ditado {
  /** O navegador sabe transcrever voz. */
  temVoz: boolean;
  /** Id do campo que está gravando agora, ou null. */
  gravando: string | null;
  /** Relógio da gravação atual, em "m:ss". */
  relogio: string;
  /** Aviso da última falha, com o campo em que aconteceu. */
  aviso: { id: string; texto: string } | null;
  /**
   * Começa a gravar no campo `id`. O texto já escrito (`base`) fica na frente e cada trecho ouvido
   * chega em `onTexto` com tudo junto, cortado em `max` caracteres.
   */
  gravar: (id: string, base: string, onTexto: (texto: string) => void, max: number) => void;
  parar: () => void;
}

export function useDitado(limiteSegundos = 60): Ditado {
  const temVoz = useSyncExternalStore(semAssinatura, () => !!construtorDeVoz(), () => false);
  const [gravando, setGravando] = useState<string | null>(null);
  const [segundos, setSegundos] = useState(0);
  const [aviso, setAviso] = useState<{ id: string; texto: string } | null>(null);
  const rec = useRef<Reconhecedor | null>(null);
  const querGravar = useRef(false);
  const inicio = useRef(0);

  function parar() {
    querGravar.current = false;
    rec.current?.stop();
    setGravando(null);
  }

  // Relógio da gravação: para sozinho no limite.
  useEffect(() => {
    if (!gravando) return;
    const t = setInterval(() => {
      const s = Math.floor((Date.now() - inicio.current) / 1000);
      setSegundos(s);
      if (s >= limiteSegundos) parar();
    }, 250);
    return () => clearInterval(t);
  }, [gravando, limiteSegundos]);

  useEffect(() => () => rec.current?.abort(), []);

  function gravar(id: string, baseBruta: string, onTexto: (texto: string) => void, max: number) {
    const Ctor = construtorDeVoz();
    if (!Ctor) return;
    if (rec.current) {
      querGravar.current = false;
      rec.current.abort();
    }
    setAviso(null);
    const base = baseBruta.trim();
    let finais = "";
    const r = new Ctor();
    r.lang = "pt-BR";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let parcial = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finais += res[0].transcript.trim() + " ";
        else parcial += res[0].transcript;
      }
      const texto = [base, (finais + parcial).trim()].filter(Boolean).join(base ? "\n" : "");
      onTexto(texto.slice(0, max));
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") setAviso({ id, texto: "O navegador não liberou o microfone. Dá para escrever no campo que funciona igual." });
      else if (e.error !== "no-speech" && e.error !== "aborted") setAviso({ id, texto: "A gravação parou. Você pode gravar de novo ou completar escrevendo." });
      if (e.error !== "no-speech") querGravar.current = false;
    };
    // O Chrome encerra sozinho depois de um silêncio; se ainda cabe tempo, volta a ouvir.
    r.onend = () => {
      if (rec.current !== r) return;
      if (querGravar.current && Date.now() - inicio.current < limiteSegundos * 1000) {
        try {
          r.start();
          return;
        } catch {
          /* já estava ouvindo */
        }
      }
      querGravar.current = false;
      setGravando(null);
    };
    rec.current = r;
    querGravar.current = true;
    inicio.current = Date.now();
    setSegundos(0);
    try {
      r.start();
      setGravando(id);
    } catch {
      setAviso({ id, texto: "Não deu para começar a gravar. Escreve no campo que funciona igual." });
    }
  }

  return { temVoz, gravando, relogio: `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")}`, aviso, gravar, parar };
}
