// Moderação: lista as denúncias abertas e permite resolver ou banir. Acesso só com ADMIN_TOKEN (Authorization: Bearer).
import crypto from "node:crypto";
import { sql, prepararBanco } from "./_banco.js";

function autorizado(req) {
  const admin = process.env.ADMIN_TOKEN || "";
  const recebido = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (admin.length < 16 || !recebido) return false;
  const a = Buffer.from(admin), r = Buffer.from(recebido);
  return a.length === r.length && crypto.timingSafeEqual(a, r);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!sql) return res.status(503).json({ erro: "Banco não configurado." });
  if (!process.env.ADMIN_TOKEN || process.env.ADMIN_TOKEN.length < 16) return res.status(503).json({ erro: "Configure ADMIN_TOKEN (16 caracteres ou mais) na Vercel." });
  if (!autorizado(req)) return res.status(401).json({ erro: "Token inválido." });
  try {
    await prepararBanco();
    if (req.method === "GET") {
      const denuncias = await sql`SELECT d.id, d.alvo, d.motivo, d.texto, d.status, d.criado_em,
          u.usuario AS denunciante, a.usuario AS alvo_usuario, a.banido AS alvo_banido
        FROM denuncias d
        LEFT JOIN usuarios u ON u.id = d.denunciante_id
        LEFT JOIN usuarios a ON a.id::text = d.alvo
        WHERE d.status = 'aberta' ORDER BY d.criado_em LIMIT 200`;
      return res.status(200).json({ denuncias });
    }
    if (req.method === "POST") {
      const b = req.body || {};
      const [d] = await sql`SELECT * FROM denuncias WHERE id = ${Number(b.id) || 0}`;
      if (!d) return res.status(404).json({ erro: "Denúncia não encontrada." });
      if (b.acao === "banir") {
        const [a] = await sql`UPDATE usuarios SET banido = true WHERE id::text = ${d.alvo} RETURNING id`;
        if (!a) return res.status(400).json({ erro: "Esse perfil não é de um usuário real." });
        await sql`DELETE FROM sessoes WHERE usuario_id = ${a.id}`;
        await sql`UPDATE denuncias SET status = 'banido', resolvido_em = now() WHERE alvo = ${d.alvo} AND status = 'aberta'`;
        return res.status(200).json({ ok: true });
      }
      if (b.acao === "resolver") {
        await sql`UPDATE denuncias SET status = 'resolvida', resolvido_em = now() WHERE id = ${d.id}`;
        return res.status(200).json({ ok: true });
      }
      return res.status(400).json({ erro: "Ação inválida." });
    }
    return res.status(405).json({ erro: "Método não permitido." });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: "Erro no servidor." });
  }
}
