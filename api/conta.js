// Contas do Jingar: cadastro com usuário, e-mail ou celular e senha, confirmado por código; login com Google ou Apple,
// sessão por cookie, progresso salvo, denúncias, bloqueios e exclusão de conta.
// Precisa de um banco Postgres (DATABASE_URL ou POSTGRES_URL, por exemplo Neon pela Vercel).
// Envio de códigos: RESEND_API_KEY + EMAIL_REMETENTE (e-mail) e TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN +
// TWILIO_FROM ou TWILIO_MESSAGING_SERVICE_SID (SMS). Opcionais: GOOGLE_CLIENT_ID, APPLE_CLIENT_ID, CONTATO_EMAIL.
import crypto from "node:crypto";
import { sql, prepararBanco } from "./_banco.js";
import { lerToken, gravarCookie, usuarioDaSessao, falha, cors } from "./_sessao.js";
import { sincronizarPerfil, guardarFotoConferida, urlMidia, MAX_FOTOS } from "./_perfil.js";
import { hashSenha, confereSenha, novoToken, hashToken, usuarioValido, emailValido, senhaValida, verificaTokenProvedor, normalizaTelefone, novoCodigo } from "./_auth.js";

const DIAS_SESSAO = 30, MAX_ESTADO = 1500000, MAX_FALHAS = 5;
// Hash de uma senha qualquer: comparar com ele quando o usuário não existe deixa o tempo de resposta igual.
const HASH_FALSO = hashSenha(novoToken());
const temEmail = () => !!(process.env.RESEND_API_KEY && process.env.EMAIL_REMETENTE);
const temSms = () => !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && (process.env.TWILIO_FROM || process.env.TWILIO_MESSAGING_SERVICE_SID));

const texto = (x, max) => typeof x === "string" ? x.trim().toLowerCase().slice(0, max) : "";

function idadeDe(nasc) {
  if (!nasc) return null;
  const d = new Date(nasc), h = new Date();
  let i = h.getUTCFullYear() - d.getUTCFullYear();
  if (h.getUTCMonth() < d.getUTCMonth() || (h.getUTCMonth() === d.getUTCMonth() && h.getUTCDate() < d.getUTCDate())) i--;
  return i;
}
const mascaraEmail = e => e.replace(/^(.)[^@]*(@.*)$/, "$1***$2");
const mascaraTelefone = t => `(${t.slice(3, 5)}) *****-${t.slice(-4)}`;
const publico = u => ({
  usuario: u.usuario, email: u.email, telefone: u.telefone ? mascaraTelefone(u.telefone) : null, idade: idadeDe(u.nascimento),
  temSenha: !!u.senha_hash, google: !!u.google_sub, apple: !!u.apple_sub, teste: !!u.teste
});
// "contato" é um e-mail ou um celular; o tipo decide o canal do código.
function lerContato(x) {
  const v = typeof x === "string" ? x.trim() : "";
  if (v.includes("@")) { const e = v.toLowerCase().slice(0, 200); return emailValido(e) ? { tipo: "email", valor: e } : null; }
  const t = normalizaTelefone(v);
  return t ? { tipo: "telefone", valor: t } : null;
}
const destinoDe = u => u.email ? { tipo: "email", valor: u.email } : { tipo: "telefone", valor: u.telefone };
const mascaraDestino = d => d.tipo === "email" ? mascaraEmail(d.valor) : mascaraTelefone(d.valor);

async function criarSessao(res, id) {
  const t = novoToken();
  await sql`INSERT INTO sessoes (token_hash, usuario_id, expira_em) VALUES (${hashToken(t)}, ${id}, now() + make_interval(days => ${DIAS_SESSAO}))`;
  gravarCookie(res, t, DIAS_SESSAO * 86400);
  res.tokenSessao = t;
}
function estadoAceito(e) {
  if (!e || typeof e !== "object" || Array.isArray(e)) return null;
  const json = JSON.stringify(e);
  return json.length <= MAX_ESTADO ? json : null;
}
function mensagemDuplicado(e) {
  const c = String(e.constraint || e.detail || "");
  if (c.includes("telefone")) return "Esse celular já está em uso.";
  if (c.includes("email")) return "Esse e-mail já está em uso.";
  if (c.includes("usuario")) return "Esse nome de usuário já existe.";
  return "Já existe uma conta com esses dados.";
}
const ERRO_LOGIN = "Usuário ou senha incorretos.";
const SUSPENSA = "Esta conta foi suspensa por violar os Termos de Uso.";

