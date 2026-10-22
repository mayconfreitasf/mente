// Entrega fotos e áudios guardados no banco. O acesso é pela assinatura do endereço, que o servidor só entrega
// a quem pode ver: fotos a quem tem conta, áudios a quem está na conversa.
import crypto from "node:crypto";
import { sql, prepararBanco } from "./_banco.js";
import { cors } from "./_sessao.js";
import { assinaturaMidia } from "./_perfil.js";

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== "GET") return res.status(405).end();
  if (!sql) return res.status(503).end();
  const id = String(req.query && req.query.id || ""), s = String(req.query && req.query.s || "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return res.status(400).end();
  const esperado = Buffer.from(assinaturaMidia(id)), recebido = Buffer.from(s);
  if (esperado.length !== recebido.length || !crypto.timingSafeEqual(esperado, recebido)) return res.status(403).end();
  try {
    await prepararBanco();
    const [m] = await sql`SELECT mime, dados FROM midias WHERE id = ${id}`;
    if (!m) return res.status(404).end();
    res.setHeader("Content-Type", m.mime);
    res.setHeader("Cache-Control", "private, max-age=86400");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.status(200).send(Buffer.from(m.dados, "base64"));
  } catch (e) {
    console.error(e);
    return res.status(500).end();
  }
}
