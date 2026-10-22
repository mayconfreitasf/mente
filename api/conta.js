// Contas do Mente: cadastro com usuário, e-mail e senha, login com Google ou Apple, sessão por cookie e progresso salvo.
// Precisa de um banco Postgres (DATABASE_URL ou POSTGRES_URL, por exemplo Neon pela Vercel).
// Opcionais: GOOGLE_CLIENT_ID, APPLE_CLIENT_ID, RESEND_API_KEY + EMAIL_REMETENTE (recuperar senha) e APP_URL.
import { neon } from "@neondatabase/serverless";
import { hashSenha, confereSenha, novoToken, hashToken, usuarioValido, emailValido, senhaValida, verificaTokenProvedor } from "./_auth.js";

const URL_BANCO = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const sql = URL_BANCO ? neon(URL_BANCO) : null;
const COOKIE = "mente_sessao", DIAS_SESSAO = 30, MAX_ESTADO = 1500000, MAX_FALHAS = 5;
// Hash de uma senha qualquer: comparar com ele quando o usuário não existe deixa o tempo de resposta igual.
const HASH_FALSO = hashSenha(novoToken());

let pronto = null;
function prepararBanco() {
  if (!pronto) pronto = (async () => {
    await sql`CREATE TABLE IF NOT EXISTS usuarios (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      usuario text UNIQUE, email text UNIQUE, senha_hash text,
      google_sub text UNIQUE, apple_sub text UNIQUE,
      estado jsonb, falhas int NOT NULL DEFAULT 0, bloqueado_ate timestamptz,
      criado_em timestamptz NOT NULL DEFAULT now())`;
    await sql`CREATE TABLE IF NOT EXISTS sessoes (
      token_hash text PRIMARY KEY, usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, expira_em timestamptz NOT NULL)`;
    await sql`CREATE TABLE IF NOT EXISTS recuperacoes (
      token_hash text PRIMARY KEY, usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, expira_em timestamptz NOT NULL)`;
  })().catch(e => { pronto = null; throw e; });
  return pronto;
}

const lerCookie = req => { const m = (req.headers.cookie || "").match(/(?:^|;\s*)mente_sessao=([A-Za-z0-9_-]+)/); return m ? m[1] : null; };
const gravarCookie = (res, valor, segundos) => res.setHeader("Set-Cookie", `${COOKIE}=${valor}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${segundos}`);
const publico = u => ({ usuario: u.usuario, email: u.email, temSenha: !!u.senha_hash, google: !!u.google_sub, apple: !!u.apple_sub });
const texto = (x, max) => typeof x === "string" ? x.trim().toLowerCase().slice(0, max) : "";

async function criarSessao(res, id) {
  const t = novoToken();
  await sql`INSERT INTO sessoes (token_hash, usuario_id, expira_em) VALUES (${hashToken(t)}, ${id}, now() + make_interval(days => ${DIAS_SESSAO}))`;
  gravarCookie(res, t, DIAS_SESSAO * 86400);
}
async function usuarioDaSessao(req) {
  const t = lerCookie(req);
  if (!t) return null;
  const r = await sql`SELECT u.* FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id WHERE s.token_hash = ${hashToken(t)} AND s.expira_em > now()`;
  return r[0] || null;
}
// Progresso enviado pelo app no cadastro: só objetos e até o tamanho máximo.
function estadoAceito(e) {
  if (!e || typeof e !== "object" || Array.isArray(e)) return null;
  const json = JSON.stringify(e);
  return json.length <= MAX_ESTADO ? json : null;
}
function mensagemDuplicado(e) {
  const c = String(e.constraint || e.detail || "");
  if (c.includes("email")) return "Esse e-mail já está em uso.";
  if (c.includes("usuario")) return "Esse nome de usuário já existe.";
  return "Já existe uma conta com esses dados.";
}
const ERRO_LOGIN = "Usuário ou senha incorretos.";

