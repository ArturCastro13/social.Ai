import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Decisao, ResultadoPost } from "@/lib/feedback";
import type { Analise, ViralItem } from "@/lib/types";

export interface Lead {
  email: string;
  nome?: string | null;
  empresa?: string | null;
  url?: string | null;
  analise_id?: string | null;
  plano?: string | null;
  origem?: string;
}

/** Lead como volta do banco: com a data de cadastro. */
export type LeadSalvo = Lead & { criado_em: string };

/** Teto de leitura de leads. Folga grande para a lista de espera; paginar se passar disso. */
const MAX_LEADS = 5000;

export interface RespostaValidacao {
  email?: string | null;
  analise_id?: string | null;
  respostas: Record<string, string | number | boolean | null>;
}

export interface Entrevista {
  id: string;
  entrevistador?: string | null;
  founder?: string | null;
  startup?: string | null;
  quem_cuida?: string | null;
  horas_semana?: number | null;
  ja_tentou?: string | null;
  pagaria_mes?: number | null;
  ultima_vez_sem_postar?: string | null;
  dor_nota?: number | null;
  quer_testar?: boolean;
  contato?: string | null;
  notas?: string | null;
  criado_em?: string;
}

export interface Store {
  tipo: "supabase" | "local";
  buscarAnalise(id: string): Promise<Analise | null>;
  buscarCache(urlChave: string, nPosts: number, maxIdadeHoras?: number): Promise<Analise | null>;
  salvarAnalise(a: Analise, urlChave: string, email?: string | null, nPosts?: number): Promise<void>;
  /**
   * Pesquisa de mercado já paga (concorrentes e em alta), guardada na mesma tabela do cache de análises com
   * url_chave "pesquisa:<chave>" e n_posts 0. Reusar por 7 dias evita pagar a busca na web de novo.
   */
  buscarPesquisa(chave: string, maxIdadeHoras?: number): Promise<unknown | null>;
  salvarPesquisa(chave: string, dados: unknown): Promise<void>;
  contarUso(email: string): Promise<number>;
  registrarUso(email: string, url: string): Promise<void>;
  salvarLead(l: Lead): Promise<void>;
  /** Leads mais recentes primeiro. Com origem, só os daquela origem. */
  listarLeads(origem?: string): Promise<LeadSalvo[]>;
  salvarValidacao(r: RespostaValidacao): Promise<void>;
  listarValidacoes(): Promise<(RespostaValidacao & { criado_em: string })[]>;
  listarEntrevistas(): Promise<Entrevista[]>;
  salvarEntrevista(e: Entrevista): Promise<void>;
  removerEntrevista(id: string): Promise<void>;
  listarVirais(): Promise<ViralItem[]>;
  salvarDecisao(d: Decisao): Promise<void>;
  listarDecisoes(dominio: string): Promise<Decisao[]>;
  salvarResultado(r: ResultadoPost): Promise<void>;
  listarResultados(dominio: string): Promise<ResultadoPost[]>;
  salvarViral(v: ViralItem): Promise<{ destino: string }>;
}

const PREFIXO_PESQUISA = "pesquisa:";
/** Id curto e estável da pesquisa guardada. O prefixo nunca aparece num id de análise (base64url sem ":"). */
const idPesquisa = (chave: string) => `${PREFIXO_PESQUISA}${createHash("sha256").update(chave).digest("base64url").slice(0, 16)}`;

// ---------------- Supabase ----------------

