// Confere cada foto de perfil com o Claude: precisa mostrar uma pessoa real e não pode ter nudez ou conteúdo impróprio.
import Anthropic from "@anthropic-ai/sdk";
import { falha } from "./_sessao.js";

const client = new Anthropic();
// Conferir uma foto é uma tarefa simples: usa o modelo menor e mais barato (MODELO_FOTO troca na Vercel, se preciso).
const MODELO = process.env.MODELO_FOTO || "claude-haiku-5-5";
const PEDIDO = `Esta é uma foto de perfil de um app de relacionamento para adultos. Avalie só a imagem e responda:
- pessoa: true se há pelo menos uma pessoa real (foto de verdade, não desenho, ilustração, boneco ou print) com o rosto ou o corpo claramente visível; false para paisagens, objetos, animais, textos, memes ou imagens sem pessoa.
- impropria: true se há nudez, conteúdo sexual, violência explícita, armas apontadas, drogas, ou se a pessoa parece menor de 18 anos.`;
const FORMATO = {
  type: "json_schema",
  schema: {
    type: "object",
    properties: { pessoa: { type: "boolean" }, impropria: { type: "boolean" } },
    required: ["pessoa", "impropria"],
    additionalProperties: false
  }
};

// Recebe a foto em base64 (sem o prefixo data:) e lança um erro com a mensagem para o usuário quando ela não serve.
export async function conferirFoto(base64, mime) {
  const params = {
    model: MODELO,
    max_tokens: 2000,
    output_config: { effort: "low", format: FORMATO },
    messages: [{ role: "user", content: [
      { type: "image", source: { type: "base64", media_type: mime, data: base64 } },
      { type: "text", text: PEDIDO }
    ] }]
  };
  let resp;
  try { resp = await client.messages.create(params); }
  catch (e) {
    if (e instanceof Anthropic.RateLimitError) throw falha(429, "Muitas fotos sendo verificadas agora. Tente de novo em alguns minutos.");
    if (e instanceof Anthropic.BadRequestError) throw falha(400, "Não consegui abrir essa foto. Tente outra.");
    throw falha(503, "Não foi possível verificar a foto agora. Tente de novo.");
  }
  if (resp.stop_reason === "refusal") throw falha(400, "Essa foto não pode ser usada. Escolha outra.");
  let r = null;
  try { r = JSON.parse(resp.content.filter(c => c.type === "text").map(c => c.text).join("")); } catch {}
  if (!r) throw falha(503, "Não foi possível verificar a foto agora. Tente de novo.");
  if (r.impropria) throw falha(400, "Essa foto não segue as regras do Jingar. Escolha outra.");
  if (!r.pessoa) throw falha(400, "Não encontramos uma pessoa nesta foto. Use uma foto em que você apareça.");
}