// Códigos de 6 dígitos: valem 10 minutos, 5 tentativas cada, 1 pedido por minuto e 5 por hora.
async function enviarCodigo(u, destino, finalidade) {
  if (destino.tipo === "email" && !temEmail()) throw falha(501, "O envio de código por e-mail ainda não está configurado.");
  if (destino.tipo === "telefone" && !temSms()) throw falha(501, "O envio de código por SMS ainda não está configurado.");
  const [c] = await sql`SELECT count(*) FILTER (WHERE criado_em > now() - interval '60 seconds') AS minuto,
    count(*) FILTER (WHERE criado_em > now() - interval '1 hour') AS hora FROM codigos WHERE usuario_id = ${u.id}`;
  if (Number(c.minuto) > 0) throw falha(429, "Aguarde 1 minuto para pedir outro código.");
  if (Number(c.hora) >= 5) throw falha(429, "Muitos códigos pedidos. Tente de novo mais tarde.");
  const codigo = novoCodigo();
  await sql`DELETE FROM codigos WHERE usuario_id = ${u.id} AND finalidade = ${finalidade} AND criado_em < now() - interval '1 hour'`;
  await sql`INSERT INTO codigos (usuario_id, finalidade, codigo_hash, expira_em) VALUES (${u.id}, ${finalidade}, ${hashToken(u.id + ":" + codigo)}, now() + interval '10 minutes')`;
  const msg = `Seu código do Jingar é ${codigo}. Ele vale por 10 minutos. Não compartilhe com ninguém.`;
  let r;
  if (destino.tipo === "email") {
    r = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_REMETENTE, to: destino.valor, subject: `${codigo} é seu código do Jingar`, text: msg })
    }).catch(() => null);
  } else {
    const corpo = new URLSearchParams({ To: destino.valor, Body: msg });
    if (process.env.TWILIO_MESSAGING_SERVICE_SID) corpo.set("MessagingServiceSid", process.env.TWILIO_MESSAGING_SERVICE_SID); else corpo.set("From", process.env.TWILIO_FROM);
    r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: "POST", headers: { Authorization: "Basic " + Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" },
      body: corpo
    }).catch(() => null);
  }
  if (!r || !r.ok) throw falha(502, "Não foi possível enviar o código. Confira o e-mail ou celular e tente de novo.");
  return mascaraDestino(destino);
}
async function conferirCodigo(u, finalidade, codigo) {
  const [c] = await sql`SELECT * FROM codigos WHERE usuario_id = ${u.id} AND finalidade = ${finalidade} AND expira_em > now() ORDER BY id DESC LIMIT 1`;
  if (!c) throw falha(400, "Código expirado. Peça um novo.");
  if (c.tentativas >= 5) throw falha(429, "Muitas tentativas. Peça um novo código.");
  const esperado = Buffer.from(c.codigo_hash), recebido = Buffer.from(hashToken(u.id + ":" + String(codigo || "").trim()));
  if (esperado.length !== recebido.length || !crypto.timingSafeEqual(esperado, recebido)) {
    await sql`UPDATE codigos SET tentativas = tentativas + 1 WHERE id = ${c.id}`;
    throw falha(400, "Código incorreto.");
  }
  await sql`DELETE FROM codigos WHERE usuario_id = ${u.id} AND finalidade = ${finalidade}`;
}
async function acharPorLogin(login) {
  const l = texto(login, 200), tel = normalizaTelefone(login);
  if (!l) return null;
  const [u] = tel ? await sql`SELECT * FROM usuarios WHERE usuario = ${l} OR email = ${l} OR telefone = ${tel} LIMIT 1`
    : await sql`SELECT * FROM usuarios WHERE usuario = ${l} OR email = ${l} LIMIT 1`;
  return u || null;
}

