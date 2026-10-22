// Sessão por cookie, usada pelas funções de conta, pessoas e mídias.
import { sql } from "./_banco.js";
import { hashToken } from "./_auth.js";

export const COOKIE = "mente_sessao";
export const lerCookie = req => { const m = (req.headers.cookie || "").match(/(?:^|;\s*)mente_sessao=([A-Za-z0-9_-]+)/); return m ? m[1] : null; };
export const gravarCookie = (res, valor, segundos) => res.setHeader("Set-Cookie", `${COOKIE}=${valor}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${segundos}`);

export async function usuarioDaSessao(req) {
  const t = lerCookie(req);
  if (!t) return null;
  const r = await sql`SELECT u.* FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id WHERE s.token_hash = ${hashToken(t)} AND s.expira_em > now()`;
  return r[0] || null;
}

// Erro com status HTTP, devolvido como { erro } pelos handlers.
export const falha = (status, erro, extra) => Object.assign(new Error(erro), { status, erro, extra });
