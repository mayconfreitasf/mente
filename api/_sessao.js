// Sessão das funções de conta, pessoas e quiz. No site vale o cookie; no app (iPhone e Android), um token
// enviado no cabeçalho Authorization, porque o app roda em outra origem e não recebe cookies do servidor.
import { sql } from "./_banco.js";
import { hashToken } from "./_auth.js";

export const COOKIE = "mente_sessao";
const lerCookie = req => { const m = (req.headers.cookie || "").match(/(?:^|;\s*)mente_sessao=([A-Za-z0-9_-]+)/); return m ? m[1] : null; };
export function lerToken(req) {
  const m = String(req.headers.authorization || "").match(/^Bearer\s+([A-Za-z0-9_-]{20,})$/);
  return m ? m[1] : lerCookie(req);
}
export const gravarCookie = (res, valor, segundos) => res.setHeader("Set-Cookie", `${COOKIE}=${valor}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${segundos}`);

export async function usuarioDaSessao(req) {
  const t = lerToken(req);
  if (!t) return null;
  const r = await sql`SELECT u.* FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id WHERE s.token_hash = ${hashToken(t)} AND s.expira_em > now()`;
  return r[0] || null;
}

// Origens do app nativo: Capacitor no iPhone (capacitor://localhost) e no Android (https://localhost).
const ORIGENS_APP = new Set(["capacitor://localhost", "https://localhost", "http://localhost", "ionic://localhost",
  // CORS_EXTRA: origens a mais separadas por vírgula, para testes locais (ex.: http://localhost:5173).
  ...String(process.env.CORS_EXTRA || "").split(",").map(x => x.trim()).filter(Boolean)]);
// Libera o app nativo a chamar o servidor. Devolve true quando a requisição era só a checagem prévia (OPTIONS).
export function cors(req, res) {
  const origem = req.headers.origin;
  if (origem && ORIGENS_APP.has(origem)) {
    res.setHeader("Access-Control-Allow-Origin", origem);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Jingar-App");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Max-Age", "86400");
  }
  if (req.method === "OPTIONS") { res.status(204).end(); return true; }
  return false;
}

// Erro com status HTTP, devolvido como { erro } pelos handlers.
export const falha = (status, erro, extra) => Object.assign(new Error(erro), { status, erro, extra });
