// Função de servidor (Vercel) que cria as perguntas do "Quiz do seu arquivo".
// Usa a chave ANTHROPIC_API_KEY configurada no projeto da Vercel; ela nunca vai para o navegador.
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const MODELO = process.env.MODELO || "claude-opus-5-5";
// Modelos que aceitam o parâmetro "fallbacks" (outro modelo assume se este recusar o pedido).
const COM_FALLBACK = new Set(["claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5", "claude-fable-5-1"]);
const LIMITE_TEXTO = 40000;
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

// Lê o JSON da resposta: o texto inteiro, um bloco ```json``` ou o trecho entre a primeira { e a última }.
function extrairJson(txt) {
  const tentativas = [txt, (txt.match(/```(?:json)?\s*([\s\S]*?)```/) || [])[1], txt.slice(txt.indexOf("{"), txt.lastIndexOf("}") + 1)];
  for (const t of tentativas) { if (!t) continue; try { return JSON.parse(t); } catch {} }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST." });
  const b = req.body || {};

  const codigo = process.env.CODIGO_ACESSO;
  if (codigo && b.codigo !== codigo) return res.status(401).json({ erro: "Código de acesso inválido." });

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
    if (e instanceof Anthropic.RateLimitError) return res.status(429).json({ erro: "Muitos pedidos agora. Tente de novo em alguns minutos." });
    if (e instanceof Anthropic.AuthenticationError) return res.status(500).json({ erro: "A chave da API do servidor está inválida." });
    if (e instanceof Anthropic.BadRequestError) return res.status(400).json({ erro: "O arquivo não pôde ser processado. Tente um trecho menor ou outro formato." });
    if (e instanceof Anthropic.APIError) return res.status(502).json({ erro: "O serviço do Claude falhou. Tente de novo." });
    return res.status(500).json({ erro: "Erro no servidor." });
  }
}