function supabaseStore(client: SupabaseClient): Store {
  const ok = <T>(r: { data: T; error: { message: string } | null }) => {
    if (r.error) throw new Error(r.error.message);
    return r.data;
  };
  return {
    tipo: "supabase",
    async buscarAnalise(id) {
      if (id.startsWith(PREFIXO_PESQUISA)) return null;
      const r = await client.from("analises").select("dados").eq("id", id).maybeSingle();
      return (ok(r)?.dados as Analise) ?? null;
    },
    async buscarCache(urlChave, nPosts, maxIdadeHoras = 24 * 7) {
      const desde = new Date(Date.now() - maxIdadeHoras * 3600e3).toISOString();
      const r = await client
        .from("analises")
        .select("dados")
        .eq("url_chave", urlChave)
        .eq("n_posts", nPosts)
        .gte("criado_em", desde)
        .order("criado_em", { ascending: false })
        .limit(1);
      const row = ok(r)?.[0];
      return row ? (row.dados as Analise) : null;
    },
    async salvarAnalise(a, urlChave, email, nPosts) {
      ok(await client.from("analises").upsert({ id: a.id, url_chave: urlChave, n_posts: nPosts ?? a.posts.length, dados: a, email: email ?? null }));
    },
    async buscarPesquisa(chave, maxIdadeHoras = 24 * 7) {
      const desde = new Date(Date.now() - maxIdadeHoras * 3600e3).toISOString();
      const r = await client
        .from("analises")
        .select("dados")
        .eq("url_chave", `${PREFIXO_PESQUISA}${chave}`)
        .eq("n_posts", 0)
        .gte("criado_em", desde)
        .order("criado_em", { ascending: false })
        .limit(1);
      return ok(r)?.[0]?.dados ?? null;
    },
    async salvarPesquisa(chave, dados) {
      // criado_em explícito: o upsert de uma pesquisa refeita renova a validade.
      ok(
        await client
          .from("analises")
          .upsert({ id: idPesquisa(chave), url_chave: `${PREFIXO_PESQUISA}${chave}`, n_posts: 0, dados, email: null, criado_em: new Date().toISOString() }),
      );
    },
    async contarUso(email) {
      const r = await client.from("uso").select("id", { count: "exact", head: true }).eq("email", email.toLowerCase());
      if (r.error) throw new Error(r.error.message);
      return r.count ?? 0;
    },
    async registrarUso(email, url) {
      ok(await client.from("uso").insert({ email: email.toLowerCase(), url }));
    },
    async salvarLead(l) {
      ok(await client.from("leads").insert({ ...l, email: l.email.toLowerCase() }));
    },
    async listarLeads(origem) {
      let q = client.from("leads").select("email, nome, empresa, url, analise_id, plano, origem, criado_em");
      if (origem) q = q.eq("origem", origem);
      return (ok(await q.order("criado_em", { ascending: false }).limit(MAX_LEADS)) ?? []) as LeadSalvo[];
    },
    async salvarValidacao(r) {
      ok(await client.from("validacao").insert(r));
    },
    async listarValidacoes() {
      return ok(await client.from("validacao").select("*").order("criado_em", { ascending: false }).limit(500)) ?? [];
    },
    async listarEntrevistas() {
      return ok(await client.from("entrevistas").select("*").order("criado_em", { ascending: false }).limit(500)) ?? [];
    },
    async salvarEntrevista(e) {
      ok(await client.from("entrevistas").upsert(e));
    },
    async removerEntrevista(id) {
      ok(await client.from("entrevistas").delete().eq("id", id));
    },
    async listarVirais() {
      return (ok(await client.from("virais").select("*").limit(2000)) ?? []) as ViralItem[];
    },
    async salvarDecisao(d) {
      ok(await client.from("feedback").insert(d));
    },
    async listarDecisoes(dominio) {
      // As 2000 mais recentes, devolvidas da mais antiga para a mais nova (a última de cada post prevalece).
      const r = ok(await client.from("feedback").select("*").eq("dominio", dominio).order("criado_em", { ascending: false }).limit(2000));
      return ((r ?? []) as Decisao[]).reverse();
    },
    async salvarResultado(r) {
      const res = await client.from("metricas").insert(r);
      // Banco sem a coluna compartilhamentos (migração ainda não rodada): salva o resto.
      if (res.error && /compartilhamentos/.test(res.error.message)) {
        const { compartilhamentos: _, ...semCompart } = r;
        void _;
        ok(await client.from("metricas").insert(semCompart));
      } else ok(res);
    },
    async listarResultados(dominio) {
      // As 2000 mais recentes, devolvidas da mais antiga para a mais nova (a última de cada post prevalece).
      const r = ok(await client.from("metricas").select("*").eq("dominio", dominio).order("criado_em", { ascending: false }).limit(2000));
      return ((r ?? []) as ResultadoPost[]).reverse();
    },
    async salvarViral(v) {
      ok(await client.from("virais").upsert({ ...v, atualizado_em: new Date().toISOString() }));
      return { destino: "supabase" };
    },
  };
}

