// Função de servidor (Vercel) que cria as perguntas do "Quiz do seu arquivo".
// Usa a chave ANTHROPIC_API_KEY configurada no projeto da Vercel; ela nunca vai para o navegador.
import Anthropic from "@anthropic-ai/sdk";
import { cors, usuarioDaSessao } from "./_sessao.js";
import { sql, prepararBanco } from "./_banco.js";

const client = new Anthropic();
const MODELO = process.env.MODELO || "claude-opus-5-5";
// Modelos que aceitam o parâmetro "fallbacks" (outro modelo assume se este recusar o pedido).
const COM_FALLBACK = new Set(["claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5", "claude-fable-5-1"]);
const LIMITE_TEXTO = 40000;
// Cada chamada ao Claude custa: só quem tem conta usa, com limite por hora e por dia.
const IA_POR_HORA = 60, IA_POR_DIA = 300;
const MAX_IMAGENS = 5;

// Dificuldade por modo: 1 = Normal, 2 = Dobro nível, 3 = Triplo nível.
const DIFICULDADE = {
  1: "de dificuldade fácil a média, sobre as ideias principais",
  2: "difíceis: cobre detalhes, números, nomes e relações do conteúdo",
  3: "muito difíceis: cobre exceções, dados exatos, comparações e conexões entre partes distantes do conteúdo, exigindo leitura atenta"
};

function instrucoes(mult, temImagens, evitar) {
  return [
    "Crie perguntas de quiz em português do Brasil baseadas SOMENTE no conteúdo " + (temImagens ? "das imagens acima (fotos de um material de estudo)" : "acima") + ".",
    "Regras:",
    `- 20 perguntas, ${DIFICULDADE[mult]}.`,
    "- Enunciado curto, até 90 caracteres. Respostas curtas, até 40 caracteres.",
    "- Exatamente 3 opções por pergunta: a primeira é a correta e as outras duas são erradas mas plausíveis. As três devem ser diferentes.",
    "- A resposta correta precisa estar clara no conteúdo. Não invente fatos que não estejam nele.",
    "- Se o conteúdo não render tantas perguntas, crie menos.",
    evitar.length ? "- Não repita nem reformule estas perguntas já feitas:\n" + evitar.map(q => "  • " + q).join("\n") : "",
    'Responda apenas com JSON, neste formato: {"titulo": "assunto em até 4 palavras", "perguntas": [["enunciado", "correta", "errada 1", "errada 2"]]}'
  ].filter(Boolean).join("\n");
}

