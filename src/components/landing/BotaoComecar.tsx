"use client";

/** Evento que o Estudio escuta para abrir o campo de URL e levar o foco até ele. */
export const EVENTO_COMECAR = "socialai:comecar";

export function BotaoComecar({ className }: { className: string }) {
  return (
    <a
      href="#topo"
      onClick={(e) => {
        e.preventDefault();
        window.dispatchEvent(new Event(EVENTO_COMECAR));
      }}
      className={className}
    >
      Começar agora
    </a>
  );
}
