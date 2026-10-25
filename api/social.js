// Pessoas reais: Descobrir, curtir e passar, matches e chat.
import { sql, prepararBanco } from "./_banco.js";
import { usuarioDaSessao, falha, cors } from "./_sessao.js";
import { avisar } from "./_push.js";
import { guardarMidia, urlMidia, apagarMidias } from "./_perfil.js";
import { perguntasDoAssunto, nomeDoAssunto } from "./_bancos.js";

// Prova como cada lado vê: quem pediu vê a nota; quem precisa fazer vê o que falta.
const provaPublica = (p, eu) => p && ({
  id: Number(p.id), minha: p.de_id === eu, assunto: p.assunto, nomeAssunto: nomeDoAssunto(p.assunto) || p.assunto, qtd: p.qtd, minimo: p.minimo,
  status: p.status, tentativas: p.tentativas, ultima: p.ultima, melhor: p.melhor,
  restantes: Math.max(0, perguntasDoAssunto(p.assunto).length - (Array.isArray(p.usadas) ? p.usadas.length : 0))
});

const MAX_TEXTO = 300;
const uuidValido = x => typeof x === "string" && /^[0-9a-f-]{36}$/.test(x);

// Perfil como os outros veem. Quem está acima do seu nível aparece bloqueado: sem nome, texto e foto.
function publico(p, meuNivel) {
  const livre = Number(p.nivel) <= meuNivel || !!p.curtiuVoce;
  return {
    id: p.id, nivel: Number(p.nivel), idade: p.idade, distancia: p.distancia == null ? null : Number(p.distancia), livre,
    nome: livre ? p.nome : null, bio: livre ? p.bio : null, foto: livre ? urlMidia(p.foto_id) : null,
    fotos: livre ? (Array.isArray(p.fotos) && p.fotos.length ? p.fotos : p.foto_id ? [p.foto_id] : []).map(urlMidia) : [],
    melhores: Array.isArray(p.melhores) ? p.melhores : []
  };
}