// Categoria criada pelo usuário a partir de um tema, em duas fases curtas para caber no tempo da função:
// 1) avaliar: o Claude aprova ou recusa o tema, define o peso e divide o tema em 3 subtemas;
// 2) perguntas: o app pede as perguntas de cada subtema em paralelo, evitando as que já existem.
const DIFICULDADE_TEMA = {
  facil: "fáceis, sobre o que a maioria de quem gosta do assunto sabe",
  dificil: "difíceis: detalhes, números, nomes e relações que só quem conhece bem o assunto sabe",
  expert: "de nível expert: exceções, dados exatos e conexões que só especialistas acertam"
};
const NOME_DIFICULDADE = { facil: "Fácil", dificil: "Difícil", expert: "Expert" };
function instrucoesAvaliar(tema, dificuldade) {
  return [
    "Você cria categorias de quiz para o app Jingar, em português do Brasil.",
    'Tema pedido pelo usuário: """' + tema + '"""',
    "Dificuldade escolhida pelo usuário: " + NOME_DIFICULDADE[dificuldade] + ".",
    "Avalie o tema. Recuse se ele:",
    "- for ofensivo, sexual, discriminatório, incentivar crime ou automutilação, ou tratar de pessoas comuns ou privadas;",
    "- for banal ou estreito demais (por exemplo um objeto do dia a dia, como cortina, chão ou garrafa) e não render pelo menos 50 perguntas de conhecimento verificável e variado;",
    "- for vago, sem sentido ou só uma brincadeira.",
    'Se recusar, responda apenas: {"aprovado": false, "motivo": "uma frase curta para o usuário", "sugestoes": ["até 3 temas próximos que renderiam um bom quiz"]}',
    "Se aprovar, responda com:",
    "- titulo: nome da categoria em até 4 palavras;",
    "- peso: número de 0.1 a 3, com uma casa decimal, conforme a complexidade do assunto e a dificuldade escolhida: 0.1 para assuntos muito fáceis e conhecidos de todos, 1 para conhecimento geral médio, 2 para assuntos técnicos, 3 para assuntos altamente especializados em nível expert;",
    "- subtemas: 3 subtemas bem diferentes entre si, que juntos cubram o tema e rendam pelo menos 20 perguntas cada.",
    'Responda apenas com JSON: {"aprovado": true, "titulo": "...", "peso": 1.2, "subtemas": ["...", "...", "..."]}'
  ].join("\n");
}
function instrucoesSubtema(tema, subtema, dificuldade, evitar) {
  return [
    "Crie perguntas de quiz em português do Brasil para o app Jingar.",
    'Tema: """' + tema + '""". Subtema desta parte: """' + subtema + '""".',
    "Regras:",
    `- 22 perguntas ${DIFICULDADE_TEMA[dificuldade]}, só sobre o subtema, variadas, sobre fatos verificáveis e estáveis, sem opinião nem fatos que mudam com o tempo;`,
    "- enunciado curto, até 90 caracteres; respostas curtas, até 40 caracteres;",
    "- exatamente 3 opções por pergunta: a primeira é a correta e as outras duas são erradas mas plausíveis, todas diferentes.",
    evitar.length ? "- Não repita nem reformule estas perguntas já feitas:\n" + evitar.map(q => "  • " + q).join("\n") : "",
    'Responda apenas com JSON: {"perguntas": [["enunciado", "correta", "errada 1", "errada 2"]]}'
  ].filter(Boolean).join("\n");
}

// Lê o JSON da resposta: o texto inteiro, um bloco ```json``` ou o trecho entre a primeira { e a última }.
function extrairJson(txt) {
  const tentativas = [txt, (txt.match(/```(?:json)?\s*([\s\S]*?)```/) || [])[1], txt.slice(txt.indexOf("{"), txt.lastIndexOf("}") + 1)];
  for (const t of tentativas) { if (!t) continue; try { return JSON.parse(t); } catch {} }
  return null;
}

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST." });
  const b = req.body || {};

  const codigo = process.env.CODIGO_ACESSO;
  if (codigo && b.codigo !== codigo) return res.status(401).json({ erro: "Código de acesso inválido." });
  if (sql) {
    try {
      await prepararBanco();
      const u = await usuarioDaSessao(req);
      if (!u || u.banido) return res.status(403).json({ erro: "Entre na sua conta para criar perguntas com IA." });
      const [{ h }] = await sql`SELECT count(*)::int AS h FROM ia_uso WHERE usuario_id = ${u.id} AND criado_em > now() - interval '1 hour'`;
      const [{ d }] = await sql`SELECT count(*)::int AS d FROM ia_uso WHERE usuario_id = ${u.id} AND criado_em > now() - interval '1 day'`;
      if (h >= IA_POR_HORA || d >= IA_POR_DIA) return res.status(429).json({ erro: "Você atingiu o limite de criações com IA por agora. Tente de novo mais tarde." });
      await sql`INSERT INTO ia_uso (usuario_id) VALUES (${u.id})`;
    } catch (e) { console.error(e); return res.status(500).json({ erro: "Erro no servidor." }); }
  }
  if (typeof b.tema === "string") {
    const dificuldade = Object.hasOwn(DIFICULDADE_TEMA, b.dificuldade) ? b.dificuldade : "facil";
    const evitarTema = Array.isArray(b.evitar) ? b.evitar.filter(x => typeof x === "string").slice(-120).map(x => x.slice(0, 200)) : [];
    return criarCategoria(b.tema.trim().slice(0, 60), typeof b.subtema === "string" ? b.subtema.trim().slice(0, 120) : "", dificuldade, evitarTema, res);
  }

  const texto = typeof b.texto === "string" ? b.texto.slice(0, LIMITE_TEXTO) : "";
  const imagens = Array.isArray(b.imagens) ? b.imagens.filter(s => typeof s === "string" && s.length).slice(0, MAX_IMAGENS) : [];
  if (!texto.trim() && !imagens.length) return res.status(400).json({ erro: "Envie um texto ou fotos." });
  const evitar = Array.isArray(b.evitar) ? b.evitar.filter(s => typeof s === "string").slice(-80).map(s => s.slice(0, 200)) : [];
  const mult = [1, 2, 3].includes(b.mult) ? b.mult : b.dobro === true ? 2 : 1;

  const conteudo = imagens.map(dados => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: dados } }));
  if (texto) conteudo.push({ type: "text", text: 'CONTEÚDO:\n"""\n' + texto + '\n"""' });
  // O conteúdo do arquivo fica em cache: pedir "mais perguntas" do mesmo arquivo sai mais barato.
  conteudo[conteudo.length - 1].cache_control = { type: "ephemeral" };
  conteudo.push({ type: "text", text: instrucoes(mult, imagens.length > 0, evitar) });

  const params = {
    model: MODELO,
    max_tokens: 16000,
    output_config: { effort: mult === 3 ? "high" : mult === 2 ? "medium" : "low" },
    messages: [{ role: "user", content: conteudo }]
  };
  if (COM_FALLBACK.has(MODELO)) { params.betas = ["server-side-fallback-2026-07-01"]; params.fallbacks = "default"; }

  try {
    const resp = await client.beta.messages.create(params);
    if (resp.stop_reason === "refusal") return res.status(422).json({ erro: "O Claude não gerou perguntas com esse conteúdo. Tente outro arquivo." });
    const txt = resp.content.filter(c => c.type === "text").map(c => c.text).join("");
    const json = extrairJson(txt);
    if (!json || !Array.isArray(json.perguntas)) return res.status(502).json({ erro: "Não consegui montar perguntas com esse arquivo. Tente de novo." });
    return res.status(200).json({ titulo: typeof json.titulo === "string" ? json.titulo : "Seu arquivo", perguntas: json.perguntas });
  } catch (e) {
    return erroDaApi(e, res);
  }
}

