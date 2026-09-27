import type { Nicho } from "@/lib/types";

// Banco de conteúdo do motor local, por nicho e por tipo de negócio dentro do nicho.
// Cada tema traz a matéria-prima dos posts: dores, erros comuns, passos, opiniões e frases.
// Tudo aqui é conhecimento geral do mercado, sem fatos sobre nenhuma empresa específica:
// fato da marca (número, cliente, promessa) só entra pelo texto do site.
//
// Regras de escrita valem aqui também: sem travessão, sem jargão proibido, frases curtas.

export interface Tema {
  id: string;
  /** Detecta o tema pelo texto do site. null = tema padrão do nicho. */
  detectar: RegExp | null;
  nicho: Nicho;
  /** Categoria com artigo: "um sistema de gestão". */
  categoria: string;
  publico: string;
  /** Público curto, para usar depois de "para": "quem toca uma PME". */
  quem: string;
  assunto: string;
  /** Assunto com preposição: "na gestão da empresa". */
  assuntoEm: string;
  dor: string;
  /** Resultado desejado, minúsculo e com até 8 palavras (vira "Como ..."). */
  promessa: string;
  /** Completa "Por que ...?". */
  porque: string;
  /** Crença comum negada, até 9 palavras. */
  mito: string;
  crenca: [string, string];
  /** [título no infinitivo, explicação]. */
  erros: [string, string][];
  /** [título no imperativo, explicação]. */
  passos: [string, string][];
  /** Completa "... ? 5 sinais para conferir". */
  sinalDe: string;
  sinais: string[];
  antes: string;
  depois: string;
  /** Opiniões no tom de post do X, em minúsculas. */
  opinioes: string[];
  frases: string[];
  /** Relatos do founder: [frase em primeira pessoa, relato]. */
  bastidor: [string, string][];
  pilares: [string, string][];
  receita: string;
  tags: string[];
}

