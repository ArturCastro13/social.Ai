import Link from "next/link";
import type { ReactNode } from "react";

export function AdminShell({ titulo, subtitulo, children }: { titulo: string; subtitulo: string; children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-tinta/15 bg-papel/90 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="font-serif text-2xl italic leading-none">
            social<span className="text-pauta">.</span>Ai
          </Link>
          <nav className="retranca flex gap-4 text-tinta-3">
            <Link href="/admin/virais" className="hover:text-pauta">Virais</Link>
            <Link href="/admin/entrevistas" className="hover:text-pauta">Entrevistas</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-8">
        <p className="retranca text-pauta">Área interna do time</p>
        <h1 className="mt-2 font-serif text-4xl leading-tight sm:text-5xl">{titulo}</h1>
        <p className="mt-2 max-w-2xl text-tinta-2">{subtitulo}</p>
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}

export function SenhaAdmin({ senha, setSenha }: { senha: string; setSenha: (s: string) => void }) {
  return (
    <label className="retranca flex items-center gap-2 text-tinta-3">
      Senha
      <input
        type="password"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        placeholder="se houver"
        className="w-28 border-b border-tinta/30 bg-transparent px-1 py-1 font-mono text-sm normal-case tracking-normal text-tinta outline-none focus:border-pauta"
      />
    </label>
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