async function cadastrar(b, res) {
  const usuario = texto(b.usuario, 40), contato = lerContato(b.contato);
  if (!usuarioValido(usuario)) throw falha(400, "O usuário precisa ter de 4 a 15 letras minúsculas, sem números nem símbolos.");
  if (!contato) throw falha(400, "Digite um e-mail válido ou um celular com DDD.");
  if (!senhaValida(b.senha)) throw falha(400, "A senha precisa ter pelo menos 6 caracteres, com letra, número e símbolo.");
  const nasc = /^\d{4}-\d{2}-\d{2}$/.test(String(b.nascimento || "")) ? b.nascimento : null, idade = idadeDe(nasc);
  if (idade == null || isNaN(idade) || idade > 120) throw falha(400, "Informe sua data de nascimento.");
  if (idade < 18) throw falha(403, "O Jingar é só para maiores de 18 anos.");
  if (b.aceite !== true) throw falha(400, "Aceite os Termos de Uso e a Política de Privacidade para continuar.");
  // Cadastros não confirmados há mais de 15 minutos liberam o usuário, e-mail ou celular para quem confirmar primeiro.
  await sql`DELETE FROM usuarios WHERE verificado = false AND criado_em < now() - interval '15 minutes'
    AND (usuario = ${usuario} OR email = ${contato.tipo === "email" ? contato.valor : null} OR telefone = ${contato.tipo === "telefone" ? contato.valor : null})`;
  const email = contato.tipo === "email" ? contato.valor : null, telefone = contato.tipo === "telefone" ? contato.valor : null;
  const [u] = await sql`INSERT INTO usuarios (usuario, email, telefone, senha_hash, nascimento, verificado, estado)
    VALUES (${usuario}, ${email}, ${telefone}, ${hashSenha(b.senha)}, ${nasc}, false, ${estadoAceito(b.estado)}::jsonb) RETURNING *`;
  let destino;
  try { destino = await enviarCodigo(u, contato, "verificar"); }
  catch (e) { await sql`DELETE FROM usuarios WHERE id = ${u.id}`; throw e; }
  return res.status(200).json({ precisaCodigo: true, login: u.usuario, destino });
}

async function entrar(b, res) {
  const senha = typeof b.senha === "string" ? b.senha.slice(0, 128) : "";
  const u = await acharPorLogin(b.login);
  if (!u || !u.senha_hash) { confereSenha(senha, HASH_FALSO); throw falha(401, ERRO_LOGIN); }
  if (u.bloqueado_ate && new Date(u.bloqueado_ate) > new Date()) throw falha(429, "Muitas tentativas erradas. Tente de novo em 15 minutos.");
  if (!confereSenha(senha, u.senha_hash)) {
    await sql`UPDATE usuarios SET
      bloqueado_ate = CASE WHEN falhas + 1 >= ${MAX_FALHAS} THEN now() + interval '15 minutes' ELSE bloqueado_ate END,
      falhas = CASE WHEN falhas + 1 >= ${MAX_FALHAS} THEN 0 ELSE falhas + 1 END
      WHERE id = ${u.id}`;
    throw falha(401, ERRO_LOGIN);
  }
  await sql`UPDATE usuarios SET falhas = 0, bloqueado_ate = NULL WHERE id = ${u.id}`;
  if (u.banido) throw falha(403, SUSPENSA);
  if (!u.verificado) {
    let destino = mascaraDestino(destinoDe(u));
    try { destino = await enviarCodigo(u, destinoDe(u), "verificar"); } catch (e) { if (e.status !== 429) throw e; }
    return res.status(403).json({ precisaCodigo: true, login: u.usuario, destino, erro: "Confirme sua conta com o código enviado." });
  }
  await criarSessao(res, u.id);
  return res.status(200).json({ conta: publico(u), estado: await estadoAtual(u) });
}

async function verificar(b, res) {
  const [u] = await sql`SELECT * FROM usuarios WHERE usuario = ${texto(b.login, 40)}`;
  if (!u || u.verificado) throw falha(400, "Não há confirmação pendente para essa conta.");
  await conferirCodigo(u, "verificar", b.codigo);
  const [n] = await sql`UPDATE usuarios SET verificado = true WHERE id = ${u.id} RETURNING *`;
  await criarSessao(res, n.id);
  return res.status(200).json({ conta: publico(n), estado: await estadoAtual(n) });
}

