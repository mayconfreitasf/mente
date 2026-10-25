// Desafios por link curto: quem termina um quiz cria um código (jingar.com.br/Ab3x) com as mesmas perguntas.
// Qualquer pessoa com o link joga, com ou sem conta, e entra no ranking daquele desafio. Pode jogar de novo: vale a melhor tentativa.
// Desafio mandado num match: cada tentativa de um dos dois aparece na conversa com o placar.
import crypto from "node:crypto";
import { sql, prepararBanco } from "./_banco.js";
import { usuarioDaSessao, falha, cors, ipHash } from "./_sessao.js";
import { avisar } from "./_push.js";
import { nomeLimpo } from "./_filtro.js";

const LETRAS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const CODIGO_OK = /^[A-Za-z0-9]{4,6}$/, JOGADOR_OK = /^[A-Za-z0-9_-]{16,40}$/;
const MAX_PERGUNTAS = 40, MAX_POR_HORA = 30, TOP = 20;
const curto = (x, n) => typeof x === "string" ? x.replace(/\s+/g, " ").trim().slice(0, n) : "";
const inteiro = (x, min, max) => Math.min(max, Math.max(min, Math.round(Number(x) || 0)));
// Códigos sem letras parecidas (0/O, 1/l/I): 4 caracteres e, se o código sorteado já existir, um a mais.
const sortear = n => Array.from(crypto.randomBytes(n), b => LETRAS[b % LETRAS.length]).join("");

// Confere o que o app mandou: referências ao banco de perguntas ([assunto, índice]) ou, no quiz do arquivo,
// as perguntas por extenso ([pergunta, certa, errada, errada]).
function validar(d) {
  if (!d || typeof d !== "object" || !Array.isArray(d.q)) return null;
  const f = curto(d.f, 40);
  const q = d.q.slice(0, MAX_PERGUNTAS).filter(x => Array.isArray(x) && (f
    ? x.length === 4 && x.every(t => typeof t === "string" && t.trim() && t.length <= 200)
    : x.length === 2 && typeof x[0] === "string" && /^[a-z0-9_-]{1,40}$/i.test(x[0]) && Number.isInteger(x[1]) && x[1] >= 0 && x[1] < 100000));
  if (!q.length) return null;
  const t = inteiro(d.t, 0, q.length);
  const out = { n: curto(d.n, 30) || "Alguém", m: [1, 2, 3].includes(d.m) ? d.m : 1, a: inteiro(d.a, 0, t), t, q };
  if (f) out.f = f;
  if (typeof d.p === "number" && Number.isFinite(d.p)) out.p = Math.min(3, Math.max(0.1, Math.round(d.p * 10) / 10));
  return out;
}

// Ranking: mais acertos primeiro; no empate, quem respondeu antes.
const ranking = codigo => sql`SELECT jogador, nome, acertos, total FROM desafio_respostas WHERE codigo = ${codigo} ORDER BY acertos DESC, criado_em ASC, id ASC`;
const publico = (linhas, jogador) => ({
  ranking: linhas.slice(0, TOP).map((r, i) => ({ pos: i + 1, nome: r.nome, acertos: r.acertos, total: r.total, voce: r.jogador === jogador })),
  jogadores: linhas.length,
  posicao: jogador ? (linhas.findIndex(r => r.jogador === jogador) + 1) || null : null
});

// Resultado na conversa do match: "Respondi o desafio: fiz 4 de 5. Placar: Ana 4 × 3 Bruno." com o link, que abre o ranking.
async function contarNaConversa(desafio, u, nome, acertos, total, refez, req) {
  const [m] = await sql`SELECT id, a_id, b_id FROM matches WHERE id = ${desafio.match_id} AND (a_id = ${u.id} OR b_id = ${u.id})`;
  if (!m) return;
  const outro = m.a_id === u.id ? m.b_id : m.a_id;
  const [eu] = await sql`SELECT acertos FROM desafio_respostas WHERE codigo = ${desafio.codigo} AND usuario_id = ${u.id}`;
  const [ele] = await sql`SELECT nome, acertos FROM desafio_respostas WHERE codigo = ${desafio.codigo} AND usuario_id = ${outro}`;
  const placar = ele ? ` Placar: ${nome} ${eu ? eu.acertos : acertos} × ${ele.acertos} ${ele.nome}.` : "";
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "jingar.com.br").replace(/[^A-Za-z0-9.:-]/g, "");
  const origem = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ? "http://" + host : "https://jingar.com.br";
  const texto = `${refez ? "Refiz" : "Respondi"} o desafio: fiz ${acertos} de ${total}.${placar} ${origem}/${desafio.codigo}`;
  await sql`INSERT INTO mensagens (match_id, de_id, texto) VALUES (${m.id}, ${u.id}, ${texto})`;
  await avisar(outro, `${nome} ${refez ? "refez o" : "respondeu seu"} desafio`, `Fez ${acertos} de ${total}.${placar}`, { tipo: "desafio", match: String(m.id) });
}

