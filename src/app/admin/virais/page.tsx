import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { ViraisAdmin } from "./ViraisAdmin";

export const metadata: Metadata = { title: "Base de virais | social.Ai", robots: { index: false } };

export default function Page() {
  return (
    <AdminShell
      titulo="Base de virais"
      subtitulo="Cada item aqui ensina o motor o que funciona num nicho. Verifique a fonte antes de marcar como verificado e nunca estime número: métrica sem dado fica vazia."
    >
      <ViraisAdmin />
    </AdminShell>
  );
}