// O app valida as perguntas e exige pelo menos 50; aqui só repassamos o que o Claude decidiu.
async function criarCategoria(tema, subtema, dificuldade, evitar, res) {
  if (tema.length < 2) return res.status(400).json({ erro: "Digite um tema." });
  const params = {
    model: MODELO,
    max_tokens: subtema ? 6000 : 1500,
    output_config: { effort: "low" },
    messages: [{ role: "user", content: subtema ? instrucoesSubtema(tema, subtema, dificuldade, evitar) : instrucoesAvaliar(tema, dificuldade) }]
  };
  if (COM_FALLBACK.has(MODELO)) { params.betas = ["server-side-fallback-2026-07-01"]; params.fallbacks = "default"; }
  try {
    const resp = await client.beta.messages.create(params);
    if (resp.stop_reason === "refusal") return res.status(200).json(subtema ? { perguntas: [] } : { aprovado: false, motivo: "Esse tema não pode virar categoria.", sugestoes: [] });
    const json = extrairJson(resp.content.filter(c => c.type === "text").map(c => c.text).join(""));
    if (!json) return res.status(502).json({ erro: "Não consegui ler a resposta do Claude. Tente de novo." });
    return res.status(200).json(json);
  } catch (e) {
    return erroDaApi(e, res);
  }
}

function erroDaApi(e, res) {
  if (e instanceof Anthropic.RateLimitError) return res.status(429).json({ erro: "Muitos pedidos agora. Tente de novo em alguns minutos." });
  if (e instanceof Anthropic.AuthenticationError) return res.status(500).json({ erro: "A chave da API do servidor está inválida." });
  if (e instanceof Anthropic.BadRequestError) return res.status(400).json({ erro: "O arquivo não pôde ser processado. Tente um trecho menor ou outro formato." });
  if (e instanceof Anthropic.APIError) return res.status(502).json({ erro: "O serviço do Claude falhou. Tente de novo." });
  return res.status(500).json({ erro: "Erro no servidor." });
}

