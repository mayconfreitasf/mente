// Função de servidor (Vercel) que cria as perguntas do "Quiz do seu arquivo".
// Usa a chave ANTHROPIC_API_KEY configurada no projeto da Vercel; ela nunca vai para o navegador.
import Anthropic from "@anthropic-ai/sdk";
import { cors, usuarioDaSessao } from "./_sessao.js";
import { sql, prepararBanco } from "./_banco.js";
import { assinarPergunta, tokenPeso, pesoValido, iguais } from "./_pontos.js";
import { temaPronto, normalizarTema } from "./_temas-prontos.js";
const MIN_PERGUNTAS = 50;
// Junta as perguntas válidas das partes (sem enunciado repetido), como o app faz.
function juntar(listas) {
  const vistos = new Set();
  return listas.flat().filter(q => Array.isArray(q) && q.length === 4 && q.every(x => typeof x === "string" && x.trim()) &&
    new Set(q.slice(1).map(x => x.trim().toLowerCase())).size === 3 && !vistos.has(q[0].trim().toLowerCase()) && vistos.add(q[0].trim().toLowerCase()))
    .map(q => q.map(x => x.trim().slice(0, 200)));
}
// Assinatura de cada pergunta válida (por enunciado): é o que permite ao servidor somar nível quando a pessoa acerta.
function assinaturas(uid, pts, perguntas) {
  const out = {};
  if (!uid || !pts) return out;
  for (const q of Array.isArray(perguntas) ? perguntas : []) {
    if (Array.isArray(q) && q.length === 4 && q.every(x => typeof x === "string" && x.trim())) out[q[0].trim().slice(0, 200)] = assinarPergunta(uid, pts, q[0], q[1]);
  }
  return out;
}

const client = new Anthropic();
const MODELO = process.env.MODELO || "claude-opus-5-5";
// Modelos que aceitam o parâmetro "fallbacks" (outro modelo assume se este recusar o pedido).
const COM_FALLBACK = new Set(["claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5", "claude-fable-5-1"]);
const LIMITE_TEXTO = 40000;
// Cada chamada ao Claude custa: só quem tem conta usa, com limite por hora e por dia.
const IA_POR_HORA = 20, IA_POR_DIA = 20;
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
  let u = null;
  if (sql) {
    try {
      await prepararBanco();
      u = await usuarioDaSessao(req);
      if (!u || u.banido) return res.status(403).json({ erro: "Entre na sua conta para o Jingar criar perguntas para você." });
    } catch (e) { console.error(e); return res.status(500).json({ erro: "Erro no servidor." }); }
  }
  // Conta uma chamada ao Claude no limite por hora e por dia. Perguntas prontas (cache) não contam.
  async function usarIA() {
    if (!sql || !u) return true;
    const [{ h }] = await sql`SELECT count(*)::int AS h FROM ia_uso WHERE usuario_id = ${u.id} AND criado_em > now() - interval '1 hour'`;
    const [{ d }] = await sql`SELECT count(*)::int AS d FROM ia_uso WHERE usuario_id = ${u.id} AND criado_em > now() - interval '1 day'`;
    if (h >= IA_POR_HORA || d >= IA_POR_DIA) { res.status(429).json({ erro: "Você chegou ao limite de perguntas criadas pelo Jingar por agora. Tente de novo mais tarde." }); return false; }
    await sql`INSERT INTO ia_uso (usuario_id) VALUES (${u.id})`;
    return true;
  }
  if (typeof b.tema === "string") {
    const dificuldade = Object.hasOwn(DIFICULDADE_TEMA, b.dificuldade) ? b.dificuldade : "facil";
    const evitarTema = Array.isArray(b.evitar) ? b.evitar.filter(x => typeof x === "string").slice(-120).map(x => x.slice(0, 200)) : [];
    // Perguntas de um subtema valem o peso que o servidor deu ao avaliar o tema (o token prova esse peso).
    const titulo = b.tema.trim().slice(0, 60);
    const pts = u && b.pesoToken && iguais(tokenPeso(u.id, titulo, b.peso), b.pesoToken) ? pesoValido(b.peso) : 0;
    const subtema = typeof b.subtema === "string" ? b.subtema.trim().slice(0, 120) : "";
    if (titulo.length < 2) return res.status(400).json({ erro: "Digite um tema." });
    try {
      return subtema ? await parteDoTema(titulo, subtema, dificuldade, evitarTema, u, pts, usarIA, res) : await avaliarTema(titulo, dificuldade, u, usarIA, res);
    } catch (e) { return erroDaApi(e, res); }
  }

  const texto = typeof b.texto === "string" ? b.texto.slice(0, LIMITE_TEXTO) : "";
  const imagens = Array.isArray(b.imagens) ? b.imagens.filter(s => typeof s === "string" && s.length).slice(0, MAX_IMAGENS) : [];
  if (!texto.trim() && !imagens.length) return res.status(400).json({ erro: "Envie um texto ou fotos." });
  if (!(await usarIA())) return;
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
    if (resp.stop_reason === "refusal") return res.status(422).json({ erro: "O Jingar não conseguiu criar perguntas com esse conteúdo. Tente outro arquivo." });
    const txt = resp.content.filter(c => c.type === "text").map(c => c.text).join("");
    const json = extrairJson(txt);
    if (!json || !Array.isArray(json.perguntas)) return res.status(502).json({ erro: "Não consegui montar perguntas com esse arquivo. Tente de novo." });
    return res.status(200).json({ titulo: typeof json.titulo === "string" ? json.titulo : "Seu arquivo", perguntas: json.perguntas, assinaturas: assinaturas(u && u.id, mult, json.perguntas) });
  } catch (e) {
    return erroDaApi(e, res);
  }
}