async function cadastrar(b, res) {
  const usuario = texto(b.usuario, 40), email = texto(b.email, 200);
  if (!usuarioValido(usuario)) return res.status(400).json({ erro: "O usuário precisa ter de 4 a 15 letras minúsculas, sem números nem símbolos." });
  if (!emailValido(email)) return res.status(400).json({ erro: "Digite um e-mail válido." });
  if (!senhaValida(b.senha)) return res.status(400).json({ erro: "A senha precisa ter pelo menos 6 caracteres, com letra, número e símbolo." });
  const [u] = await sql`INSERT INTO usuarios (usuario, email, senha_hash, estado) VALUES (${usuario}, ${email}, ${hashSenha(b.senha)}, ${estadoAceito(b.estado)}::jsonb) RETURNING *`;
  await criarSessao(res, u.id);
  return res.status(200).json({ conta: publico(u), estado: u.estado });
}

async function entrar(b, res) {
  const login = texto(b.login, 200), senha = typeof b.senha === "string" ? b.senha.slice(0, 128) : "";
  const [u] = login ? await sql`SELECT * FROM usuarios WHERE usuario = ${login} OR email = ${login} LIMIT 1` : [];
  if (!u || !u.senha_hash) { confereSenha(senha, HASH_FALSO); return res.status(401).json({ erro: ERRO_LOGIN }); }
  if (u.bloqueado_ate && new Date(u.bloqueado_ate) > new Date()) return res.status(429).json({ erro: "Muitas tentativas erradas. Tente de novo em 15 minutos." });
  if (!confereSenha(senha, u.senha_hash)) {
    await sql`UPDATE usuarios SET
      bloqueado_ate = CASE WHEN falhas + 1 >= ${MAX_FALHAS} THEN now() + interval '15 minutes' ELSE bloqueado_ate END,
      falhas = CASE WHEN falhas + 1 >= ${MAX_FALHAS} THEN 0 ELSE falhas + 1 END
      WHERE id = ${u.id}`;
    return res.status(401).json({ erro: ERRO_LOGIN });
  }
  await sql`UPDATE usuarios SET falhas = 0, bloqueado_ate = NULL WHERE id = ${u.id}`;
  await criarSessao(res, u.id);
  return res.status(200).json({ conta: publico(u), estado: u.estado });
}

// Google e Apple: a conta é achada pelo identificador do provedor. Não liga com contas de senha pelo e-mail,
// porque o e-mail do cadastro não é confirmado e alguém poderia ter cadastrado o e-mail de outra pessoa.
async function social(b, res) {
  const provedor = b.provedor === "apple" ? "apple" : b.provedor === "google" ? "google" : null;
  const aud = provedor === "apple" ? process.env.APPLE_CLIENT_ID : process.env.GOOGLE_CLIENT_ID;
  if (!provedor || !aud) return res.status(400).json({ erro: "Login social não configurado." });
  const dados = await verificaTokenProvedor(provedor, b.token, aud);
  if (!dados) return res.status(401).json({ erro: `Não foi possível confirmar sua conta ${provedor === "apple" ? "Apple" : "Google"}.` });
  let [u] = provedor === "apple" ? await sql`SELECT * FROM usuarios WHERE apple_sub = ${dados.sub}` : await sql`SELECT * FROM usuarios WHERE google_sub = ${dados.sub}`;
  if (!u) {
    const [usado] = dados.email ? await sql`SELECT 1 FROM usuarios WHERE email = ${dados.email}` : [];
    const email = usado ? null : dados.email, estado = estadoAceito(b.estado);
    [u] = provedor === "apple"
      ? await sql`INSERT INTO usuarios (email, apple_sub, estado) VALUES (${email}, ${dados.sub}, ${estado}::jsonb) RETURNING *`
      : await sql`INSERT INTO usuarios (email, google_sub, estado) VALUES (${email}, ${dados.sub}, ${estado}::jsonb) RETURNING *`;
  }
  await criarSessao(res, u.id);
  return res.status(200).json({ conta: publico(u), estado: u.estado });
}