export const TEMAS: Tema[] = [
  {
    id: "gestao-erp",
    detectar: /(?<![\p{L}])(erp|sistema de gest[ãa]o|gest[ãa]o empresarial|controle financeiro empresarial)(?![\p{L}])/iu,
    nicho: "saas-b2b",
    categoria: "um sistema de gestão",
    publico:
      "Donos e gestores de pequenas e médias empresas que tocam vendas, estoque e financeiro em ferramentas separadas e fecham o mês no susto",
    quem: "quem toca uma PME",
    assunto: "gestão",
    assuntoEm: "na gestão da empresa",
    dor: "venda num sistema, estoque numa planilha e extrato no app do banco",
    promessa: "fechar o mês sem susto",
    porque: "o fim do mês ainda é um sufoco",
    mito: "Gestão organizada não é coisa de empresa grande",
    crenca: [
      "Todo mundo acha que organizar a gestão é coisa para quando a empresa crescer.",
      "Na prática, é a bagunça de hoje que impede a empresa de crescer.",
    ],
    erros: [
      ["Misturar conta pessoal e da empresa", "Sem separar, você nunca sabe se a empresa dá lucro ou se é o seu dinheiro que segura as contas."],
      ["Conciliar o banco só no fim do mês", "Trinta dias de lançamentos acumulados viram um dia inteiro de conferência e erro."],
      ["Controlar estoque de cabeça", "Funciona até o dia em que você vende o que não tem."],
      ["Emitir nota em um lugar e lançar em outro", "Cada digitação repetida é uma chance de errar no imposto."],
      ["Olhar só o saldo", "Saldo alto hoje não diz se o caixa fecha daqui a dois meses."],
    ],
    passos: [
      ["Separe as contas", "Conta da empresa só para a empresa. É o primeiro passo para enxergar lucro de verdade."],
      ["Concilie toda semana", "Quinze minutos por semana evitam o dia inteiro de conferência no fim do mês."],
      ["Ligue venda, estoque e nota", "Quando a venda baixa o estoque e gera a nota no mesmo lugar, some boa parte do retrabalho."],
      ["Olhe o fluxo de caixa", "Projete entradas e saídas das próximas semanas antes de assumir um custo novo."],
    ],
    sinalDe: "sua gestão ainda depende de planilha",
    sinais: [
      "Saldo real exige abrir três telas",
      "O fechamento leva mais de um dia",
      "Estoque do sistema não bate com a prateleira",
      "A nota fiscal é digitada duas vezes",
      "Só o dono sabe onde está tudo",
    ],
    antes: "Venda no sistema, estoque na planilha, extrato no banco e o mês fechado no susto.",
    depois: "Venda, estoque e financeiro no mesmo lugar, com o número do dia na tela.",
    opinioes: [
      "planilha não é sistema de gestão. é o lugar onde a informação vai envelhecer.",
      "se só o dono sabe quanto a empresa tem em caixa, a empresa não tem gestão. tem memória.",
      "empresa pequena não precisa de menos controle que empresa grande. precisa de controle que dê menos trabalho.",
    ],
    frases: [
      "Gestão boa é a que você consegue olhar numa terça-feira qualquer, não só no fechamento.",
      "O problema quase nunca é falta de dado. É dado espalhado em lugar demais.",
    ],
    bastidor: [
      [
        "O que a gente mais ouve de quem chega até nós",
        "Que o fim do mês virou um dia inteiro de conferência. É por causa dessa conversa que cada tela nova precisa tirar uma etapa, não colocar mais uma.",
      ],
      [
        "A pergunta que a gente faz antes de lançar uma função",
        "Isso tira trabalho de quem usa ou só fica bonito na demonstração? Se for a segunda opção, não entra.",
      ],
    ],
    pilares: [
      ["Rotina financeira sem susto", "Conteúdo prático sobre caixa, conciliação e fechamento, do jeito que o dono de PME vive."],
      ["Operação conectada", "Mostrar como venda, estoque e nota ligados economizam horas, com situações do dia a dia."],
      ["Bastidor e opinião", "O que o time aprende com quem usa o sistema e o que pensa sobre gestão de pequena empresa."],
    ],
    receita: "assinatura mensal por plano, o modelo mais comum entre sistemas de gestão",
    tags: ["gestao", "empreendedorismo", "pme", "financeiro"],
  },
  {
    id: "conta-pj",
    detectar: /(?<![\p{L}])(conta (digital )?pj|conta digital|cart[ãa]o pj|conta para empresas?)(?![\p{L}])/iu,
    nicho: "fintech",
    categoria: "uma conta digital PJ",
    publico:
      "Donos de pequenas empresas e MEIs que pagam tarifa no banco tradicional e cuidam do financeiro pelo celular, entre um cliente e outro",
    quem: "quem tem CNPJ",
    assunto: "dinheiro da empresa",
    assuntoEm: "no financeiro do CNPJ",
    dor: "tarifa de manutenção, cobrança feita à mão e boleto que ninguém acompanha",
    promessa: "cobrar e receber sem perder tempo no banco",
    porque: "cobrar cliente ainda dá tanto trabalho",
    mito: "Tarifa bancária não é custo obrigatório",
    crenca: [
      "Todo mundo acha que tarifa bancária é o preço de ter uma conta PJ.",
      "Na prática, é um custo que muita empresa paga só porque nunca parou para comparar.",
    ],
    erros: [
      ["Pagar conta pessoal com a conta da empresa", "Fica impossível saber o lucro real e ainda complica o imposto."],
      ["Cobrar cliente por mensagem e esperar", "Sem boleto ou cobrança automática, o atraso vira rotina e o caixa sente."],
      ["Não saber quanto paga de tarifa", "Some as tarifas dos últimos meses. Esse número costuma assustar."],
      ["Deixar o controle para o fim do mês", "Entrada e saída olhadas toda semana evitam surpresa no caixa."],
    ],
    passos: [
      ["Separe PF e PJ", "Conta da empresa paga só despesa da empresa. O seu salário sai como pró-labore."],
      ["Automatize as cobranças", "Cobrança recorrente e lembrete automático reduzem o tempo correndo atrás de pagamento."],
      ["Revise as tarifas", "Liste o que você paga por mês para movimentar dinheiro e compare com outras opções."],
      ["Olhe o caixa toda semana", "Dez minutos na segunda mostram o que entra e o que sai até o fim do mês."],
    ],
    sinalDe: "sua conta PJ está custando caro",
    sinais: [
      "Você não sabe quanto pagou de tarifa",
      "Cobra cliente por mensagem e espera",
      "Dinheiro da empresa paga contas da casa",
      "O extrato só abre quando algo dá errado",
      "Emitir boleto exige o computador",
    ],
    antes: "Tarifa para tudo, boleto feito à mão e cobrança por mensagem.",
    depois: "Cobrança automática, Pix e boleto no app e o saldo da semana na tela.",
    opinioes: [
      "pagar tarifa para movimentar o próprio dinheiro ainda é normal para muita empresa. não deveria ser.",
      "o financeiro de muita pequena empresa é o dono, às 23h, com o app do banco aberto.",
      "conta PJ boa é a que você esquece que existe até precisar dela. e aí ela funciona.",
    ],
    frases: [
      "Quem empreende já tem problema demais. A conta da empresa não precisa ser mais um.",
      "Cada tarifa parece pequena. Somadas no ano, viram um custo que ninguém colocou no orçamento.",
    ],
    bastidor: [
      [
        "Uma pergunta que guia o nosso produto",
        "Se fosse o meu CNPJ, eu aceitaria pagar por isso? Quando a resposta é não, a gente repensa.",
      ],
      [
        "Por que falamos tanto de quem empreende sozinho",
        "Porque é quem cuida de venda, entrega e financeiro ao mesmo tempo. Todo minuto que o banco toma sai do negócio.",
      ],
    ],
    pilares: [
      ["Dinheiro do CNPJ sem letra miúda", "Traduzir tarifa, cobrança, Pix e boleto em linguagem de quem empreende."],
      ["Rotina financeira da pequena empresa", "Hábitos simples para separar PF e PJ, cobrar em dia e enxergar o caixa."],
      ["Gente que empreende", "Histórias e bastidores de quem toca o negócio, sempre com autorização."],
    ],
    receita: "serviços financeiros como cobrança, cartão e crédito, e não tarifa de manutenção; vale confirmar com o time",
    tags: ["contapj", "empreendedorismo", "financas", "mei"],
  },
  {
    id: "marketing-vendas",
    detectar: /(?<![\p{L}])(automa[çc][ãa]o de marketing|marketing digital|crm|leads?|funil de vendas)(?![\p{L}])/iu,
    nicho: "saas-b2b",
    categoria: "um software de marketing e vendas",
    publico:
      "Times de marketing e vendas de pequenas e médias empresas que geram contatos, mas perdem venda entre o formulário e o fechamento",
    quem: "times de marketing e vendas",
    assunto: "marketing e vendas",
    assuntoEm: "no funil de vendas",
    dor: "lead chegando pelo formulário e ninguém respondendo a tempo",
    promessa: "responder o lead enquanto ele está interessado",
    porque: "o lead esfria antes da venda",
    mito: "Seu problema não é falta de lead",
    crenca: [
      "Todo mundo acha que o problema é gerar mais leads.",
      "Na prática, muita empresa perde venda com os leads que já tem.",
    ],
    erros: [
      ["Mandar todo lead para o vendedor", "Quem só baixou um material ainda não quer falar com vendas. Qualifique antes."],
      ["Demorar para responder", "O contato esfria rápido. Resposta no mesmo dia muda a conversa."],
      ["Medir marketing e vendas com números diferentes", "Se cada time mede de um jeito, a reunião vira discussão sobre planilha."],
      ["Mandar o mesmo e-mail para todo mundo", "Quem visitou a página de preço não precisa do mesmo e-mail de quem leu um post."],
    ],
    passos: [
      ["Defina o que é um lead pronto", "Marketing e vendas combinam juntos o que precisa acontecer antes de passar o contato."],
      ["Automatize o primeiro contato", "Um e-mail certo logo depois do cadastro segura o interesse enquanto o vendedor não chega."],
      ["Registre tudo no CRM", "Conversa fora do CRM é conversa que some quando o vendedor sai."],
      ["Olhe o funil toda semana", "Onde os contatos param? É ali que está a próxima melhoria."],
    ],
    sinalDe: "seu funil está perdendo venda",
    sinais: [
      "Vendas reclama da qualidade dos leads",
      "Ninguém sabe de onde veio a venda",
      "O follow-up depende da memória",
      "Cada time usa uma planilha",
      "Lead do formulário espera dias",
    ],
    antes: "Lead no formulário, planilha no drive e o vendedor ligando dias depois.",
    depois: "Lead qualificado, histórico no CRM e contato no mesmo dia.",
    opinioes: [
      "o problema de muita empresa não é gerar lead. é o que acontece com ele nas 48 horas seguintes.",
      "se o vendedor não confia no lead que o marketing manda, vocês não têm um funil. têm dois times.",
      "automação boa não parece robô. parece alguém que lembrou de você na hora certa.",
    ],
    frases: [
      "Venda perdida quase nunca some no fechamento. Some no primeiro contato que demorou.",
      "Marketing e vendas que olham o mesmo número param de discutir e começam a vender.",
    ],
    bastidor: [
      [
        "O que a gente mais ouve de times de vendas",
        "Que o lead chegou frio. Quase sempre ele chegou interessado e esfriou esperando. É nesse intervalo que a gente mais pensa.",
      ],
      [
        "Uma regra que a gente tenta seguir",
        "Se não dá para explicar uma automação em uma frase, ela está complicada demais para o time usar.",
      ],
    ],
    pilares: [
      ["Funil na prática", "Passo a passo de captar, qualificar e responder leads, com exemplos que o time aplica no mesmo dia."],
      ["Marketing e vendas no mesmo time", "Conteúdo sobre metas, números e rotinas que os dois times compartilham."],
      ["Opinião sobre o mercado", "Posições claras do time sobre automação, IA e o que funciona em vendas B2B."],
    ],
    receita: "assinatura mensal por produto e plano",
    tags: ["marketingdigital", "vendas", "crm", "automacao"],
  },
  {
    id: "automacao-processos",
    detectar: /(?<![\p{L}])(automa[çc][ãa]o de processos|workflows?|orquestra[çc][ãa]o|no-code|processos de neg[óo]cio)(?![\p{L}])/iu,
    nicho: "saas-b2b",
    categoria: "uma plataforma de automação de processos",
    publico:
      "Gestores de operações, financeiro, RH e compras que dependem de e-mail e planilha para aprovar pedidos e acompanhar demandas",
    quem: "quem cuida de operação",
    assunto: "processos",
    assuntoEm: "nos processos da empresa",
    dor: "pedido que chega por e-mail, some no caminho e ninguém sabe com quem está",
    promessa: "saber onde cada pedido está sem perguntar",
    porque: "todo pedido ainda precisa de alguém cobrando",
    mito: "Automatizar não é trocar gente por robô",
    crenca: [
      "Todo mundo acha que automatizar é trocar gente por robô.",
      "Na prática, é tirar do time a parte do trabalho que ninguém queria fazer.",
    ],
    erros: [
      ["Automatizar um processo que ninguém desenhou", "Automação em cima de bagunça só faz a bagunça andar mais rápido."],
      ["Aprovar pedido por e-mail", "E-mail não tem prazo, responsável nem histórico. Vira caça ao tesouro."],
      ["Depender de uma pessoa que sabe tudo", "Quando ela sai de férias, o processo para junto."],
      ["Medir só o volume", "Quantos pedidos entraram importa menos do que quanto tempo cada um ficou parado."],
    ],
    passos: [
      ["Desenhe o processo como ele é", "Não como deveria ser. Anote cada etapa, quem faz e onde trava."],
      ["Defina um dono por etapa", "Toda etapa precisa de um responsável com nome e de um prazo."],
      ["Automatize o repetitivo", "Aviso, cobrança de prazo e preenchimento de dados são os primeiros candidatos."],
      ["Meça o tempo parado", "O gargalo aparece quando você mede quanto tempo cada pedido espera."],
    ],
    sinalDe: "seu processo ainda depende de e-mail",
    sinais: [
      "Pedido importante chega por e-mail",
      "Ninguém sabe com quem está a aprovação",
      "Cada área tem sua planilha",
      "Férias de alguém travam tudo",
      "Metade da reunião é sobre status",
    ],
    antes: "Pedido por e-mail, aprovação no chat e status perguntado na reunião.",
    depois: "Cada pedido com dono, prazo e etapa visível para todo mundo.",
    opinioes: [
      "a maioria dos processos de uma empresa não está desenhada em lugar nenhum. está no e-mail de alguém.",
      "se para saber o status de um pedido você precisa perguntar para alguém, o processo não existe.",
      "IA não conserta processo ruim. só erra mais rápido.",
    ],
    frases: [
      "Processo bom é o que continua funcionando quando quem o criou sai de férias.",
      "Automatizar não é fazer mais rápido. É parar de fazer o que não precisava de gente.",
    ],
    bastidor: [
      [
        "O que a gente aprende vendo processos por dentro",
        "Quase sempre o gargalo não está na etapa difícil. Está na aprovação simples que ninguém sabe de quem é.",
      ],
      [
        "Por que a gente fala mais de processo do que de ferramenta",
        "Porque ferramenta nenhuma salva um fluxo que ninguém desenhou. Primeiro o desenho, depois a automação.",
      ],
    ],
    pilares: [
      ["Processo antes da ferramenta", "Ensinar a desenhar, medir e simplificar processos, antes de falar de automação."],
      ["IA com controle", "Mostrar onde agentes e automações ajudam de verdade e onde ainda precisam de gente."],
      ["Bastidor da operação", "Casos, erros e decisões do time e de quem usa a plataforma, com autorização."],
    ],
    receita: "assinatura por plano, normalmente com venda consultiva para empresas maiores",
    tags: ["processos", "automacao", "gestao", "produtividade"],
  },
  {
    id: "ecommerce-plataforma",
    detectar: /(?<![\p{L}])(plataforma de e-?commerce|loja (?:online|virtual)|crie sua loja|lojistas?)(?![\p{L}])/iu,
    nicho: "ecommerce-dtc",
    categoria: "uma plataforma de e-commerce",
    publico:
      "Marcas e lojistas que vendem ou querem vender online, do primeiro pedido até a loja que já precisa de pagamento, logística e marketing integrados",
    quem: "quem vende online",
    assunto: "loja online",
    assuntoEm: "na loja online",
    dor: "pedido no direct, estoque no caderno e pagamento conferido à mão",
    promessa: "vender em vários canais sem perder o controle",
    porque: "o cliente abandona o carrinho",
    mito: "Loja pronta não vende sozinha",
    crenca: [
      "Todo mundo acha que a loja online vende sozinha depois que fica pronta.",
      "Na prática, a loja é o começo. Venda vem de canal, recompra e atendimento.",
    ],
    erros: [
      ["Vender só pelo direct", "Sem loja, cada venda depende de você responder mensagem. Não cresce."],
      ["Esquecer quem já comprou", "Cliente que já comprou é o mais fácil de vender de novo. E-mail e WhatsApp existem para isso."],
      ["Esconder o frete até o checkout", "Frete que só aparece no final é motivo clássico de carrinho abandonado."],
      ["Separar o estoque por canal", "Vender a mesma peça duas vezes custa um cliente."],
    ],
    passos: [
      ["Comece onde o cliente já está", "Instagram, WhatsApp ou marketplace: comece pelo canal onde as pessoas já te procuram."],
      ["Faça o básico bem feito", "Boas fotos, descrição honesta e frete claro vendem mais do que layout cheio de efeito."],
      ["Conecte os canais", "Um estoque só para loja, redes e chat evita vender o que você não tem."],
      ["Traga o cliente de volta", "Um e-mail depois da compra e outro para quem abandonou o carrinho já fazem diferença."],
    ],
    sinalDe: "sua loja já ficou pequena",
    sinais: [
      "Você confere pagamento um por um",
      "Estoque do Instagram não bate com a loja",
      "Responder mensagem toma o dia",
      "Cliente não recebe nada depois da compra",
      "O frete é calculado na mão",
    ],
    antes: "Pedido no direct, estoque no caderno e pagamento conferido um por um.",
    depois: "Loja, redes e chat conectados, com estoque e pagamento no mesmo painel.",
    opinioes: [
      "vender só pelo direct funciona até o dia em que dá certo. aí vira um segundo emprego.",
      "loja online não é vitrine. é operação: pedido, pagamento, envio e o cliente voltando.",
      "o cliente mais barato de conquistar é o que já comprou de você. muita loja esquece dele.",
    ],
    frases: [
      "Marca pequena não perde venda por falta de produto. Perde porque o cliente não achou onde comprar.",
      "A primeira venda online prova o produto. A segunda prova a marca.",
    ],
    bastidor: [
      [
        "O que a gente mais ouve de quem está começando",
        "Que parece difícil demais montar uma loja. Quase sempre a parte difícil é decidir começar. O resto dá para simplificar.",
      ],
      [
        "O momento que mais nos interessa em uma marca",
        "Quando ela sai do direct e passa a ter uma loja de verdade. É ali que a operação começa a crescer.",
      ],
    ],
    pilares: [
      ["Vender mais com o que já tem", "Dicas práticas de canal, recompra e conversão para quem já tem loja."],
      ["Do direct à loja", "Conteúdo para quem está começando: primeiros passos, frete, pagamento e fotos."],
      ["Marcas que vendem online", "Histórias de lojistas e bastidores do time, sempre com autorização."],
    ],
    receita: "planos mensais para lojistas, com receita extra de pagamentos, frete e serviços",
    tags: ["ecommerce", "lojavirtual", "empreendedorismo", "vendasonline"],
  },
  {
    id: "cuidados-pele",
    detectar: /(?<![\p{L}])(skincare|sua pele|da pele|cuidados? com a pele|dermatol[óo]gic\p{L}*|f[óo]rmulas?)(?![\p{L}])/iu,
    nicho: "ecommerce-dtc",
    categoria: "uma marca de cuidados com a pele",
    publico:
      "Pessoas que querem cuidar da pele sem cair em promessa milagrosa, que pesquisam fórmula e leem avaliação antes de comprar",
    quem: "quem quer uma rotina de pele simples",
    assunto: "cuidado com a pele",
    assuntoEm: "na rotina de pele",
    dor: "prateleira cheia de produto e nenhuma rotina que dura",
    promessa: "montar uma rotina de pele que dura",
    porque: "a rotina de pele não para de pé",
    mito: "Rotina de pele boa não tem dez passos",
    crenca: [
      "Todo mundo acha que rotina de pele boa tem dez passos.",
      "Na prática, a melhor rotina é a que você consegue fazer todo dia.",
    ],
    erros: [
      ["Trocar de produto toda semana", "A pele precisa de tempo para responder. Dê algumas semanas antes de julgar."],
      ["Pular o protetor em dia nublado", "Nublado não é sem sol. O protetor entra na rotina todo dia."],
      ["Usar ativo demais ao mesmo tempo", "Mais ativo não é mais resultado. Às vezes é só irritação."],
      ["Copiar a rotina de outra pessoa", "Pele oleosa, seca ou sensível pedem cuidados diferentes."],
    ],
    passos: [
      ["Limpeza", "Um sabonete adequado ao seu tipo de pele, de manhã e à noite."],
      ["Hidratação", "Até pele oleosa precisa. Muda a textura do produto, não a etapa."],
      ["Proteção solar", "Todo dia, com reaplicação se você fica exposto ao sol."],
      ["Tratamento, se precisar", "Um ativo por vez, com orientação, para entender o que funciona para você."],
    ],
    sinalDe: "sua rotina de pele precisa de ajuste",
    sinais: [
      "A pele repuxa depois de lavar",
      "Tem mais produto do que usa",
      "Protetor solar só na praia",
      "Rotina nova a cada vídeo",
      "Não sabe seu tipo de pele",
    ],
    antes: "Dez produtos na prateleira, rotina diferente a cada semana e pele irritada.",
    depois: "Poucos produtos certos, usados todo dia, e a pele respondendo.",
    opinioes: [
      "rotina de pele não precisa de dez passos. precisa de constância.",
      "o melhor produto de skincare é o que você não esquece de usar.",
      "promessa de resultado em uma noite deveria ser motivo de desconfiança, não de compra.",
    ],
    frases: [
      "Cuidar da pele é hábito, não milagre de fim de semana.",
      "Escutar a pele vale mais do que seguir a tendência da semana.",
    ],
    bastidor: [
      [
        "A pergunta que a gente mais recebe",
        "Qual produto usar primeiro. A resposta honesta quase sempre é: comece pelo básico e dê tempo para a pele.",
      ],
      [
        "Uma coisa que a comunidade nos ensinou",
        "Que as pessoas querem entender a fórmula, não só ver a embalagem. A conversa sobre ingrediente vem antes da venda.",
      ],
    ],
    pilares: [
      ["Pele explicada", "Ingredientes, tipos de pele e rotina em linguagem simples, sem promessa milagrosa."],
      ["Comunidade", "Dúvidas, avaliações e rotinas de clientes reais viram conteúdo, com autorização."],
      ["Como a fórmula nasce", "Bastidores de desenvolvimento, testes e decisões do time."],
    ],
    receita: "venda direta dos produtos pelo site",
    tags: ["skincare", "cuidadoscomapele", "rotinadeskincare", "pele"],
  },

  // ---------- Temas padrão por nicho (quando o site não indica um tipo de negócio específico) ----------
  {
    id: "saas-padrao",
    detectar: null,
    nicho: "saas-b2b",
    categoria: "um software para empresas",
    publico:
      "Gestores e donos de empresa que perdem tempo com processo manual e querem previsibilidade sem contratar mais gente",
    quem: "quem gere um time",
    assunto: "rotina do time",
    assuntoEm: "na rotina do time",
    dor: "informação espalhada em planilha, e-mail e mensagem",
    promessa: "ter a operação na mão sem planilha paralela",
    porque: "o time ainda vive de planilha paralela",
    mito: "Seu time não precisa de mais uma ferramenta",
    crenca: [
      "Todo mundo acha que o time precisa de mais uma ferramenta.",
      "Na prática, precisa de menos lugares para procurar a mesma informação.",
    ],
    erros: [
      ["Comprar ferramenta antes de entender o problema", "Software não resolve o que ninguém desenhou."],
      ["Implantar sem envolver o time", "Quem vai usar precisa participar da escolha, ou volta para a planilha."],
      ["Manter a planilha paralela", "Se a informação existe em dois lugares, um deles está errado."],
      ["Medir tudo e decidir nada", "Painel bonito sem decisão é só decoração."],
    ],
    passos: [
      ["Escreva o problema em uma frase", "Se não cabe em uma frase, ainda não está claro o bastante."],
      ["Mapeie quem faz o quê", "Cada etapa com um responsável e um prazo."],
      ["Tire uma planilha por vez", "Migrar tudo de uma vez assusta o time. Comece pela que mais dói."],
      ["Revise depois de um mês", "Ferramenta boa é a que o time continua usando depois do primeiro mês."],
    ],
    sinalDe: "seu time vive de planilha paralela",
    sinais: [
      "A mesma informação vive em três lugares",
      "Status é perguntado no chat o dia todo",
      "Relatório exige copiar e colar",
      "Só uma pessoa sabe como funciona",
      "A planilha tem versão final 2",
    ],
    antes: "Planilha paralela, e-mail perdido e ninguém sabe onde o pedido parou.",
    depois: "Um fluxo claro, cada pessoa sabendo o que é com ela.",
    opinioes: [
      "ferramenta boa não é a que tem mais funções. é a que o time continua usando depois do primeiro mês.",
      "se o seu processo só funciona porque alguém lembra de tudo, ele não funciona.",
      "planilha com versão final 2 no nome é um pedido de socorro.",
    ],
    frases: [
      "O problema quase nunca é falta de ferramenta. É falta de um lugar só para a informação.",
      "Time bom perde o dia procurando informação quando o processo não ajuda.",
    ],
    bastidor: [
      [
        "A pergunta que a gente faz antes de lançar uma função",
        "Isso tira trabalho de quem usa ou só fica bonito na demonstração? Se for a segunda opção, não entra.",
      ],
      [
        "O que a gente mais ouve de clientes novos",
        "Que já tentaram outras ferramentas e voltaram para a planilha. É esse retorno que a gente tenta evitar.",
      ],
    ],
    pilares: [
      ["Dor da operação", "Mostrar o custo escondido do jeito antigo de trabalhar, com situações que o gestor reconhece."],
      ["Como se faz", "Ensinar o passo a passo de resolver o problema, mesmo antes de falar do produto."],
      ["Bastidor do founder", "Decisões, erros e aprendizados de quem está construindo a empresa."],
    ],
    receita: "assinatura mensal por plano",
    tags: ["gestao", "produtividade", "saas", "b2b"],
  },
  {
    id: "fintech-padrao",
    detectar: null,
    nicho: "fintech",
    categoria: "um serviço financeiro digital",
    publico: "Pessoas cansadas de taxa, burocracia e atendimento de banco tradicional, que resolvem a vida financeira pelo celular",
    quem: "quem cuida do próprio dinheiro",
    assunto: "dinheiro",
    assuntoEm: "com dinheiro",
    dor: "tarifa que ninguém explicou e atendimento que demora dias",
    promessa: "organizar o dinheiro sem letra miúda",
    porque: "o dinheiro some antes do fim do mês",
    mito: "Organizar dinheiro não é coisa de quem ganha muito",
    crenca: [
      "Todo mundo acha que organizar dinheiro é coisa de quem ganha muito.",
      "Na prática, é quem ganha menos que mais sente cada tarifa e cada juro.",
    ],
    erros: [
      ["Não saber quanto paga de tarifa", "Some as cobranças dos últimos meses. O número costuma surpreender."],
      ["Usar o limite como se fosse renda", "Limite é dívida esperando para acontecer."],
      ["Pagar só o mínimo da fatura", "O juro do rotativo cresce mais rápido do que parece."],
      ["Deixar dinheiro parado na conta", "Dinheiro sem rendimento perde valor todo mês."],
    ],
    passos: [
      ["Liste o que entra e o que sai", "Um mês anotado já mostra para onde o dinheiro vai."],
      ["Corte as tarifas sem sentido", "Muita cobrança existe só porque ninguém questionou."],
      ["Separe uma reserva", "Mesmo pouco, todo mês. Reserva é o que evita o juro."],
      ["Automatize o que der", "Pagamento e investimento automáticos não dependem da sua memória."],
    ],
    sinalDe: "seu dinheiro está vazando",
    sinais: [
      "Não sabe quanto pagou de tarifa",
      "A fatura sempre assusta",
      "O limite parece parte do salário",
      "Dinheiro parado na conta corrente",
      "Nenhuma reserva para imprevisto",
    ],
    antes: "Tarifa em tudo, burocracia e atendimento que demora dias.",
    depois: "Dinheiro organizado no app, sem letra miúda.",
    opinioes: [
      "pagar tarifa para movimentar o próprio dinheiro ainda é normal para muita gente. não deveria ser.",
      "educação financeira que só manda cortar o cafezinho não entendeu o problema.",
      "banco que precisa de letra miúda está escondendo alguma coisa.",
    ],
    frases: [
      "Dinheiro organizado é menos sobre planilha e mais sobre não ter surpresa.",
      "Clareza sobre o que se paga não é diferencial. Deveria ser o mínimo.",
    ],
    bastidor: [
      [
        "Uma pergunta que guia o nosso produto",
        "Se fosse o meu dinheiro, eu aceitaria pagar por isso? Quando a resposta é não, a gente repensa.",
      ],
      [
        "O que a gente mais ouve de quem chega",
        "Que nunca entendeu direito o que pagava no banco antigo. Explicar isso virou parte do trabalho.",
      ],
    ],
    pilares: [
      ["Dinheiro sem letra miúda", "Traduzir taxas, regras e produtos financeiros em linguagem simples."],
      ["Contra o jeito antigo", "Comparar a experiência com o banco tradicional, sempre com fatos."],
      ["Confiança", "Mostrar segurança, regulação e gente real por trás do produto."],
    ],
    receita: "serviços financeiros e tarifas de operações específicas; vale confirmar com o time",
    tags: ["financas", "educacaofinanceira", "dinheiro", "fintech"],
  },
  {
    id: "healthtech-padrao",
    detectar: null,
    nicho: "healthtech",
    categoria: "um serviço de saúde digital",
    publico: "Pessoas e empresas que querem cuidar da saúde sem fila, telefonema e a sensação de ser só mais um número",
    quem: "quem cuida da própria saúde",
    assunto: "cuidado com a saúde",
    assuntoEm: "no cuidado com a saúde",
    dor: "marcar consulta por telefone, esperar semanas e sair sem acompanhamento",
    promessa: "ter acompanhamento entre uma consulta e outra",
    porque: "a gente só procura médico quando dói",
    mito: "Cuidar da saúde não começa quando dói",
    crenca: [
      "Todo mundo acha que cuidar da saúde é ir ao médico quando algo dói.",
      "Na prática, o cuidado que mais faz diferença acontece antes do problema aparecer.",
    ],
    erros: [
      ["Esperar o sintoma para procurar ajuda", "Check-up e acompanhamento existem para pegar o problema cedo."],
      ["Guardar exame na gaveta", "Resultado sem retorno ao profissional é informação desperdiçada."],
      ["Pesquisar sintoma na internet e parar aí", "Informação ajuda, mas não substitui avaliação."],
      ["Abandonar o tratamento quando melhora", "Melhorar não é o mesmo que terminar o tratamento."],
    ],
    passos: [
      ["Tenha um profissional de referência", "Alguém que conhece seu histórico evita recomeçar do zero a cada consulta."],
      ["Organize seus exames", "Tudo em um lugar só facilita cada retorno."],
      ["Marque o retorno na saída", "O acompanhamento acontece quando a próxima conversa já está marcada."],
      ["Tire dúvidas cedo", "Canal fácil para perguntar evita a ida desnecessária ao pronto-socorro."],
    ],
    sinalDe: "você está adiando o cuidado",
    sinais: [
      "Não lembra do último check-up",
      "Exames espalhados em e-mails",
      "Marcar consulta exige várias ligações",
      "Cada médico pergunta tudo de novo",
      "Só procura ajuda quando dói",
    ],
    antes: "Telefonema para marcar, semanas de espera e nenhum retorno depois da consulta.",
    depois: "Consulta fácil de marcar e alguém acompanhando o que vem depois.",
    opinioes: [
      "cuidar da saúde não deveria parecer uma maratona de telefonemas e salas de espera.",
      "o sistema de saúde ainda é desenhado para quando o problema já apareceu. dá para inverter.",
      "consulta sem retorno não é cuidado. é atendimento.",
    ],
    frases: ["O melhor momento de cuidar é antes de precisar.", "Cuidado de verdade continua depois que a consulta acaba."],
    bastidor: [
      [
        "O que a gente ouve de quem chega até nós",
        "Que ninguém acompanhou o que veio depois da consulta. É esse intervalo que a gente quer ocupar.",
      ],
      [
        "Uma regra que a gente leva a sério",
        "Conteúdo de saúde só sai depois de revisado por profissional. Informação errada aqui custa caro.",
      ],
    ],
    pilares: [
      ["Cuidado na prática", "Histórias e situações reais de cuidado, sempre com consentimento e sem expor ninguém."],
      ["Saúde explicada", "Conteúdo educativo curto, revisado por profissional, que tira dúvida comum."],
      ["Por dentro da operação", "Como o time trabalha, quem são os profissionais e por que as decisões são tomadas."],
    ],
    receita: "assinatura ou pagamento por atendimento; vale confirmar com o time",
    tags: ["saude", "bemestar", "cuidado", "saudedigital"],
  },
  {
    id: "edtech-padrao",
    detectar: null,
    nicho: "edtech",
    categoria: "uma plataforma de ensino",
    publico: "Estudantes e profissionais que querem aprender algo que muda a nota ou a carreira, com pouco tempo e muita distração",
    quem: "quem está estudando",
    assunto: "estudos",
    assuntoEm: "nos estudos",
    dor: "horas de estudo, anotação bonita e a sensação de não sair do lugar",
    promessa: "aprender mais estudando menos horas",
    porque: "você estuda e esquece na semana seguinte",
    mito: "Estudar mais horas não é estudar melhor",
    crenca: [
      "Todo mundo acha que estudar mais horas é o caminho.",
      "Na prática, o que muda o resultado é revisar do jeito certo.",
    ],
    erros: [
      ["Reler o material", "Parece estudo, mas quase não fixa. Tente explicar sem olhar."],
      ["Estudar tudo de uma vez", "Várias sessões curtas rendem mais que uma maratona na véspera."],
      ["Pular os exercícios", "É no exercício que aparece o que você não entendeu."],
      ["Estudar sem plano", "Sem saber o que vem amanhã, cada dia começa do zero."],
    ],
    passos: [
      ["Defina o objetivo da semana", "Um tema claro por semana vale mais que dez abertos."],
      ["Estude em blocos curtos", "Sessões de foco com pausa rendem mais do que horas seguidas."],
      ["Teste a si mesmo", "Responda sem consultar. O erro mostra onde revisar."],
      ["Revise no dia seguinte", "Uma revisão rápida no dia seguinte segura o que você aprendeu."],
    ],
    sinalDe: "seu jeito de estudar não está funcionando",
    sinais: [
      "Relê e esquece no dia seguinte",
      "Muitas horas e pouco progresso",
      "Tudo fica para a véspera",
      "Não sabe o que estudar amanhã",
      "Evita os exercícios difíceis",
    ],
    antes: "Horas de estudo, resumo colorido e nota que não sobe.",
    depois: "Menos horas, método claro e progresso que dá para ver.",
    opinioes: [
      "decorar para a prova não é aprender. é alugar o conteúdo por uma semana.",
      "ninguém desiste de estudar por preguiça. desiste porque não vê progresso.",
      "curso bom não é o que tem mais aula. é o que você termina.",
    ],
    frases: ["Aprender é conseguir explicar sem olhar a anotação.", "Constância pequena ganha de esforço enorme na véspera."],
    bastidor: [
      [
        "O que a gente mais ouve de quem começa a estudar",
        "Que já tentou várias vezes e parou no meio. Por isso a gente pensa primeiro em como fazer a pessoa voltar amanhã.",
      ],
      [
        "Uma pergunta que a gente faz antes de criar uma aula",
        "Dá para aplicar isso hoje? Se não dá, a aula ainda não está pronta.",
      ],
    ],
    pilares: [
      ["Aprenda em 1 minuto", "Um conceito útil por post, explicado de forma que dê para aplicar hoje."],
      ["Histórias de virada", "Trajetórias de alunos e do time, com antes e depois concretos e autorizados."],
      ["Opinião sobre educação", "Posições claras sobre como se aprende de verdade, que provocam comentário."],
    ],
    receita: "venda de cursos ou assinatura de acesso",
    tags: ["educacao", "estudos", "carreira", "aprendizado"],
  },
  {
    id: "ecommerce-padrao",
    detectar: null,
    nicho: "ecommerce-dtc",
    categoria: "uma marca que vende direto ao consumidor",
    publico:
      "Consumidores que compram online, pesquisam antes de decidir e confiam mais na experiência de outros clientes do que em anúncio",
    quem: "quem compra online",
    assunto: "escolha de produto",
    assuntoEm: "na hora de comprar",
    dor: "comprar por impulso e deixar o produto parado na gaveta",
    promessa: "escolher melhor e usar o que compra",
    porque: "tanta compra acaba parada na gaveta",
    mito: "Mais opção não ajuda o cliente a escolher",
    crenca: [
      "Todo mundo acha que mais opção ajuda a escolher.",
      "Na prática, opção demais faz a pessoa não comprar nada ou comprar errado.",
    ],
    erros: [
      ["Comprar só pela foto", "Leia a descrição e as avaliações. É ali que está a diferença."],
      ["Ignorar como cuidar do produto", "Produto bem cuidado dura mais e rende mais."],
      ["Chutar tamanho ou versão", "Tabela de medidas e guia existem para evitar a troca."],
      ["Esquecer de avaliar", "Sua avaliação ajuda a próxima pessoa a escolher melhor."],
    ],
    passos: [
      ["Comece pela necessidade", "Antes do produto, a pergunta: para que você vai usar?"],
      ["Leia quem já usou", "Avaliação de cliente real vale mais do que foto de campanha."],
      ["Compare o essencial", "Material, uso e cuidado. O resto é detalhe."],
      ["Use de verdade", "Produto bom é o que sai da caixa e entra na rotina."],
    ],
    sinalDe: "você compra mais do que usa",
    sinais: [
      "Tem produto que nunca usou",
      "Compra por impulso na promoção",
      "Não lê avaliação antes",
      "Troca muito por tamanho errado",
      "Escolhe pela embalagem",
    ],
    antes: "Compra por impulso, produto parado na gaveta.",
    depois: "Poucos produtos certos, usados todo dia.",
    opinioes: [
      "cliente não compra produto. compra a versão de si mesmo que vai usar o produto.",
      "a melhor propaganda de uma marca ainda é a foto que o cliente tira sem ninguém pedir.",
      "marca que só fala de desconto ensina o cliente a esperar desconto.",
    ],
    frases: [
      "Produto bom é o que continua na rotina depois da primeira semana.",
      "Marca de verdade é a que o cliente recomenda sem ganhar nada por isso.",
    ],
    bastidor: [
      [
        "O que os comentários dos clientes nos ensinam",
        "Que o detalhe que a gente acha pequeno é o que mais aparece na avaliação. Por isso vale ler cada um.",
      ],
      [
        "Uma pergunta antes de lançar qualquer produto",
        "A gente usaria isso todo dia? Se a resposta for talvez, ainda não está pronto.",
      ],
    ],
    pilares: [
      ["Produto na vida real", "Uso real do produto, com detalhe que só quem usa percebe."],
      ["Bastidor da marca", "Como o produto é feito, decisões do founder, erros e acertos."],
      ["Comunidade", "Clientes, comentários e cocriação viram conteúdo, com autorização."],
    ],
    receita: "venda direta dos produtos pelo site",
    tags: ["marca", "comprasonline", "consumoconsciente", "novidade"],
  },
];

const PADRAO: Record<Nicho, string> = {
  "saas-b2b": "saas-padrao",
  fintech: "fintech-padrao",
  healthtech: "healthtech-padrao",
  edtech: "edtech-padrao",
  "ecommerce-dtc": "ecommerce-padrao",
  "marketing-agencias": "saas-padrao",
  "servicos-locais": "ecommerce-padrao",
  "ia-dev": "saas-padrao",
};

/**
 * Tema do site: o tema específico com mais ocorrências no texto (desempate pela ordem da lista),
 * ou o tema padrão do nicho quando nenhum aparece.
 */
export function escolherTema(texto: string, nicho: Nicho): Tema {
  let melhor: Tema | null = null;
  let pontos = 0;
  for (const t of TEMAS) {
    if (!t.detectar) continue;
    const re = new RegExp(t.detectar.source, "giu");
    const n = (texto.match(re) ?? []).length + (t.nicho === nicho ? 0.5 : 0);
    if (n >= 1 && n > pontos) {
      melhor = t;
      pontos = n;
    }
  }
  return melhor ?? TEMAS.find((t) => t.id === PADRAO[nicho])!;
}
