import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { EntrevistasAdmin } from "./EntrevistasAdmin";

export const metadata: Metadata = { title: "Entrevistas | social.Ai", robots: { index: false } };

export default function Page() {
  return (
    <AdminShell
      titulo="Entrevistas com founders"
      subtitulo="Registre cada conversa na hora, pelo celular. Os números abaixo se atualizam sozinhos e são os que vão para o pitch. O roteiro está em validacao/ROTEIRO_ENTREVISTA.md."
    >
      <EntrevistasAdmin />
    </AdminShell>
  );
}