async function recuperar(b, req, res) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_REMETENTE) return res.status(501).json({ erro: "A recuperação de senha ainda não está configurada." });
  const email = texto(b.email, 200);
  const [u] = emailValido(email) ? await sql`SELECT id, email FROM usuarios WHERE email = ${email} AND senha_hash IS NOT NULL` : [];
  // A resposta é a mesma exista ou não a conta, para não revelar quais e-mails estão cadastrados.
  if (u) {
    const t = novoToken();
    await sql`INSERT INTO recuperacoes (token_hash, usuario_id, expira_em) VALUES (${hashToken(t)}, ${u.id}, now() + interval '1 hour')`;
    const base = process.env.APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL : "https://" + req.headers.host);
    const link = `${base.replace(/\/$/, "")}/#redefinir=${t}`;
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_REMETENTE, to: u.email, subject: "Redefinir sua senha do Mente",
        html: `<p>Recebemos um pedido para redefinir a senha da sua conta no Mente.</p><p><a href="${link}">Criar uma nova senha</a></p><p>O link vale por 1 hora. Se não foi você, ignore este e-mail.</p>`
      })
    });
  }
  return res.status(200).json({ ok: true });
}

async function redefinir(b, res) {
  if (!senhaValida(b.senha)) return res.status(400).json({ erro: "A senha precisa ter pelo menos 6 caracteres, com letra, número e símbolo." });
  const [r] = typeof b.token === "string" ? await sql`SELECT usuario_id FROM recuperacoes WHERE token_hash = ${hashToken(b.token)} AND expira_em > now()` : [];
  if (!r) return res.status(400).json({ erro: "Esse link expirou ou já foi usado. Peça outro." });
  const [u] = await sql`UPDATE usuarios SET senha_hash = ${hashSenha(b.senha)}, falhas = 0, bloqueado_ate = NULL WHERE id = ${r.usuario_id} RETURNING *`;
  await sql`DELETE FROM recuperacoes WHERE usuario_id = ${u.id}`;
  await sql`DELETE FROM sessoes WHERE usuario_id = ${u.id}`;
  await criarSessao(res, u.id);
  return res.status(200).json({ conta: publico(u), estado: u.estado });
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST." });
  const b = req.body || {};
  if (b.acao === "config") {
    return res.status(200).json({ banco: !!sql, google: process.env.GOOGLE_CLIENT_ID || null, apple: process.env.APPLE_CLIENT_ID || null, recuperar: !!(process.env.RESEND_API_KEY && process.env.EMAIL_REMETENTE) });
  }
  if (!sql) return res.status(503).json({ erro: "O login ainda não está configurado no servidor." });
  try {
    await prepararBanco();
    if (b.acao === "cadastrar") return await cadastrar(b, res);
    if (b.acao === "entrar") return await entrar(b, res);
    if (b.acao === "social") return await social(b, res);
    if (b.acao === "recuperar") return await recuperar(b, req, res);
    if (b.acao === "redefinir") return await redefinir(b, res);
    if (b.acao === "sair") {
      const t = lerCookie(req);
      if (t) await sql`DELETE FROM sessoes WHERE token_hash = ${hashToken(t)}`;
      gravarCookie(res, "", 0);
      return res.status(200).json({ ok: true });
    }
    const u = await usuarioDaSessao(req);
    if (!u) return res.status(401).json({ erro: "Entre na sua conta." });
    if (b.acao === "eu") return res.status(200).json({ conta: publico(u), estado: u.estado });
    if (b.acao === "definirUsuario") {
      if (u.usuario) return res.status(400).json({ erro: "Você já tem um nome de usuário." });
      const usuario = texto(b.usuario, 40);
      if (!usuarioValido(usuario)) return res.status(400).json({ erro: "O usuário precisa ter de 4 a 15 letras minúsculas, sem números nem símbolos." });
      const [n] = await sql`UPDATE usuarios SET usuario = ${usuario} WHERE id = ${u.id} RETURNING *`;
      return res.status(200).json({ conta: publico(n) });
    }
    if (b.acao === "salvarEstado") {
      const json = estadoAceito(b.estado);
      if (!json) return res.status(413).json({ erro: "Progresso grande demais para salvar na conta." });
      await sql`UPDATE usuarios SET estado = ${json}::jsonb WHERE id = ${u.id}`;
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ erro: "Ação inválida." });
  } catch (e) {
    if (e && e.code === "23505") return res.status(409).json({ erro: mensagemDuplicado(e) });
    console.error(e);
    return res.status(500).json({ erro: "Erro no servidor. Tente de novo." });
  }
}