// Chama o Claude para avaliar um tema ou criar as perguntas de um subtema. Devolve o JSON ou null se não deu para ler.
async function claudeTema(tema, subtema, dificuldade, evitar) {
  const params = {
    model: MODELO,
    // O modelo sempre pensa antes de responder e esse raciocínio conta no limite: com pouco espaço a resposta vinha cortada.
    max_tokens: subtema ? 16000 : 4000,
    output_config: { effort: "low" },
    messages: [{ role: "user", content: subtema ? instrucoesSubtema(tema, subtema, dificuldade, evitar) : instrucoesAvaliar(tema, dificuldade) }]
  };
  if (COM_FALLBACK.has(MODELO)) { params.betas = ["server-side-fallback-2026-07-01"]; params.fallbacks = "default"; }
  const resp = await client.beta.messages.create(params);
  if (resp.stop_reason === "refusal") return subtema ? { perguntas: [] } : { aprovado: false, motivo: "Esse tema não pode virar categoria.", sugestoes: [] };
  return extrairJson(resp.content.filter(c => c.type === "text").map(c => c.text).join(""));
}
const resumoAprovado = (u, titulo, peso, subtemas) => ({ aprovado: true, titulo, peso: pesoValido(peso), subtemas, pesoToken: u ? tokenPeso(u.id, titulo, pesoValido(peso)) : undefined });
const comPerguntas = (u, base, perguntas) => Object.assign(base, { perguntas, assinaturas: assinaturas(u && u.id, base.peso, perguntas), pronta: true });
const acharCategoria = async (n, dificuldade) => sql ? (await sql`SELECT * FROM categorias WHERE dificuldade = ${dificuldade} AND (tema_norm = ${n} OR titulo_norm = ${n}) ORDER BY id LIMIT 1`)[0] || null : null;
const partesDe = async id => Object.fromEntries((await sql`SELECT subtema, perguntas FROM categoria_partes WHERE categoria_id = ${id}`).map(p => [p.subtema, p.perguntas]));