export default async function handler(req, res) {
  if (cors(req, res)) return;
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST." });
  if (!sql) return res.status(503).json({ erro: "Servidor sem banco configurado." });
  const b = req.body || {};
  try {
    await prepararBanco();
    const u = await usuarioDaSessao(req);
    if (u && u.banido) throw falha(403, "Esta conta foi suspensa por violar os Termos de Uso.");
    // Com conta, o jogador é a conta; sem conta, um identificador aleatório guardado no aparelho.
    const jogador = u ? "u:" + u.id : JOGADOR_OK.test(b.jogador || "") ? "a:" + b.jogador : null;
    let nomeConta = null;
    if (u) { const [p] = await sql`SELECT nome FROM perfis WHERE usuario_id = ${u.id}`; nomeConta = p && p.nome; }

    if (b.acao === "criar") {
      const d = validar(b.desafio);
      if (!d) throw falha(400, "Desafio inválido.");
      if (!jogador) throw falha(400, "Aparelho não identificado.");
      d.n = nomeLimpo(nomeConta || d.n) || "Alguém";
      const ip = ipHash(req);
      const [{ n }] = await sql`SELECT count(*)::int AS n FROM desafios WHERE ip_hash = ${ip} AND criado_em > now() - interval '1 hour'`;
      if (n >= MAX_POR_HORA) throw falha(429, "Muitos desafios criados. Tente de novo mais tarde.");
      // Mandado pelo chat: guarda o match (só se quem cria faz parte dele).
      const [m] = u && b.match ? await sql`SELECT id FROM matches WHERE id = ${Number(b.match) || 0} AND (a_id = ${u.id} OR b_id = ${u.id})` : [];
      let codigo = null;
      for (let i = 0; i < 8 && !codigo; i++) {
        const c = sortear(i < 4 ? 4 : 5);
        const r = await sql`INSERT INTO desafios (codigo, criador_id, dados, ip_hash, match_id) VALUES (${c}, ${u ? u.id : null}, ${JSON.stringify(d)}, ${ip}, ${m ? m.id : null}) ON CONFLICT (codigo) DO NOTHING RETURNING codigo`;
        if (r.length) codigo = c;
      }
      if (!codigo) throw falha(503, "Não foi possível criar o desafio. Tente de novo.");
      // Quem criou entra no ranking com o placar que teve.
      await sql`INSERT INTO desafio_respostas (codigo, jogador, usuario_id, nome, acertos, total) VALUES (${codigo}, ${jogador}, ${u ? u.id : null}, ${d.n}, ${d.a}, ${d.t}) ON CONFLICT (codigo, jogador) DO NOTHING`;
      return res.status(200).json({ codigo });
    }

    if (!CODIGO_OK.test(b.codigo || "")) throw falha(400, "Link de desafio inválido.");
    const [desafio] = await sql`SELECT codigo, dados, criador_id, match_id FROM desafios WHERE codigo = ${b.codigo}`;
    if (!desafio) throw falha(404, "Esse desafio não existe ou foi removido.");

    if (b.acao === "abrir") {
      const linhas = await ranking(desafio.codigo);
      const meu = jogador ? linhas.find(r => r.jogador === jogador) : null;
      return res.status(200).json({ desafio: desafio.dados, jaRespondeu: !!meu, souCriador: !!u && String(desafio.criador_id) === String(u.id), ...publico(linhas, jogador) });
    }

    if (b.acao === "responder") {
      if (!jogador) throw falha(400, "Aparelho não identificado.");
      const total = inteiro(b.total, 0, desafio.dados.q.length), acertos = inteiro(b.acertos, 0, total);
      const nome = nomeLimpo(nomeConta || b.nome) || "Anônimo";
      // Cada pessoa pode jogar de novo: no ranking fica a melhor tentativa.
      const [antes] = await sql`SELECT acertos FROM desafio_respostas WHERE codigo = ${desafio.codigo} AND jogador = ${jogador}`;
      if (!antes) await sql`INSERT INTO desafio_respostas (codigo, jogador, usuario_id, nome, acertos, total) VALUES (${desafio.codigo}, ${jogador}, ${u ? u.id : null}, ${nome}, ${acertos}, ${total}) ON CONFLICT (codigo, jogador) DO NOTHING`;
      else if (acertos > antes.acertos) await sql`UPDATE desafio_respostas SET acertos = ${acertos}, total = ${total}, nome = ${nome}, criado_em = now() WHERE codigo = ${desafio.codigo} AND jogador = ${jogador}`;
      if (u && desafio.match_id && total) await contarNaConversa(desafio, u, nome, acertos, total, !!antes, req);
      return res.status(200).json(publico(await ranking(desafio.codigo), jogador));
    }

    throw falha(400, "Ação inválida.");
  } catch (e) {
    if (e && e.status) return res.status(e.status).json({ erro: e.erro });
    console.error(e);
    return res.status(500).json({ erro: "Erro no servidor. Tente de novo." });
  }
}
