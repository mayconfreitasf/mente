// Entrega fotos e áudios guardados no banco. Fotos: qualquer pessoa com conta. Áudios: só quem está na conversa.
import { sql, prepararBanco } from "./_banco.js";
import { usuarioDaSessao } from "./_sessao.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  if (!sql) return res.status(503).end();
  const id = String(req.query && req.query.id || "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return res.status(400).end();
  try {
    await prepararBanco();
    const u = await usuarioDaSessao(req);
    if (!u || u.banido) return res.status(401).end();
    const [m] = await sql`SELECT * FROM midias WHERE id = ${id}`;
    if (!m) return res.status(404).end();
    if (m.tipo === "audio" && m.dono_id !== u.id) {
      const [ok] = await sql`SELECT 1 FROM mensagens x JOIN matches c ON c.id = x.match_id
        WHERE x.midia_id = ${id} AND (c.a_id = ${u.id} OR c.b_id = ${u.id}) LIMIT 1`;
      if (!ok) return res.status(403).end();
    }
    res.setHeader("Content-Type", m.mime);
    res.setHeader("Cache-Control", "private, max-age=86400");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.status(200).send(Buffer.from(m.dados, "base64"));
  } catch (e) {
    console.error(e);
    return res.status(500).end();
  }
}