// Avaliar um tema: primeiro as categorias prontas do app, depois as já criadas por alguém; só então o Claude.
async function avaliarTema(tema, dificuldade, u, usarIA, res) {
  const pronto = dificuldade === "facil" ? temaPronto(tema) : null;
  if (pronto) return res.status(200).json(comPerguntas(u, resumoAprovado(u, pronto.titulo, pronto.peso, pronto.subtemas), juntar([pronto.perguntas])));
  const n = normalizarTema(tema), salva = await acharCategoria(n, dificuldade);
  if (salva) {
    await sql`UPDATE categorias SET usos = usos + 1 WHERE id = ${salva.id}`;
    if (!salva.aprovado) return res.status(200).json({ aprovado: false, motivo: salva.motivo, sugestoes: salva.sugestoes || [] });
    const base = resumoAprovado(u, salva.titulo, salva.peso, salva.subtemas || []);
    const perguntas = juntar(Object.values(await partesDe(salva.id)));
    return res.status(200).json(perguntas.length >= MIN_PERGUNTAS ? comPerguntas(u, base, perguntas) : base);
  }
  if (!(await usarIA())) return;
  const json = await claudeTema(tema, "", dificuldade, []);
  if (!json) return res.status(502).json({ erro: "O Jingar não conseguiu montar as perguntas agora. Tente de novo." });
  const titulo = typeof json.titulo === "string" && json.titulo.trim() ? json.titulo.trim().slice(0, 40) : tema;
  const subtemas = (Array.isArray(json.subtemas) ? json.subtemas : []).filter(x => typeof x === "string" && x.trim()).slice(0, 3).map(x => x.trim().slice(0, 120));
  if (sql) await sql`INSERT INTO categorias (tema_norm, dificuldade, tema, titulo, titulo_norm, aprovado, motivo, sugestoes, peso, subtemas, criador_id)
    VALUES (${n}, ${dificuldade}, ${tema}, ${titulo}, ${normalizarTema(titulo)}, ${!!json.aprovado}, ${json.motivo || null}, ${JSON.stringify(json.sugestoes || [])}, ${pesoValido(json.peso)}, ${JSON.stringify(subtemas)}, ${u ? u.id : null})
    ON CONFLICT (tema_norm, dificuldade) DO NOTHING`;
  if (!json.aprovado) return res.status(200).json(json);
  return res.status(200).json(Object.assign(json, resumoAprovado(u, titulo, json.peso, subtemas)));
}
// Perguntas de um subtema: se alguém já criou esta parte, vem pronta; senão o Claude cria e ela fica guardada.
// "Renovar" (com perguntas a evitar) sempre cria perguntas novas e não mexe no que está guardado.
async function parteDoTema(titulo, subtema, dificuldade, evitar, u, pts, usarIA, res) {
  const salva = !evitar.length ? await acharCategoria(normalizarTema(titulo), dificuldade) : null;
  const guardada = salva && (await partesDe(salva.id))[subtema];
  if (Array.isArray(guardada) && guardada.length) return res.status(200).json({ perguntas: guardada, assinaturas: assinaturas(u && u.id, pts, guardada) });
  if (!(await usarIA())) return;
  const json = await claudeTema(titulo, subtema, dificuldade, evitar);
  if (!json) return res.status(502).json({ erro: "O Jingar não conseguiu montar as perguntas agora. Tente de novo." });
  const perguntas = juntar([Array.isArray(json.perguntas) ? json.perguntas : []]);
  if (salva && perguntas.length) await sql`INSERT INTO categoria_partes (categoria_id, subtema, perguntas) VALUES (${salva.id}, ${subtema}, ${JSON.stringify(perguntas)})
    ON CONFLICT (categoria_id, subtema) DO UPDATE SET perguntas = EXCLUDED.perguntas`;
  return res.status(200).json({ perguntas, assinaturas: assinaturas(u && u.id, pts, perguntas) });
}

function erroDaApi(e, res) {
  if (e instanceof Anthropic.RateLimitError) return res.status(429).json({ erro: "Muitos pedidos agora. Tente de novo em alguns minutos." });
  if (e instanceof Anthropic.AuthenticationError) return res.status(500).json({ erro: "A chave da API do servidor está inválida." });
  if (e instanceof Anthropic.BadRequestError) return res.status(400).json({ erro: "O arquivo não pôde ser processado. Tente um trecho menor ou outro formato." });
  if (e instanceof Anthropic.APIError) return res.status(502).json({ erro: "O Jingar não conseguiu criar as perguntas agora. Tente de novo." });
  return res.status(500).json({ erro: "Erro no servidor." });
}

