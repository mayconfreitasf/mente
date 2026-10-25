// Assinaturas das perguntas criadas pela IA. O servidor assina cada pergunta com a resposta certa e os pontos;
// quando a pessoa responde, a assinatura só confere se a resposta escolhida for a certa. Ninguém consegue forjar pontos.
import crypto from "node:crypto";

const SEGREDO = process.env.MIDIA_SEGREDO || crypto.createHash("sha256").update("jingar-pontos:" + (process.env.DATABASE_URL || process.env.POSTGRES_URL || "")).digest("hex");
const hmac = txt => crypto.createHmac("sha256", SEGREDO).update(txt).digest("base64url").slice(0, 32);
const limpa = x => String(x || "").trim().slice(0, 200);
export const pesoValido = p => Math.min(3, Math.max(0.1, Math.round((Number(p) || 1) * 10) / 10));
export const assinarPergunta = (uid, pts, pergunta, resposta) => hmac(["q", uid, pts, limpa(pergunta), limpa(resposta)].join("\n"));
// O peso de uma categoria é decidido pelo servidor ao avaliar o tema; o app recebe um token que prova esse peso.
export const tokenPeso = (uid, titulo, peso) => hmac(["p", uid, limpa(titulo).toLowerCase(), pesoValido(peso)].join("\n"));
export const iguais = (a, b) => { const x = Buffer.from(String(a || "")), y = Buffer.from(String(b || "")); return x.length === y.length && crypto.timingSafeEqual(x, y); };
