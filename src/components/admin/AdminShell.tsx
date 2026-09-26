import Link from "next/link";
import type { ReactNode } from "react";
import { PortaoAdmin } from "./PortaoAdmin";

export function AdminShell({ titulo, subtitulo, children }: { titulo: string; subtitulo: string; children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-tinta/15 bg-papel/90 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="font-serif text-2xl italic leading-none">
            social<span className="text-pauta">.</span>Ai
          </Link>
          <nav className="retranca flex flex-wrap justify-end gap-x-4 gap-y-1 text-tinta-3">
            <Link href="/admin/virais" className="hover:text-pauta">Virais</Link>
            <Link href="/admin/entrevistas" className="hover:text-pauta">Entrevistas</Link>
            <Link href="/admin/lista-de-espera" className="hover:text-pauta">Lista de espera</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-8">
        <PortaoAdmin>
          <p className="retranca text-pauta">Área interna do time</p>
          <h1 className="mt-2 font-serif text-4xl leading-tight sm:text-5xl">{titulo}</h1>
          <p className="mt-2 max-w-2xl text-tinta-2">{subtitulo}</p>
          <div className="mt-8">{children}</div>
        </PortaoAdmin>
      </main>
    </div>
  );
}

/** Em produção sem Supabase, o que for salvo some a cada deploy. Deixa isso visível para o time. */
export function AvisoTemporario({ armazenamento }: { armazenamento: string }) {
  if (armazenamento !== "local") return null;
  return (
    <p className="mt-4 border border-pauta/40 bg-pauta/5 px-3 py-2 text-sm">
      Sem Supabase configurado: em produção, o que for salvo aqui é temporário e some a cada deploy. Localmente vai para os arquivos do
      repositório. Veja DEPLOY.md para ligar o Supabase.
    </p>
  );
}