// ---------------- Arquivo local ----------------
// Sem Supabase, salva em .data/ (ou /tmp na Vercel, que é efêmero). Serve para dev e para a demo.

function localStore(): Store {
  const naVercel = !!process.env.VERCEL;
  const dir = naVercel ? path.join(os.tmpdir(), "social-ai") : path.join(process.cwd(), ".data");
  const memoria = new Map<string, unknown[]>();

  async function ler<T>(nome: string): Promise<T[]> {
    try {
      const txt = await fs.readFile(path.join(dir, `${nome}.json`), "utf8");
      return JSON.parse(txt) as T[];
    } catch {
      return (memoria.get(nome) as T[]) ?? [];
    }
  }
  async function gravar<T>(nome: string, dados: T[]) {
    memoria.set(nome, dados);
    try {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, `${nome}.json`), JSON.stringify(dados, null, 2));
    } catch {
      /* sistema de arquivos só leitura: fica em memória */
    }
  }
  const agora = () => new Date().toISOString();
  type Registro = { id: string; url_chave: string; n_posts: number; dados: Analise; email: string | null; criado_em: string };

  const arquivoVirais = (nicho: string) => path.join(process.cwd(), "data", "virais", nicho, "itens.json");

  return {
    tipo: "local",
    async buscarAnalise(id) {
      if (id.startsWith(PREFIXO_PESQUISA)) return null;
      return (await ler<Registro>("analises")).find((r) => r.id === id)?.dados ?? null;
    },
    async buscarCache(urlChave, nPosts, maxIdadeHoras = 24 * 7) {
      const limite = Date.now() - maxIdadeHoras * 3600e3;
      const r = (await ler<Registro>("analises"))
        .filter((x) => x.url_chave === urlChave && x.n_posts === nPosts && Date.parse(x.criado_em) >= limite)
        .sort((a, b) => b.criado_em.localeCompare(a.criado_em))[0];
      return r?.dados ?? null;
    },
    async salvarAnalise(a, urlChave, email, nPosts) {
      const todos = (await ler<Registro>("analises")).filter((r) => r.id !== a.id);
      todos.push({ id: a.id, url_chave: urlChave, n_posts: nPosts ?? a.posts.length, dados: a, email: email ?? null, criado_em: agora() });
      await gravar("analises", todos.slice(-200));
    },
    async buscarPesquisa(chave, maxIdadeHoras = 24 * 7) {
      const limite = Date.now() - maxIdadeHoras * 3600e3;
      const url = `${PREFIXO_PESQUISA}${chave}`;
      const r = (await ler<{ url_chave: string; n_posts: number; dados: unknown; criado_em: string }>("analises"))
        .filter((x) => x.url_chave === url && x.n_posts === 0 && Date.parse(x.criado_em) >= limite)
        .sort((a, b) => b.criado_em.localeCompare(a.criado_em))[0];
      return r?.dados ?? null;
    },
    async salvarPesquisa(chave, dados) {
      const id = idPesquisa(chave);
      const todos = (await ler<{ id: string }>("analises")).filter((r) => r.id !== id);
      todos.push({ id, url_chave: `${PREFIXO_PESQUISA}${chave}`, n_posts: 0, dados, email: null, criado_em: agora() } as { id: string });
      await gravar("analises", todos.slice(-200));
    },
    async contarUso(email) {
      return (await ler<{ email: string }>("uso")).filter((u) => u.email === email.toLowerCase()).length;
    },
    async registrarUso(email, url) {
      const todos = await ler<{ email: string; url: string; criado_em: string }>("uso");
      todos.push({ email: email.toLowerCase(), url, criado_em: agora() });
      await gravar("uso", todos);
    },
    async salvarLead(l) {
      const todos = await ler<Lead & { criado_em: string }>("leads");
      todos.push({ ...l, email: l.email.toLowerCase(), criado_em: agora() });
      await gravar("leads", todos);
    },
    async listarLeads(origem) {
      return (await ler<LeadSalvo>("leads"))
        .filter((l) => !origem || l.origem === origem)
        .sort((a, b) => (b.criado_em ?? "").localeCompare(a.criado_em ?? ""))
        .slice(0, MAX_LEADS);
    },
    async salvarValidacao(r) {
      const todos = await ler<RespostaValidacao & { criado_em: string }>("validacao");
      todos.push({ ...r, criado_em: agora() });
      await gravar("validacao", todos);
    },
    async listarValidacoes() {
      return (await ler<RespostaValidacao & { criado_em: string }>("validacao")).reverse();
    },
    async listarEntrevistas() {
      return (await ler<Entrevista>("entrevistas")).sort((a, b) => (b.criado_em ?? "").localeCompare(a.criado_em ?? ""));
    },
    async salvarEntrevista(e) {
      const todos = (await ler<Entrevista>("entrevistas")).filter((x) => x.id !== e.id);
      todos.push({ ...e, criado_em: e.criado_em ?? agora() });
      await gravar("entrevistas", todos);
    },
    async removerEntrevista(id) {
      await gravar("entrevistas", (await ler<Entrevista>("entrevistas")).filter((x) => x.id !== id));
    },
    async salvarDecisao(d) {
      const todos = await ler<Decisao & { criado_em: string }>("feedback");
      todos.push({ ...d, criado_em: agora() });
      await gravar("feedback", todos.slice(-5000));
    },
    async listarDecisoes(dominio) {
      return (await ler<Decisao>("feedback")).filter((d) => d.dominio === dominio);
    },
    async salvarResultado(r) {
      const todos = await ler<ResultadoPost & { criado_em: string }>("metricas");
      todos.push({ ...r, criado_em: agora() });
      await gravar("metricas", todos.slice(-5000));
    },
    async listarResultados(dominio) {
      return (await ler<ResultadoPost>("metricas")).filter((r) => r.dominio === dominio);
    },
    async listarVirais() {
      // Em dev, lê os arquivos do repositório de novo para refletir o que o /admin acabou de salvar.
      if (naVercel) return ler<ViralItem>("virais");
      const nichos = ["saas-b2b", "fintech", "healthtech", "edtech", "ecommerce-dtc"];
      const listas = await Promise.all(
        nichos.map(async (n) => {
          try {
            return JSON.parse(await fs.readFile(arquivoVirais(n), "utf8")) as ViralItem[];
          } catch {
            return [];
          }
        }),
      );
      return listas.flat();
    },
    async salvarViral(v) {
      if (!naVercel) {
        // Grava direto no espelho versionado: o time commita e todo mundo recebe.
        const arq = arquivoVirais(v.nicho);
        let lista: ViralItem[] = [];
        try {
          lista = JSON.parse(await fs.readFile(arq, "utf8"));
        } catch {
          await fs.mkdir(path.dirname(arq), { recursive: true });
        }
        const i = lista.findIndex((x) => x.id === v.id);
        if (i >= 0) lista[i] = v;
        else lista.push(v);
        await fs.writeFile(arq, JSON.stringify(lista, null, 2) + "\n");
        return { destino: `data/virais/${v.nicho}/itens.json` };
      }
      const todos = (await ler<ViralItem>("virais")).filter((x) => x.id !== v.id);
      todos.push(v);
      await gravar("virais", todos);
      return { destino: "temporário (configure o Supabase para persistir)" };
    },
  };
}

function criarStore(): Store {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    return supabaseStore(createClient(url, key, { auth: { persistSession: false } }));
  }
  return localStore();
}

const g = globalThis as unknown as { __socialAiStore?: Store };
export const store: Store = g.__socialAiStore ?? (g.__socialAiStore = criarStore());
