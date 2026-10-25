// Entrega fotos e áudios guardados no banco. O acesso é pela assinatura do endereço, que o servidor só entrega
// a quem pode ver: fotos a quem tem conta, áudios a quem está na conversa.
import crypto from "node:crypto";
import { sql, prepararBanco } from "./_banco.js";
import { cors } from "./_sessao.js";
import { assinaturaMidia } from "./_perfil.js";
import { get } from "@vercel/blob";

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== "GET") return res.status(405).end();
  if (!sql) return res.status(503).end();
  const id = String(req.query && req.query.id || ""), s = String(req.query && req.query.s || "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return res.status(400).end();
  try {
    await prepararBanco();
    const esperado = Buffer.from(assinaturaMidia(id)), recebido = Buffer.from(s);
    if (esperado.length !== recebido.length || !crypto.timingSafeEqual(esperado, recebido)) return res.status(403).end();
    const [m] = await sql`SELECT mime, dados, url FROM midias WHERE id = ${id}`;
    if (!m) return res.status(404).end();
    // Arquivo no Vercel Blob (privado): o servidor busca e repassa. Os antigos ainda vêm do banco.
    let corpo;
    if (m.url) {
      const r = await get(m.url, { access: "private" });
      if (!r || !r.stream) return res.status(404).end();
      corpo = Buffer.from(await new Response(r.stream).arrayBuffer());
    } else corpo = Buffer.from(m.dados, "base64");
    res.setHeader("Content-Type", m.mime);
    res.setHeader("Cache-Control", "private, max-age=86400");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.status(200).send(corpo);
  } catch (e) {
    console.error(e);
    return res.status(500).end();
  }
}