async function reenviar(b, res) {
  const [u] = await sql`SELECT * FROM usuarios WHERE usuario = ${texto(b.login, 40)}`;
  if (!u || u.verificado) throw falha(400, "Não há confirmação pendente para essa conta.");
  return res.status(200).json({ destino: await enviarCodigo(u, destinoDe(u), "verificar") });
}

// Recuperar senha: código para o e-mail ou celular da conta. A resposta não revela se a conta existe.
async function recuperar(b, res) {
  const contato = lerContato(b.contato);
  if (!contato) throw falha(400, "Digite o e-mail ou o celular da sua conta.");
  if (contato.tipo === "email" && !temEmail()) throw falha(501, "O envio de código por e-mail ainda não está configurado.");
  if (contato.tipo === "telefone" && !temSms()) throw falha(501, "O envio de código por SMS ainda não está configurado.");
  const [u] = contato.tipo === "email" ? await sql`SELECT * FROM usuarios WHERE email = ${contato.valor} AND verificado AND senha_hash IS NOT NULL`
    : await sql`SELECT * FROM usuarios WHERE telefone = ${contato.valor} AND verificado AND senha_hash IS NOT NULL`;
  if (u) { try { await enviarCodigo(u, contato, "recuperar"); } catch (e) { if (e.status === 501) throw e; } }
  return res.status(200).json({ ok: true, destino: mascaraDestino(contato) });
}

async function redefinir(b, res) {
  const contato = lerContato(b.contato);
  if (!senhaValida(b.senha)) throw falha(400, "A senha precisa ter pelo menos 6 caracteres, com letra, número e símbolo.");
  const [u] = !contato ? [] : contato.tipo === "email" ? await sql`SELECT * FROM usuarios WHERE email = ${contato.valor} AND verificado`
    : await sql`SELECT * FROM usuarios WHERE telefone = ${contato.valor} AND verificado`;
  if (!u) throw falha(400, "Código incorreto.");
  await conferirCodigo(u, "recuperar", b.codigo);
  const [n] = await sql`UPDATE usuarios SET senha_hash = ${hashSenha(b.senha)}, falhas = 0, bloqueado_ate = NULL WHERE id = ${u.id} RETURNING *`;
  await sql`DELETE FROM sessoes WHERE usuario_id = ${n.id}`;
  if (n.banido) throw falha(403, SUSPENSA);
  await criarSessao(res, n.id);
  return res.status(200).json({ conta: publico(n), estado: await estadoAtual(n) });
}

// Google e Apple: a conta é achada pelo identificador do provedor. Não liga com contas de senha pelo e-mail.
async function social(b, res) {
  const provedor = b.provedor === "apple" ? "apple" : b.provedor === "google" ? "google" : null;
  const aud = provedor === "apple" ? process.env.APPLE_CLIENT_ID : process.env.GOOGLE_CLIENT_ID;
  if (!provedor || !aud) throw falha(400, "Login social não configurado.");
  const dados = await verificaTokenProvedor(provedor, b.token, aud);
  if (!dados) throw falha(401, `Não foi possível confirmar sua conta ${provedor === "apple" ? "Apple" : "Google"}.`);
  let [u] = provedor === "apple" ? await sql`SELECT * FROM usuarios WHERE apple_sub = ${dados.sub}` : await sql`SELECT * FROM usuarios WHERE google_sub = ${dados.sub}`;
  if (!u) {
    const [usado] = dados.email ? await sql`SELECT 1 FROM usuarios WHERE email = ${dados.email}` : [];
    const email = usado ? null : dados.email, estado = estadoAceito(b.estado);
    [u] = provedor === "apple"
      ? await sql`INSERT INTO usuarios (email, apple_sub, estado) VALUES (${email}, ${dados.sub}, ${estado}::jsonb) RETURNING *`
      : await sql`INSERT INTO usuarios (email, google_sub, estado) VALUES (${email}, ${dados.sub}, ${estado}::jsonb) RETURNING *`;
  }
  if (u.banido) throw falha(403, SUSPENSA);
  await criarSessao(res, u.id);
  return res.status(200).json({ conta: publico(u), estado: await estadoAtual(u) });
}

