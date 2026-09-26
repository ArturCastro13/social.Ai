import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { ListaEsperaAdmin } from "./ListaEsperaAdmin";

export const metadata: Metadata = { title: "Lista de espera | social.Ai", robots: { index: false } };

export default function Page() {
  return (
    <AdminShell
      titulo="Lista de espera"
      subtitulo="Quem se inscreveu em /lista-de-espera. A lista se atualiza sozinha. Baixe o CSV para mandar e-mail ou abrir no Excel."
    >
      <ListaEsperaAdmin />
    </AdminShell>
  );
}
