// Moderação: lista as denúncias abertas e permite resolver ou banir. Acesso só com ADMIN_TOKEN (Authorization: Bearer).
// Também cria (ou zera) as contas de teste usadas pela revisão da App Store e do Google Play.
import crypto from "node:crypto";
import { sql, prepararBanco } from "./_banco.js";
import { hashSenha, novoToken, senhaValida } from "./_auth.js";
import { sincronizarPerfil, guardarMidia, urlMidia } from "./_perfil.js";
import { FOTOS_DEMO } from "./_demo-fotos.js";

// Perfis de demonstração, vistos só pela conta do revisor. Ficam perto de Cupertino (onde costuma estar a revisão da Apple).
// A Ana já curtiu o revisor: ao curtir de volta, dá match na hora. A Bia está acima do nível do revisor e aparece bloqueada.
const DEMO = [
  { usuario: "testeana", fotos: "ana", nome: "Ana", nasc: "1997-04-12", sexo: "F", nivel: 12, bio: "Bióloga. Adoro trilhas e quizzes de ciências.", lat: 37.33, lng: -122.03, curtiu: true },
  { usuario: "testelucas", fotos: "lucas", nome: "Lucas", nasc: "1993-08-20", sexo: "M", nivel: 8, bio: "Engenheiro. Me pergunte sobre história do Brasil.", lat: 37.35, lng: -122.01 },
  { usuario: "testebia", fotos: "bia", nome: "Bia", nasc: "1995-02-03", sexo: "F", nivel: 45, bio: "Professora de matemática. Me alcance no nível 45.", lat: 37.32, lng: -122.05 }
];
const REVISOR = { usuario: "revisao", email: "revisao@jingar.com.br", nasc: "1994-01-01", perfil: { nome: "Alex", idade: 32, sexo: "O", interesse: "T", cidade: "", bio: "Conta de revisão do Jingar." }, nivel: 20 };

async function contaTeste(usuario, email, nasc, senha) {
  const [u] = await sql`INSERT INTO usuarios (usuario, email, senha_hash, nascimento, verificado, teste)
    VALUES (${usuario}, ${email}, ${hashSenha(senha)}, ${nasc}, true, true)
    ON CONFLICT (usuario) DO UPDATE SET senha_hash = EXCLUDED.senha_hash, verificado = true, teste = true, banido = false, falhas = 0, bloqueado_ate = NULL
    RETURNING *`;
  return u;
}
// Troca as fotos de uma conta de demonstração pelas do arquivo (sem passar pela conferência: são fotos nossas).
async function fotosDemo(u, chave) {
  await sql`DELETE FROM midias WHERE dono_id = ${u.id} AND tipo = 'foto'`;
  const urls = [];
  for (const f of FOTOS_DEMO[chave]) urls.push(urlMidia(await guardarMidia(u.id, f, "foto")));
  return urls;
}
async function criarContasTeste(senhaRevisor) {
  const rev = await contaTeste(REVISOR.usuario, REVISOR.email, REVISOR.nasc, senhaRevisor);
  // Zera a demonstração: sem curtidas, matches nem conversas do revisor.
  await sql`DELETE FROM avaliacoes WHERE de_id = ${rev.id} OR para_id = ${rev.id}`;
  await sql`DELETE FROM matches WHERE a_id = ${rev.id} OR b_id = ${rev.id}`;
  await sql`DELETE FROM bloqueios WHERE usuario_id = ${rev.id} OR alvo = ${String(rev.id)}`;
  const fotosRev = await fotosDemo(rev, "revisor");
  const estado = { v: 1, perfil: { ...REVISOR.perfil, fotos: fotosRev, foto: fotosRev[0] }, nivel: REVISOR.nivel, respondidas: 0, porCat: {}, vistas: {}, filtros: { verMin: 0, visMin: 0, raio: null }, local: null };
  await sql`UPDATE usuarios SET estado = ${JSON.stringify(estado)} WHERE id = ${rev.id}`;
  await sincronizarPerfil(rev, estado, null);
  for (const d of DEMO) {
    // As contas de demonstração não são usadas para entrar: a senha é aleatória e não fica guardada.
    const u = await contaTeste(d.usuario, `teste.${d.usuario.slice(5)}@jingar.com.br`, d.nasc, novoToken() + "a1!");
    const idade = new Date().getFullYear() - Number(d.nasc.slice(0, 4));
    const fotos = await fotosDemo(u, d.fotos);
    await sincronizarPerfil(u, { perfil: { nome: d.nome, idade, sexo: d.sexo, interesse: "T", cidade: "", bio: d.bio, fotos, foto: fotos[0] }, nivel: d.nivel, filtros: { verMin: 0, visMin: 0, raio: null } }, { lat: d.lat, lng: d.lng });
    if (d.curtiu) await sql`INSERT INTO avaliacoes (de_id, para_id, tipo) VALUES (${u.id}, ${rev.id}, 'curtir') ON CONFLICT (de_id, para_id) DO UPDATE SET tipo = 'curtir'`;
  }
  return { revisor: REVISOR.usuario, demo: DEMO.map(d => d.usuario) };
}

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
      if (b.acao === "contasTeste") {
        if (!senhaValida(b.senhaRevisor)) return res.status(400).json({ erro: "Senha do revisor fraca: 6+ caracteres com letra, número e símbolo." });
        return res.status(200).json({ ok: true, ...(await criarContasTeste(b.senhaRevisor)) });
      }
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