// Denunciar ou bloquear uma pessoa real desfaz o match e impede que ela volte a aparecer.
async function desfazerContato(meuId, alvo) {
  if (!/^[0-9a-f-]{36}$/.test(alvo)) return;
  await sql`DELETE FROM matches WHERE (a_id = ${meuId} AND b_id::text = ${alvo}) OR (b_id = ${meuId} AND a_id::text = ${alvo})`;
  await sql`INSERT INTO avaliacoes (de_id, para_id, tipo) SELECT ${meuId}, id, 'passar' FROM usuarios WHERE id::text = ${alvo}
    ON CONFLICT (de_id, para_id) DO UPDATE SET tipo = 'passar'`;
}

const MOTIVOS = ["Perfil falso", "Fotos ou conteúdo impróprio", "Assédio ou ofensa", "Golpe ou spam", "Parece menor de idade", "Outro motivo"];

// O progresso guarda o endereço da foto; ao entrar, o endereço é refeito para valer com a assinatura atual.
async function estadoAtual(u) {
  const e = u.estado;
  // Os endereços das fotos vêm sempre do servidor (assinados), na ordem do perfil.
  if (e && e.perfil) {
    const [p] = await sql`SELECT foto_id, fotos FROM perfis WHERE usuario_id = ${u.id}`;
    const ids = p ? (Array.isArray(p.fotos) && p.fotos.length ? p.fotos : p.foto_id ? [p.foto_id] : []) : null;
    if (ids) { e.perfil.fotos = ids.map(urlMidia); e.perfil.foto = e.perfil.fotos[0] || null; }
  }
  return e;
}

