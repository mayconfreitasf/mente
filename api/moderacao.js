// Área admin: denúncias, usuários (dados, banir e desbanir) e categorias criadas no app. Acesso só com ADMIN_TOKEN
// (Authorization: Bearer). Também cria (ou zera) as contas de teste usadas pela revisão da App Store e do Google Play.
import crypto from "node:crypto";
import { sql, prepararBanco } from "./_banco.js";
import { hashSenha, novoToken, senhaValida } from "./_auth.js";
import { sincronizarPerfil, guardarMidia, urlMidia, apagarMidias, assinaturaMidia } from "./_perfil.js";
import { FOTOS_DEMO } from "./_demo-fotos.js";
import { TEMAS_PRONTOS } from "./_temas-prontos.js";

const idadeDe = nasc => { if (!nasc) return null; const d = new Date(nasc), h = new Date(); let i = h.getFullYear() - d.getFullYear(); if (h < new Date(h.getFullYear(), d.getMonth(), d.getDate())) i--; return i; };
const partesDe = async id => Object.fromEntries((await sql`SELECT subtema, perguntas FROM categoria_partes WHERE categoria_id = ${id}`).map(p => [p.subtema, p.perguntas]));
// Usuário como a área admin vê: conta, perfil e contadores. Mensagens de chat não aparecem (privacidade).
async function usuarioAdmin(u, completo) {
  const [p] = await sql`SELECT * FROM perfis WHERE usuario_id = ${u.id}`;
  const fotos = p ? (Array.isArray(p.fotos) && p.fotos.length ? p.fotos : p.foto_id ? [p.foto_id] : []) : [];
  const [{ n: recebidas }] = await sql`SELECT count(*)::int AS n FROM denuncias WHERE alvo = ${String(u.id)}`;
  const out = {
    id: u.id, usuario: u.usuario, email: u.email, telefone: u.telefone, nascimento: u.nascimento, idade: idadeDe(u.nascimento),
    criado_em: u.criado_em, verificado: u.verificado, banido: u.banido, teste: u.teste, nivel: u.nivel == null ? (p ? Number(p.nivel) : 0) : Number(u.nivel),
    google: !!u.google_sub, apple: !!u.apple_sub, avisos: u.avisos !== false, denunciasRecebidas: recebidas,
    perfil: p ? { nome: p.nome, idade: p.idade, sexo: p.sexo, interesse: p.interesse, bio: p.bio, lat: p.lat, lng: p.lng,
      idadeMin: p.idade_min, idadeMax: p.idade_max, melhores: p.melhores || [], atualizado_em: p.atualizado_em, fotos: fotos.map(urlMidia) } : null
  };
  if (completo) {
    const [{ n: matches }] = await sql`SELECT count(*)::int AS n FROM matches WHERE a_id = ${u.id} OR b_id = ${u.id}`;
    const [{ n: feitas }] = await sql`SELECT count(*)::int AS n FROM denuncias WHERE denunciante_id = ${u.id}`;
    const [{ n: respostas }] = await sql`SELECT count(*)::int AS n FROM respostas WHERE usuario_id = ${u.id}`;
    const denuncias = await sql`SELECT d.id, d.motivo, d.texto, d.status, d.criado_em, x.usuario AS denunciante FROM denuncias d LEFT JOIN usuarios x ON x.id = d.denunciante_id WHERE d.alvo = ${String(u.id)} ORDER BY d.criado_em DESC LIMIT 50`;
    Object.assign(out, { matches, denunciasFeitas: feitas, respostas, denuncias });
  }
  return out;
}

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
  await apagarMidias(await sql`SELECT id, url FROM midias WHERE dono_id = ${u.id} AND tipo = 'foto'`);
  const urls = [];
  for (const f of FOTOS_DEMO[chave]) urls.push(urlMidia(await guardarMidia(u.id, f, "foto")));
  return urls;
}
async function criarContasTeste(senhaRevisor) {
  const rev = await contaTeste(REVISOR.usuario, REVISOR.email, REVISOR.nasc, senhaRevisor);
  await sql`UPDATE usuarios SET nivel = ${REVISOR.nivel} WHERE id = ${rev.id}`;
  await sql`DELETE FROM respostas WHERE usuario_id = ${rev.id}`;
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
    await sql`UPDATE usuarios SET nivel = ${d.nivel} WHERE id = ${u.id}`;
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
    const q = req.query || {};
    // Painel: números gerais do app.
    if (req.method === "GET" && q.ver === "painel") {
      const conta = async consulta => Number((await consulta)[0].n);
      return res.status(200).json({ painel: {
        contas: await conta(sql`SELECT count(*)::int AS n FROM usuarios WHERE NOT teste`),
        novasHoje: await conta(sql`SELECT count(*)::int AS n FROM usuarios WHERE NOT teste AND criado_em > now() - interval '1 day'`),
        novas7dias: await conta(sql`SELECT count(*)::int AS n FROM usuarios WHERE NOT teste AND criado_em > now() - interval '7 days'`),
        comPerfil: await conta(sql`SELECT count(*)::int AS n FROM perfis p JOIN usuarios u ON u.id = p.usuario_id WHERE NOT u.teste`),
        banidas: await conta(sql`SELECT count(*)::int AS n FROM usuarios WHERE banido`),
        denunciasAbertas: await conta(sql`SELECT count(*)::int AS n FROM denuncias WHERE status = 'aberta'`),
        matches: await conta(sql`SELECT count(*)::int AS n FROM matches`),
        mensagens24h: await conta(sql`SELECT count(*)::int AS n FROM mensagens WHERE criado_em > now() - interval '1 day'`),
        respostas24h: await conta(sql`SELECT count(*)::int AS n FROM respostas WHERE criado_em > now() - interval '1 day'`),
        usoIA24h: await conta(sql`SELECT count(*)::int AS n FROM ia_uso WHERE criado_em > now() - interval '1 day'`),
        categoriasIA: await conta(sql`SELECT count(*)::int AS n FROM categorias WHERE aprovado`),
        desafios: await conta(sql`SELECT count(*)::int AS n FROM desafios`)
      } });
    }
    // LGPD: todos os dados de uma pessoa (pedido de acesso ou portabilidade).
    if (req.method === "GET" && q.ver === "exportar") {
      const [u] = await sql`SELECT * FROM usuarios WHERE id::text = ${String(q.id || "")}`;
      if (!u) return res.status(404).json({ erro: "Usuário não encontrado." });
      const [perfil] = await sql`SELECT * FROM perfis WHERE usuario_id = ${u.id}`;
      const matches = await sql`SELECT m.id, m.criado_em, x.usuario AS com FROM matches m JOIN usuarios x ON x.id = (CASE WHEN m.a_id = ${u.id} THEN m.b_id ELSE m.a_id END) WHERE m.a_id = ${u.id} OR m.b_id = ${u.id}`;
      const mensagens = await sql`SELECT match_id, texto, midia_id IS NOT NULL AS audio, apagada, criado_em FROM mensagens WHERE de_id = ${u.id} ORDER BY criado_em`;
      const denunciasFeitas = await sql`SELECT alvo, motivo, texto, status, criado_em FROM denuncias WHERE denunciante_id = ${u.id}`;
      const desafios = await sql`SELECT codigo, criado_em FROM desafios WHERE criador_id = ${u.id}`;
      const [{ n: respostas }] = await sql`SELECT count(*)::int AS n FROM respostas WHERE usuario_id = ${u.id}`;
      await sql`INSERT INTO admin_log (acao, alvo, detalhe) VALUES ('exportar', ${String(u.id)}, ${u.usuario})`;
      return res.status(200).json({ exportado_em: new Date().toISOString(), conta: { id: u.id, usuario: u.usuario, email: u.email, telefone: u.telefone, nascimento: u.nascimento, criado_em: u.criado_em, nivel: u.nivel, verificado: u.verificado, banido: u.banido, login_google: !!u.google_sub, login_apple: !!u.apple_sub },
        perfil: perfil || null, progresso: u.estado || null, matches, mensagensEnviadas: mensagens, denunciasFeitas, desafiosCriados: desafios, perguntasRespondidas: respostas });
    }
    // Trecho da conversa entre quem denunciou e quem foi denunciado (só a partir de uma denúncia, como dizem os Termos).
    if (req.method === "GET" && q.ver === "conversa") {
      const [d] = await sql`SELECT d.*, a.usuario AS alvo_usuario, x.usuario AS denunciante FROM denuncias d LEFT JOIN usuarios a ON a.id::text = d.alvo LEFT JOIN usuarios x ON x.id = d.denunciante_id WHERE d.id = ${Number(q.denuncia) || 0}`;
      if (!d) return res.status(404).json({ erro: "Denúncia não encontrada." });
      const lista = Array.isArray(d.conversa) ? d.conversa : [];
      await sql`INSERT INTO admin_log (acao, alvo, detalhe) VALUES ('ver conversa', ${d.alvo}, ${"denúncia " + d.id})`;
      return res.status(200).json({ semConversa: !lista.length, mensagens: lista.map(m => ({ de: m.denunciado ? d.alvo_usuario || "denunciado" : d.denunciante || "quem denunciou", denunciado: m.denunciado, texto: m.texto, quando: m.quando })) });
    }
    if (req.method === "GET" && q.ver === "usuarios") {
      const busca = String(q.busca || "").trim().toLowerCase().slice(0, 60), pagina = Math.max(0, Number(q.pagina) || 0);
      const like = "%" + busca + "%";
      const lista = busca
        ? await sql`SELECT u.* FROM usuarios u LEFT JOIN perfis p ON p.usuario_id = u.id WHERE lower(coalesce(u.usuario, '')) LIKE ${like} OR lower(coalesce(u.email, '')) LIKE ${like} OR coalesce(u.telefone, '') LIKE ${like} OR lower(coalesce(p.nome, '')) LIKE ${like} ORDER BY u.criado_em DESC LIMIT 50 OFFSET ${pagina * 50}`
        : await sql`SELECT * FROM usuarios ORDER BY criado_em DESC LIMIT 50 OFFSET ${pagina * 50}`;
      const [{ n: total }] = await sql`SELECT count(*)::int AS n FROM usuarios`;
      const usuarios = [];
      for (const u of lista) usuarios.push(await usuarioAdmin(u, false));
      return res.status(200).json({ usuarios, total, pagina });
    }
    if (req.method === "GET" && q.ver === "usuario") {
      const [u] = await sql`SELECT * FROM usuarios WHERE id::text = ${String(q.id || "")}`;
      if (!u) return res.status(404).json({ erro: "Usuário não encontrado." });
      return res.status(200).json({ usuario: await usuarioAdmin(u, true) });
    }
    if (req.method === "GET" && q.ver === "categorias") {
      const linhas = await sql`SELECT c.id, c.titulo, c.tema, c.dificuldade, c.aprovado, c.motivo, c.peso, c.usos, c.criado_em, u.usuario AS criador
        FROM categorias c LEFT JOIN usuarios u ON u.id = c.criador_id ORDER BY c.criado_em DESC LIMIT 500`;
      const contagem = {};
      for (const p of await sql`SELECT categoria_id, perguntas FROM categoria_partes`) contagem[p.categoria_id] = (contagem[p.categoria_id] || 0) + (Array.isArray(p.perguntas) ? p.perguntas.length : 0);
      const categorias = [
        ...TEMAS_PRONTOS.map((t, i) => ({ id: "p" + i, titulo: t.titulo, tema: t.apelidos[0], dificuldade: "facil", aprovado: true, peso: t.peso, perguntas: t.perguntas.length, usos: null, origem: "pronta" })),
        ...linhas.map(c => ({ id: String(c.id), titulo: c.titulo, tema: c.tema, dificuldade: c.dificuldade, aprovado: c.aprovado, motivo: c.motivo, peso: Number(c.peso), perguntas: contagem[c.id] || 0, usos: c.usos, criador: c.criador, criado_em: c.criado_em, origem: "ia" }))
      ];
      return res.status(200).json({ categorias });
    }
    if (req.method === "GET" && q.ver === "categoria") {
      const id = String(q.id || "");
      if (id.startsWith("p")) {
        const t = TEMAS_PRONTOS[Number(id.slice(1))];
        if (!t) return res.status(404).json({ erro: "Categoria não encontrada." });
        return res.status(200).json({ categoria: { titulo: t.titulo, dificuldade: "facil", peso: t.peso, origem: "pronta", partes: { "Todas": t.perguntas } } });
      }
      const [c] = await sql`SELECT * FROM categorias WHERE id = ${Number(id) || 0}`;
      if (!c) return res.status(404).json({ erro: "Categoria não encontrada." });
      return res.status(200).json({ categoria: { titulo: c.titulo, tema: c.tema, dificuldade: c.dificuldade, aprovado: c.aprovado, motivo: c.motivo, peso: Number(c.peso), subtemas: c.subtemas, origem: "ia", partes: await partesDe(c.id) } });
    }
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
      if (b.acao === "banirUsuario" || b.acao === "desbanirUsuario") {
        const banir = b.acao === "banirUsuario";
        const [a] = await sql`UPDATE usuarios SET banido = ${banir} WHERE id::text = ${String(b.usuario || "")} RETURNING id, usuario`;
        if (!a) return res.status(404).json({ erro: "Usuário não encontrado." });
        if (banir) {
          await sql`DELETE FROM sessoes WHERE usuario_id = ${a.id}`;
          await sql`UPDATE denuncias SET status = 'banido', resolvido_em = now() WHERE alvo = ${String(a.id)} AND status = 'aberta'`;
        }
        await sql`INSERT INTO admin_log (acao, alvo, detalhe) VALUES (${banir ? "banir" : "desbanir"}, ${String(a.id)}, ${a.usuario})`;
        return res.status(200).json({ ok: true });
      }
      // LGPD: excluir a conta a pedido da pessoa (mesmo efeito de "Excluir conta" no app).
      if (b.acao === "excluirUsuario") {
        const [u] = await sql`SELECT id, usuario FROM usuarios WHERE id::text = ${String(b.usuario || "")}`;
        if (!u) return res.status(404).json({ erro: "Usuário não encontrado." });
        await sql`UPDATE desafios SET dados = dados || '{"n":"Alguém"}'::jsonb WHERE criador_id = ${u.id}`;
        await apagarMidias(await sql`SELECT id, url FROM midias WHERE dono_id = ${u.id}`);
        await sql`DELETE FROM usuarios WHERE id = ${u.id}`;
        await sql`INSERT INTO admin_log (acao, alvo, detalhe) VALUES ('excluir conta', ${String(u.id)}, ${u.usuario})`;
        return res.status(200).json({ ok: true });
      }
      // Moderar sem banir: tirar uma foto ou o texto "sobre você" do perfil.
      if (b.acao === "removerFoto" || b.acao === "limparBio") {
        const [u] = await sql`SELECT * FROM usuarios WHERE id::text = ${String(b.usuario || "")}`;
        const [p] = u ? await sql`SELECT * FROM perfis WHERE usuario_id = ${u.id}` : [];
        if (!u || !p) return res.status(404).json({ erro: "Perfil não encontrado." });
        const estado = u.estado && typeof u.estado === "object" ? u.estado : {};
        if (b.acao === "limparBio") {
          await sql`UPDATE perfis SET bio = NULL WHERE usuario_id = ${u.id}`;
          if (estado.perfil) { estado.perfil.bio = ""; await sql`UPDATE usuarios SET estado = ${JSON.stringify(estado)}::jsonb WHERE id = ${u.id}`; }
        } else {
          const m = String(b.foto || "").match(/id=([0-9a-f-]{36})&s=([A-Za-z0-9_-]+)/);
          if (!m || m[2] !== assinaturaMidia(m[1])) return res.status(400).json({ erro: "Foto inválida." });
          const ids = (Array.isArray(p.fotos) && p.fotos.length ? p.fotos : p.foto_id ? [p.foto_id] : []).filter(id => id !== m[1]);
          await apagarMidias(await sql`SELECT id, url FROM midias WHERE id = ${m[1]} AND dono_id = ${u.id}`);
          await sql`UPDATE perfis SET fotos = ${JSON.stringify(ids)}, foto_id = ${ids[0] || null} WHERE usuario_id = ${u.id}`;
          if (estado.perfil) { estado.perfil.fotos = ids.map(urlMidia); estado.perfil.foto = estado.perfil.fotos[0] || null; await sql`UPDATE usuarios SET estado = ${JSON.stringify(estado)}::jsonb WHERE id = ${u.id}`; }
        }
        await sql`INSERT INTO admin_log (acao, alvo, detalhe) VALUES (${b.acao === "limparBio" ? "apagar sobre" : "remover foto"}, ${String(u.id)}, ${u.usuario})`;
        return res.status(200).json({ ok: true });
      }
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
        await sql`INSERT INTO admin_log (acao, alvo, detalhe) VALUES ('banir', ${d.alvo}, ${"denúncia " + d.id})`;
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
