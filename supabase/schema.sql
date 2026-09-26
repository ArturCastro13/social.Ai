-- social.Ai: rode este arquivo inteiro no SQL Editor do Supabase (uma vez).
-- O app usa a service role no servidor; RLS fica ligado e sem políticas públicas.

create table if not exists virais (
  id text primary key,
  nicho text not null check (nicho in ('saas-b2b','fintech','healthtech','edtech','ecommerce-dtc')),
  rede text not null check (rede in ('instagram','linkedin','x','facebook')),
  formato text not null,
  tipo_gancho text not null,
  texto_gancho text not null,
  estrutura jsonb not null default '[]',
  padrao_visual jsonb not null default '{}',
  por_que_funciona text not null default '',
  autor_ou_marca text,
  link_fonte text,
  -- Métricas só com dado verificado. Null significa "a preencher pelo time".
  metricas jsonb not null default '{"curtidas":null,"comentarios":null,"compartilhamentos":null,"visualizacoes":null,"observacao":"a preencher pelo time"}',
  status text not null default 'a verificar' check (status in ('verificado','a verificar')),
  notas_curadoria text,
  atualizado_em timestamptz not null default now()
);
create index if not exists virais_nicho_idx on virais (nicho);

-- Cache de análises: a mesma URL não paga duas chamadas de IA.
create table if not exists analises (
  id text primary key,
  url_chave text not null,
  n_posts int not null,
  dados jsonb not null,
  email text,
  criado_em timestamptz not null default now()
);
create index if not exists analises_url_idx on analises (url_chave, n_posts, criado_em desc);

-- Limite de uso por e-mail na demo.
create table if not exists uso (
  id bigserial primary key,
  email text not null,
  url text,
  criado_em timestamptz not null default now()
);
create index if not exists uso_email_idx on uso (email);

-- E-mails capturados antes do download.
create table if not exists leads (
  id bigserial primary key,
  email text not null,
  nome text,
  empresa text,
  url text,
  analise_id text,
  plano text,
  origem text default 'download',
  criado_em timestamptz not null default now()
);

-- Formulário curto de validação de dor, oferecido depois do resultado.
create table if not exists validacao (
  id bigserial primary key,
  email text,
  analise_id text,
  respostas jsonb not null,
  criado_em timestamptz not null default now()
);

-- Entrevistas com founders feitas pelo time no hackathon.
create table if not exists entrevistas (
  id text primary key,
  entrevistador text,
  founder text,
  startup text,
  quem_cuida text,
  horas_semana numeric,
  ja_tentou text,
  pagaria_mes numeric,
  ultima_vez_sem_postar text,
  dor_nota int,
  quer_testar boolean default false,
  contato text,
  notas text,
  criado_em timestamptz not null default now()
);

-- Ideias aprovadas ou puladas pelo founder. Alimentam o prompt das próximas análises da mesma marca.
create table if not exists feedback (
  id bigserial primary key,
  analise_id text not null,
  post_id text not null,
  dominio text not null,
  nicho text not null,
  formato text not null,
  template text not null,
  padrao text not null,
  rede text not null,
  decisao text not null check (decisao in ('aprovado', 'pulado')),
  criado_em timestamptz not null default now()
);
create index if not exists feedback_dominio on feedback (dominio);

-- Resultados de posts publicados, informados pelo founder no painel de métricas.
create table if not exists metricas (
  id bigserial primary key,
  analise_id text not null,
  post_id text not null,
  dominio text not null,
  formato text not null,
  curtidas int,
  comentarios int,
  salvamentos int,
  alcance int,
  compartilhamentos int,
  criado_em timestamptz not null default now()
);
alter table metricas add column if not exists compartilhamentos int;
create index if not exists metricas_dominio on metricas (dominio);

-- Artes renderizadas podem ir para o Storage (bucket público "posts"), opcional.
insert into storage.buckets (id, name, public) values ('posts', 'posts', true)
on conflict (id) do nothing;

alter table virais enable row level security;
alter table analises enable row level security;
alter table uso enable row level security;
alter table leads enable row level security;
alter table validacao enable row level security;
alter table entrevistas enable row level security;
alter table feedback enable row level security;
alter table metricas enable row level security;