export default async function handler(req, res) {
  if (cors(req, res)) return;
  res.setHeader("Cache-Control", "no-store");
  // No app, a resposta de login também traz o token da sessão (o app guarda e envia no cabeçalho Authorization).
  if (req.headers["x-jingar-app"] === "1") {
    const json = res.json.bind(res);
    res.json = obj => json(res.tokenSessao && obj && typeof obj === "object" ? { ...obj, token: res.tokenSessao } : obj);
  }
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST." });
  const b = req.body || {};
  if (b.acao === "config") {
    return res.status(200).json({ banco: !!sql, google: process.env.GOOGLE_CLIENT_ID || null, apple: process.env.APPLE_CLIENT_ID || null,
      email: temEmail(), sms: temSms(), contato: process.env.CONTATO_EMAIL || null });
  }
  if (!sql) return res.status(503).json({ erro: "O login ainda não está configurado no servidor." });
  try {
    await prepararBanco();
    if (b.acao === "cadastrar") return await cadastrar(b, res);
    if (b.acao === "entrar") return await entrar(b, res);
    if (b.acao === "verificar") return await verificar(b, res);
    if (b.acao === "reenviar") return await reenviar(b, res);
    if (b.acao === "social") return await social(b, res);
    if (b.acao === "recuperar") return await recuperar(b, res);
    if (b.acao === "redefinir") return await redefinir(b, res);
    if (b.acao === "sair") {
      const t = lerToken(req);
      if (t) await sql`DELETE FROM sessoes WHERE token_hash = ${hashToken(t)}`;
      // Ao sair no app, o aparelho deixa de receber notificações desta conta.
      if (typeof b.pushToken === "string" && b.pushToken) await sql`DELETE FROM dispositivos WHERE token = ${b.pushToken.slice(0, 4096)}`;
      gravarCookie(res, "", 0);
      return res.status(200).json({ ok: true });
    }
    const u = await usuarioDaSessao(req);
    if (!u) return res.status(401).json({ erro: "Entre na sua conta." });
    if (u.banido) { await sql`DELETE FROM sessoes WHERE usuario_id = ${u.id}`; gravarCookie(res, "", 0); return res.status(403).json({ erro: SUSPENSA }); }
    if (b.acao === "eu") return res.status(200).json({ conta: publico(u), estado: await estadoAtual(u) });
    if (b.acao === "definirUsuario") {
      if (u.usuario) throw falha(400, "Você já tem um nome de usuário.");
      const usuario = texto(b.usuario, 40);
      if (!usuarioValido(usuario)) throw falha(400, "O usuário precisa ter de 4 a 15 letras minúsculas, sem números nem símbolos.");
      const [n] = await sql`UPDATE usuarios SET usuario = ${usuario} WHERE id = ${u.id} RETURNING *`;
      return res.status(200).json({ conta: publico(n) });
    }
    if (b.acao === "salvarEstado") {
      if (!estadoAceito(b.estado)) throw falha(413, "Progresso grande demais para salvar na conta.");
      // O perfil público acompanha o progresso; a foto enviada vira mídia e o progresso guarda só o endereço dela.
      const r = await sincronizarPerfil(u, b.estado, b.local);
      if (r.fotos && b.estado.perfil) { b.estado.perfil.fotos = r.fotos; b.estado.perfil.foto = r.fotos[0] || null; }
      await sql`UPDATE usuarios SET estado = ${JSON.stringify(b.estado)}::jsonb WHERE id = ${u.id}`;
      return res.status(200).json({ ok: true, ...r });
    }
    // Foto nova do perfil: o Claude confere se mostra uma pessoa antes de guardar. O app recebe o endereço.
    if (b.acao === "foto") {
      const [{ n }] = await sql`SELECT count(*)::int AS n FROM midias WHERE dono_id = ${u.id} AND tipo = 'foto' AND criado_em > now() - interval '1 hour'`;
      if (n >= 20) throw falha(429, "Muitas fotos enviadas. Tente de novo em uma hora.");
      const id = await guardarFotoConferida(u.id, b.foto);
      if (!id) throw falha(400, "Foto inválida ou grande demais. Use JPG ou PNG.");
      return res.status(200).json({ foto: urlMidia(id), max: MAX_FOTOS });
    }
    if (b.acao === "denunciar") {
      const alvo = typeof b.alvo === "string" ? b.alvo.slice(0, 64) : "";
      if (!alvo || !MOTIVOS.includes(b.motivo)) throw falha(400, "Escolha um motivo.");
      const detalhe = typeof b.texto === "string" ? b.texto.trim().slice(0, 300) : "";
      await sql`INSERT INTO denuncias (denunciante_id, alvo, motivo, texto) VALUES (${u.id}, ${alvo}, ${b.motivo}, ${detalhe})`;
      await sql`INSERT INTO bloqueios (usuario_id, alvo) VALUES (${u.id}, ${alvo}) ON CONFLICT DO NOTHING`;
      await desfazerContato(u.id, alvo);
      return res.status(200).json({ ok: true });
    }
    if (b.acao === "bloquear") {
      const alvo = typeof b.alvo === "string" ? b.alvo.slice(0, 64) : "";
      if (!alvo) throw falha(400, "Perfil inválido.");
      await sql`INSERT INTO bloqueios (usuario_id, alvo) VALUES (${u.id}, ${alvo}) ON CONFLICT DO NOTHING`;
      await desfazerContato(u.id, alvo);
      return res.status(200).json({ ok: true });
    }
    // Excluir conta apaga o usuário e, em cascata, sessões, códigos e bloqueios. Denúncias feitas ficam sem autor.
    if (b.acao === "excluirConta") {
      if (u.senha_hash && !confereSenha(typeof b.senha === "string" ? b.senha.slice(0, 128) : "", u.senha_hash)) throw falha(401, "Senha incorreta.");
      if (!u.senha_hash && b.confirmacao !== "EXCLUIR") throw falha(400, "Digite EXCLUIR para confirmar.");
      // Os desafios que a pessoa criou continuam valendo para quem tem o link, mas sem o nome dela.
      await sql`UPDATE desafios SET dados = dados || '{"n":"Alguém"}'::jsonb WHERE criador_id = ${u.id}`;
      await sql`DELETE FROM usuarios WHERE id = ${u.id}`;
      gravarCookie(res, "", 0);
      return res.status(200).json({ ok: true });
    }
    throw falha(400, "Ação inválida.");
  } catch (e) {
    if (e && e.status) return res.status(e.status).json({ erro: e.erro, ...(e.extra || {}) });
    if (e && e.code === "23505") return res.status(409).json({ erro: mensagemDuplicado(e) });
    console.error(e);
    return res.status(500).json({ erro: "Erro no servidor. Tente de novo." });
  }
}