// Distância em km pela fórmula de haversine (raio da Terra de 6371 km).
function distancia(a, b) {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return null;
  const r = Math.PI / 180;
  const x = Math.sin((b.lat - a.lat) * r / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin((b.lng - a.lng) * r / 2) ** 2;
  return Math.round(12742 * Math.asin(Math.sqrt(x)));
}

// Candidatos compatíveis: interesse dos dois lados, sem avaliação ou bloqueio, dentro dos filtros de nível e visibilidade.
async function candidatos(eu, { incluirAvaliados = false } = {}) {
  const lista = await sql`SELECT p.usuario_id AS id, p.nome, p.idade, p.sexo, p.interesse, p.cidade, p.bio, p.foto_id, p.fotos, p.melhores, p.idade_min, p.idade_max, p.lat, p.lng, p.nivel, p.vis_min
    FROM perfis p JOIN usuarios u ON u.id = p.usuario_id
    WHERE p.usuario_id <> ${eu.usuario_id} AND NOT u.banido AND u.verificado AND p.interesse <> 'N' AND u.teste = ${!!eu.teste}
      AND (p.foto_id IS NOT NULL OR u.teste)
      AND (${eu.interesse} = 'T' OR p.sexo = ${eu.interesse})
      AND (p.interesse = 'T' OR p.interesse = ${eu.sexo})
    LIMIT 500`;
  // Bloqueios valem nos dois sentidos: quem eu bloqueei e quem me bloqueou.
  const bloqueados = new Set([
    ...(await sql`SELECT alvo FROM bloqueios WHERE usuario_id = ${eu.usuario_id}`).map(r => r.alvo),
    ...(await sql`SELECT usuario_id FROM bloqueios WHERE alvo = ${String(eu.usuario_id)}`).map(r => String(r.usuario_id))
  ]);
  // Quem já curtiu você aparece liberado e pode ser curtido de volta, mesmo estando acima do seu nível.
  const curtiramVoce = new Set((await sql`SELECT de_id FROM avaliacoes WHERE para_id = ${eu.usuario_id} AND tipo = 'curtir'`).map(r => String(r.de_id)));
  const avaliados = incluirAvaliados ? new Set() : new Set((await sql`SELECT para_id FROM avaliacoes WHERE de_id = ${eu.usuario_id}`).map(r => r.para_id));
  const meu = Number(eu.nivel), verMin = Math.min(Number(eu.ver_min), meu);
  return lista.filter(p => {
    const nivel = Number(p.nivel);
    if (avaliados.has(p.id) || bloqueados.has(String(p.id))) return false;
    if (nivel <= meu && nivel < verMin) return false;
    // Faixa de idade nos dois sentidos: a pessoa está na minha faixa e eu estou na dela.
    const idade = Number(p.idade) || 0, minhaIdade = Number(eu.idade) || 0;
    if (idade < (eu.idade_min || 18) || idade > (eu.idade_max || 99)) return false;
    if (minhaIdade < (p.idade_min || 18) || minhaIdade > (p.idade_max || 99)) return false;
    // A localização do aparelho é obrigatória para aparecer no Descobrir e dar match.
    if (p.lat == null || p.lng == null) return false;
    // A outra pessoa escolheu a partir de qual nível abaixo dela pode ser vista.
    p.curtiuVoce = curtiramVoce.has(String(p.id));
    if (meu < nivel && meu < Number(p.vis_min) && !p.curtiuVoce) return false;
    p.distancia = distancia(eu, p);
    return eu.raio == null || (p.distancia != null && p.distancia <= eu.raio);
  });
}

async function meuPerfil(u) {
  const [eu] = await sql`SELECT * FROM perfis WHERE usuario_id = ${u.id}`;
  return eu || null;
}

async function matchDoUsuario(u, id) {
  const [m] = await sql`SELECT * FROM matches WHERE id = ${Number(id) || 0} AND (a_id = ${u.id} OR b_id = ${u.id})`;
  if (!m) throw falha(404, "Conversa não encontrada.");
  return m;
}

const mensagemPublica = (m, meuId) => ({
  id: Number(m.id), meu: m.de_id === meuId, texto: m.apagada ? null : m.texto, audio: m.apagada ? null : urlMidia(m.midia_id),
  dur: m.dur, apagada: m.apagada, quando: m.criado_em
});

export default async function handler(req, res) {
  if (cors(req, res)) return;
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST." });
  if (!sql) return res.status(503).json({ erro: "Servidor sem banco configurado." });
  const b = req.body || {};
  try {
    await prepararBanco();
    const u = await usuarioDaSessao(req);
    if (!u) return res.status(401).json({ erro: "Entre na sua conta." });
    if (u.banido) return res.status(403).json({ erro: "Esta conta foi suspensa por violar os Termos de Uso." });
    const eu = await meuPerfil(u);
    if (eu) eu.teste = !!u.teste;
    const meuNivel = eu ? Number(eu.nivel) : 0;

    // Sem localização do aparelho não há Descobrir nem match: o app pede a permissão antes.
    const semLocal = !eu || eu.lat == null || eu.lng == null;
    // Foto também é obrigatória (as contas de teste da revisão das lojas ficam de fora).
    const semFoto = !eu || (!eu.foto_id && !u.teste);
    if (b.acao === "descobrir") {
      if (!eu || eu.interesse === "N") return res.status(200).json({ perfis: [] });
      if (semLocal) return res.status(200).json({ perfis: [], semLocal: true });
      if (semFoto) return res.status(200).json({ perfis: [], semFoto: true });
      const lista = await candidatos(eu);
      // Intercala: dois perfis liberados (do maior nível para o menor) e um bloqueado (o mais próximo do seu nível).
      const livre = p => Number(p.nivel) <= meuNivel || p.curtiuVoce;
      const livres = lista.filter(livre).sort((x, y) => y.nivel - x.nivel);
      const presos = lista.filter(p => !livre(p)).sort((x, y) => x.nivel - y.nivel);
      const out = [];
      while ((livres.length || presos.length) && out.length < 40) {
        if (livres.length) out.push(livres.shift());
        if (livres.length) out.push(livres.shift());
        if (presos.length) out.push(presos.shift());
      }
      return res.status(200).json({ perfis: out.map(p => publico(p, meuNivel)) });
    }

    if (b.acao === "resumo") {
      if (!eu || eu.interesse === "N" || semLocal || semFoto) return res.status(200).json({ liberados: 0, anterior: 0, prox: null, semPerfil: !eu, semLocal: !!eu && semLocal, semFoto: !!eu && semFoto });
      const lista = await candidatos(eu, { incluirAvaliados: true });
      const livres = lista.filter(p => Number(p.nivel) <= meuNivel), presos = lista.filter(p => Number(p.nivel) > meuNivel);
      const proxNivel = presos.length ? Math.min(...presos.map(p => Number(p.nivel))) : null;
      return res.status(200).json({
        liberados: livres.length,
        anterior: livres.reduce((m, p) => Math.max(m, Number(p.nivel)), 0),
        prox: proxNivel == null ? null : { nivel: proxNivel, n: presos.filter(p => Number(p.nivel) === proxNivel).length }
      });
    }

    if (b.acao === "curtir" || b.acao === "passar") {
      if (!eu) throw falha(400, "Complete seu perfil primeiro.");
      if (!uuidValido(b.alvo)) throw falha(400, "Perfil inválido.");
      if (b.acao === "curtir") {
        if (semLocal) throw falha(403, "Ative a localização para dar match.");
        if (semFoto) throw falha(403, "Adicione uma foto ao seu perfil para dar match.");
        const [alvo] = (await candidatos(eu, { incluirAvaliados: true })).filter(p => p.id === b.alvo);
        if (!alvo) throw falha(404, "Esse perfil não está mais disponível.");
        if (Number(alvo.nivel) > meuNivel && !alvo.curtiuVoce) throw falha(403, "Suba de nível para curtir esse perfil.");
      }
      await sql`INSERT INTO avaliacoes (de_id, para_id, tipo) VALUES (${u.id}, ${b.alvo}, ${b.acao}) ON CONFLICT (de_id, para_id) DO UPDATE SET tipo = EXCLUDED.tipo, criado_em = now()`;
      if (b.acao === "passar") return res.status(200).json({ ok: true });
      const [reciproco] = await sql`SELECT 1 FROM avaliacoes WHERE de_id = ${b.alvo} AND para_id = ${u.id} AND tipo = 'curtir'`;
      if (!reciproco) return res.status(200).json({ match: false });
      const [a, z] = [u.id, b.alvo].sort();
      await sql`INSERT INTO matches (a_id, b_id) VALUES (${a}, ${z}) ON CONFLICT (a_id, b_id) DO NOTHING`;
      const [m] = await sql`SELECT id FROM matches WHERE a_id = ${a} AND b_id = ${z}`;
      await avisar(b.alvo, "Deu match!", `Você e ${eu.nome || "alguém"} curtiram um ao outro.`, { tipo: "match", match: String(m.id) });
      return res.status(200).json({ match: true, matchId: Number(m.id) });
    }

    if (b.acao === "matches") {
      const lista = await sql`SELECT m.id, m.criado_em, p.usuario_id AS outro, p.nome, p.idade, p.cidade, p.bio, p.foto_id, p.fotos, p.melhores, p.nivel
        FROM matches m JOIN perfis p ON p.usuario_id = (CASE WHEN m.a_id = ${u.id} THEN m.b_id ELSE m.a_id END)
        WHERE m.a_id = ${u.id} OR m.b_id = ${u.id} ORDER BY m.id DESC LIMIT 200`;
      const out = [];
      for (const m of lista) {
        const [ult] = await sql`SELECT * FROM mensagens WHERE match_id = ${m.id} ORDER BY id DESC LIMIT 1`;
        const [nl] = await sql`SELECT count(*) AS n FROM mensagens WHERE match_id = ${m.id} AND de_id <> ${u.id} AND NOT lida`;
        const provas = await sql`SELECT * FROM provas WHERE match_id = ${m.id}`;
        out.push({
          id: Number(m.id), perfil: { id: m.outro, nome: m.nome, idade: m.idade, cidade: m.cidade, bio: m.bio, nivel: Number(m.nivel), foto: urlMidia(m.foto_id), livre: true,
            fotos: (Array.isArray(m.fotos) && m.fotos.length ? m.fotos : m.foto_id ? [m.foto_id] : []).map(urlMidia), melhores: Array.isArray(m.melhores) ? m.melhores : [] },
          ultima: ult ? mensagemPublica(ult, u.id) : null, naoLidas: Number(nl.n), novo: !ult,
          provaPedida: provaPublica(provas.find(p => p.de_id === u.id), u.id), provaParaMim: provaPublica(provas.find(p => p.para_id === u.id), u.id)
        });
      }
      return res.status(200).json({ matches: out });
    }

    if (b.acao === "mensagens") {
      const m = await matchDoUsuario(u, b.match);
      const lista = await sql`SELECT * FROM mensagens WHERE match_id = ${m.id} AND id > ${Number(b.depois) || 0} ORDER BY id LIMIT 300`;
      await sql`UPDATE mensagens SET lida = true WHERE match_id = ${m.id} AND de_id <> ${u.id} AND NOT lida`;
      const [vista] = await sql`SELECT id FROM mensagens WHERE match_id = ${m.id} AND de_id = ${u.id} AND lida ORDER BY id DESC LIMIT 1`;
      return res.status(200).json({ mensagens: lista.map(x => mensagemPublica(x, u.id)), lidaAte: vista ? Number(vista.id) : 0 });
    }

    // Pedir (ou trocar) a prova de um match: assunto do banco, 5 ou 10 perguntas, mínimo de acertos.
    if (b.acao === "pedirProva") {
      const m = await matchDoUsuario(u, b.match);
      const outro = m.a_id === u.id ? m.b_id : m.a_id;
      const assunto = String(b.assunto || "").slice(0, 40), qtd = b.qtd === 10 ? 10 : 5, minimo = Math.min(qtd, Math.max(1, Math.round(Number(b.minimo) || 0)));
      if (!nomeDoAssunto(assunto)) throw falha(400, "Assunto inválido.");
      if (perguntasDoAssunto(assunto).length < qtd) throw falha(400, "Esse assunto não tem perguntas suficientes.");
      const [atual] = await sql`SELECT * FROM provas WHERE match_id = ${m.id} AND de_id = ${u.id}`;
      if (atual && atual.status === "aprovada") throw falha(409, "Essa pessoa já passou na sua prova.");
      if (atual) await sql`UPDATE provas SET assunto = ${assunto}, qtd = ${qtd}, minimo = ${minimo}, usadas = ${atual.assunto === assunto ? JSON.stringify(atual.usadas) : "[]"}, atual = NULL WHERE id = ${atual.id}`;
      else await sql`INSERT INTO provas (match_id, de_id, para_id, assunto, qtd, minimo) VALUES (${m.id}, ${u.id}, ${outro}, ${assunto}, ${qtd}, ${minimo})`;
      await avisar(outro, "Pediram uma prova", `${eu && eu.nome ? eu.nome : "Seu match"} pede ${qtd} perguntas de ${nomeDoAssunto(assunto)} antes de conversar.`, { tipo: "prova", match: String(m.id) });
      const [p] = await sql`SELECT * FROM provas WHERE match_id = ${m.id} AND de_id = ${u.id}`;
      return res.status(200).json({ prova: provaPublica(p, u.id) });
    }
    // Começar uma tentativa: o servidor sorteia perguntas que ainda não caíram nesta prova.
    if (b.acao === "iniciarProva") {
      const m = await matchDoUsuario(u, b.match);
      const [p] = await sql`SELECT * FROM provas WHERE match_id = ${m.id} AND para_id = ${u.id}`;
      if (!p) throw falha(404, "Não há prova para fazer.");
      if (p.status === "aprovada") throw falha(409, "Você já passou nessa prova.");
      const usadas = new Set(Array.isArray(p.usadas) ? p.usadas : []);
      const livres = perguntasDoAssunto(p.assunto).filter(x => !usadas.has(x.chave));
      if (livres.length < p.qtd) throw falha(409, "Acabaram as perguntas novas desse assunto. Peça para trocar o assunto da prova.");
      for (let i = livres.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [livres[i], livres[j]] = [livres[j], livres[i]]; }
      const escolhidas = livres.slice(0, p.qtd).map(x => x.chave);
      await sql`UPDATE provas SET atual = ${JSON.stringify(escolhidas)} WHERE id = ${p.id}`;
      return res.status(200).json({ assunto: p.assunto, minimo: p.minimo, perguntas: escolhidas });
    }
    // Entregar a tentativa: respostas na ordem das perguntas sorteadas. Passou, a conversa abre e quem pediu é avisado.
    if (b.acao === "entregarProva") {
      const m = await matchDoUsuario(u, b.match);
      const [p] = await sql`SELECT * FROM provas WHERE match_id = ${m.id} AND para_id = ${u.id}`;
      if (!p || !Array.isArray(p.atual)) throw falha(400, "Comece a prova primeiro.");
      const banco = Object.fromEntries(perguntasDoAssunto(p.assunto).map(x => [x.chave, x.q]));
      const respostas = Array.isArray(b.respostas) ? b.respostas : [];
      const acertos = p.atual.filter((k, i) => banco[k] && typeof respostas[i] === "string" && respostas[i].trim() === banco[k][1]).length;
      const passou = acertos >= p.minimo;
      const usadas = [...new Set([...(Array.isArray(p.usadas) ? p.usadas : []), ...p.atual])];
      const melhor = Math.max(p.melhor || 0, acertos);
      if (passou) await sql`UPDATE provas SET status = 'aprovada', aprovada_em = now(), atual = NULL, usadas = ${JSON.stringify(usadas)}, tentativas = tentativas + 1, ultima = ${acertos}, melhor = ${melhor} WHERE id = ${p.id}`;
      else await sql`UPDATE provas SET atual = NULL, usadas = ${JSON.stringify(usadas)}, tentativas = tentativas + 1, ultima = ${acertos}, melhor = ${melhor} WHERE id = ${p.id}`;
      const nome = eu && eu.nome ? eu.nome : "Seu match";
      await avisar(p.de_id, passou ? "Passou na sua prova" : "Tentou sua prova", passou ? `${nome} passou na sua prova: ${acertos} de ${p.qtd}. A conversa está liberada.` : `${nome} fez ${acertos} de ${p.qtd} na sua prova.`, { tipo: "prova", match: String(m.id) });
      const [n] = await sql`SELECT * FROM provas WHERE id = ${p.id}`;
      return res.status(200).json({ acertos, passou, prova: provaPublica(n, u.id) });
    }

    if (b.acao === "enviar") {
      const m = await matchDoUsuario(u, b.match);
      const [provaPendente] = await sql`SELECT id FROM provas WHERE match_id = ${m.id} AND para_id = ${u.id} AND status = 'pendente'`;
      if (provaPendente) throw falha(403, "Passe na prova para poder conversar.");
      // Depois de 20 mensagens seguidas sem resposta, só dá para mandar outra quando a pessoa responder.
      const ultimas = await sql`SELECT de_id FROM mensagens WHERE match_id = ${m.id} ORDER BY id DESC LIMIT 20`;
      if (ultimas.length >= 20 && ultimas.every(x => x.de_id === u.id)) throw falha(429, "Você mandou 20 mensagens seguidas. Espere uma resposta para mandar mais.");
      const [{ n: porMinuto }] = await sql`SELECT count(*)::int AS n FROM mensagens WHERE de_id = ${u.id} AND criado_em > now() - interval '1 minute'`;
      if (porMinuto >= 30) throw falha(429, "Muitas mensagens em pouco tempo. Espere um pouco.");
      let texto = null, midia = null, dur = null;
      if (typeof b.audio === "string") {
        midia = await guardarMidia(u.id, b.audio, "audio");
        if (!midia) throw falha(400, "Áudio inválido ou grande demais.");
        dur = Math.max(1, Math.min(10, Math.round(Number(b.dur) || 1)));
      } else {
        texto = typeof b.texto === "string" ? b.texto.trim().slice(0, MAX_TEXTO) : "";
        if (!texto) throw falha(400, "Mensagem vazia.");
      }
      const [x] = await sql`INSERT INTO mensagens (match_id, de_id, texto, midia_id, dur) VALUES (${m.id}, ${u.id}, ${texto}, ${midia}, ${dur}) RETURNING *`;
      await avisar(m.a_id === u.id ? m.b_id : m.a_id, eu && eu.nome ? eu.nome : "Nova mensagem", texto ? texto.slice(0, 120) : "Enviou um áudio", { tipo: "mensagem", match: String(m.id) });
      return res.status(200).json({ mensagem: mensagemPublica(x, u.id) });
    }

    if (b.acao === "apagar") {
      const [x] = await sql`SELECT * FROM mensagens WHERE id = ${Number(b.id) || 0} AND de_id = ${u.id}`;
      if (!x) throw falha(404, "Mensagem não encontrada.");
      await sql`UPDATE mensagens SET apagada = true, texto = NULL, midia_id = NULL WHERE id = ${x.id}`;
      if (x.midia_id) await apagarMidias(await sql`SELECT id, url FROM midias WHERE id = ${x.midia_id} AND dono_id = ${u.id}`);
      return res.status(200).json({ ok: true });
    }

    if (b.acao === "desfazer") {
      const m = await matchDoUsuario(u, b.match);
      const outro = m.a_id === u.id ? m.b_id : m.a_id;
      // Os áudios da conversa somem junto, para os endereços antigos deixarem de funcionar.
      for (const x of await sql`SELECT midia_id FROM mensagens WHERE match_id = ${m.id} AND midia_id IS NOT NULL`) await apagarMidias(await sql`SELECT id, url FROM midias WHERE id = ${x.midia_id}`);
      await sql`DELETE FROM matches WHERE id = ${m.id}`;
      await sql`INSERT INTO avaliacoes (de_id, para_id, tipo) VALUES (${u.id}, ${outro}, 'passar') ON CONFLICT (de_id, para_id) DO UPDATE SET tipo = 'passar'`;
      return res.status(200).json({ ok: true });
    }

    if (b.acao === "registrarPush") {
      const token = typeof b.token === "string" ? b.token.trim().slice(0, 4096) : "";
      if (!token || !["ios", "android"].includes(b.plataforma)) throw falha(400, "Aparelho inválido.");
      await sql`INSERT INTO dispositivos (token, usuario_id, plataforma) VALUES (${token}, ${u.id}, ${b.plataforma})
        ON CONFLICT (token) DO UPDATE SET usuario_id = EXCLUDED.usuario_id, plataforma = EXCLUDED.plataforma, atualizado_em = now()`;
      return res.status(200).json({ ok: true });
    }

    throw falha(400, "Ação inválida.");
  } catch (e) {
    if (e && e.status) return res.status(e.status).json({ erro: e.erro });
    console.error(e);
    return res.status(500).json({ erro: "Erro no servidor. Tente de novo." });
  }
}
