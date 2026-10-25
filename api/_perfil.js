// Perfil público de cada pessoa, montado a partir do progresso salvo pelo app.
import crypto from "node:crypto";
import { sql } from "./_banco.js";
import { conferirFoto } from "./_foto.js";
import { put, del } from "@vercel/blob";
import { nomeDoAssunto } from "./_bancos.js";

const MAX_FOTO = 400000, MAX_AUDIO = 300000;
export const MAX_FOTOS = 5;
// Endereços de fotos e áudios levam uma assinatura: quem não recebeu o endereço do servidor não consegue montar outro.
// Assim o app nativo carrega a mídia direto numa <img> ou <audio>, sem cookie.
const SEGREDO = process.env.MIDIA_SEGREDO || crypto.createHash("sha256").update("jingar-midia:" + (process.env.DATABASE_URL || process.env.POSTGRES_URL || "")).digest("hex");
export const assinaturaMidia = id => crypto.createHmac("sha256", SEGREDO).update(String(id)).digest("base64url").slice(0, 32);
export const urlMidia = id => id ? `/api/midia?id=${id}&s=${assinaturaMidia(id)}` : null;
const curto = (x, max) => typeof x === "string" ? x.trim().slice(0, max) : null;
const numero = (x, min, max, padrao) => { const n = Number(x); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : padrao; };

// Guarda um arquivo enviado como data URL ("data:image/jpeg;base64,...") e devolve o id.
export async function guardarMidia(donoId, dataUrl, tipo) {
  const m = typeof dataUrl === "string" && dataUrl.match(/^data:([a-z]+\/[a-z0-9.+;=-]+);base64,([A-Za-z0-9+/=]+)$/i);
  if (!m) return null;
  const mime = m[1].split(";")[0].toLowerCase();
  if (tipo === "foto" && (!/^image\/(jpeg|png|webp)$/.test(mime) || dataUrl.length > MAX_FOTO)) return null;
  if (tipo === "audio" && (!mime.startsWith("audio/") || dataUrl.length > MAX_AUDIO)) return null;
  // Com o Vercel Blob configurado (BLOB_READ_WRITE_TOKEN), o arquivo vai para lá, privado; o banco guarda só o endereço.
  // Se o Blob falhar, o arquivo vai para o banco, como antes: o envio nunca quebra por causa do armazenamento.
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const ext = mime.split("/")[1].replace(/[^a-z0-9]/g, "") || "bin";
      const b = await put(`${tipo}s/${donoId}/${crypto.randomUUID()}.${ext}`, Buffer.from(m[2], "base64"), { access: "private", contentType: mime });
      const [r] = await sql`INSERT INTO midias (dono_id, tipo, mime, dados, url) VALUES (${donoId}, ${tipo}, ${mime}, '', ${b.url}) RETURNING id`;
      return r.id;
    } catch (e) { console.error("blob put", e); }
  }
  const [r] = await sql`INSERT INTO midias (dono_id, tipo, mime, dados) VALUES (${donoId}, ${tipo}, ${mime}, ${m[2]}) RETURNING id`;
  return r.id;
}
// Apaga mídias (as linhas e os arquivos no Blob). Recebe as linhas com id e url.
export async function apagarMidias(linhas) {
  const urls = linhas.map(x => x.url).filter(Boolean);
  if (urls.length && process.env.BLOB_READ_WRITE_TOKEN) await del(urls).catch(e => console.error("blob del", e));
  for (const x of linhas) await sql`DELETE FROM midias WHERE id = ${x.id}`;
}

// Foto nova (data URL): confere com o Claude se mostra uma pessoa e guarda. Lança erro com a mensagem para o usuário.
export async function guardarFotoConferida(donoId, dataUrl) {
  const m = typeof dataUrl === "string" && dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/i);
  if (!m || dataUrl.length > MAX_FOTO) return null;
  await conferirFoto(m[2], m[1].toLowerCase());
  return guardarMidia(donoId, dataUrl, "foto");
}
const idDaUrl = u => { const m = typeof u === "string" && u.match(/^\/api\/midia\?id=([0-9a-f-]{36})&s=([A-Za-z0-9_-]+)$/); return m && m[2] === assinaturaMidia(m[1]) ? m[1] : null; };

// Atualiza a linha em "perfis". Fotos novas (data URL) passam pela conferência e viram mídia no servidor;
// o app recebe os endereços na ordem. Fotos recusadas saem da lista.
export async function sincronizarPerfil(u, estado, local) {
  const p = estado && estado.perfil;
  if (!p || typeof p !== "object") return {};
  const entrada = (Array.isArray(p.fotos) ? p.fotos : p.foto ? [p.foto] : []).slice(0, MAX_FOTOS);
  const linhasFotos = await sql`SELECT id, url, criado_em FROM midias WHERE dono_id = ${u.id} AND tipo = 'foto'`;
  const minhas = new Set(linhasFotos.map(r => String(r.id)));
  const ids = []; let recusadas = 0;
  for (const f of entrada) {
    let id = idDaUrl(f);
    if (id && !minhas.has(id)) id = null;
    if (!id && typeof f === "string" && f.startsWith("data:image/")) {
      try { id = await guardarFotoConferida(u.id, f); } catch { recusadas++; }
    }
    if (id && !ids.includes(id)) ids.push(id);
  }
  // Fotos que saíram do perfil são apagadas (as enviadas há menos de 1 hora podem estar esperando o perfil ser salvo).
  const sobras = [...minhas].filter(id => !ids.includes(id));
  const umaHora = Date.now() - 3600000;
  await apagarMidias(linhasFotos.filter(x => sobras.includes(String(x.id)) && new Date(x.criado_em).getTime() < umaHora));
  const fotoId = ids[0] || null;
  const f = estado.filtros || {};
  // A posição fica arredondada em cerca de 1 km: serve para a distância, não para achar ninguém.
  const km = n => Math.round(n * 100) / 100;
  const lat = local && Number.isFinite(Number(local.lat)) ? km(numero(local.lat, -90, 90, null)) : null;
  const lng = local && Number.isFinite(Number(local.lng)) ? km(numero(local.lng, -180, 180, null)) : null;
  const interesse = ["F", "M", "T", "N"].includes(p.interesse) ? p.interesse : "N";
  const sexo = ["F", "M", "O"].includes(p.sexo) ? p.sexo : "O";
  const nivel = numero(estado.nivel, 0, 1e6, 0);
  const raio = f.raio == null ? null : Math.round(numero(f.raio, 1, 20000, 0)) || null;
  const idadeMin = Math.round(numero(f.idadeMin, 18, 99, 18)), idadeMax = Math.max(idadeMin, Math.round(numero(f.idadeMax, 18, 99, 99)));
  // Até 3 assuntos com mais acertos (com pelo menos 5 respostas), mostrados no cartão do Descobrir.
  const melhores = Object.entries(estado.porCat && typeof estado.porCat === "object" ? estado.porCat : {})
    .filter(([id, c]) => c && Number(c.r) >= 5 && nomeDoAssunto(id))
    .sort((a, b) => Number(b[1].a) / Number(b[1].r) - Number(a[1].a) / Number(a[1].r) || Number(b[1].a) - Number(a[1].a))
    .slice(0, 3).map(([id]) => nomeDoAssunto(id));
  await sql`INSERT INTO perfis (usuario_id, nome, idade, sexo, interesse, cidade, bio, foto_id, fotos, lat, lng, nivel, ver_min, vis_min, raio, idade_min, idade_max, melhores, atualizado_em)
    VALUES (${u.id}, ${curto(p.nome, 30)}, ${Math.round(numero(p.idade, 18, 120, 18))}, ${sexo}, ${interesse}, ${curto(p.cidade, 40)}, ${curto(p.bio, 140)}, ${fotoId}, ${JSON.stringify(ids)},
      ${lat}, ${lng}, ${nivel}, ${numero(f.verMin, 0, 1e6, 0)}, ${numero(f.visMin, 0, 1e6, 0)}, ${raio}, ${idadeMin}, ${idadeMax}, ${JSON.stringify(melhores)}, now())
    ON CONFLICT (usuario_id) DO UPDATE SET nome = EXCLUDED.nome, idade = EXCLUDED.idade, sexo = EXCLUDED.sexo, interesse = EXCLUDED.interesse,
      cidade = EXCLUDED.cidade, bio = EXCLUDED.bio, foto_id = EXCLUDED.foto_id, fotos = EXCLUDED.fotos, lat = EXCLUDED.lat, lng = EXCLUDED.lng, nivel = EXCLUDED.nivel,
      ver_min = EXCLUDED.ver_min, vis_min = EXCLUDED.vis_min, raio = EXCLUDED.raio, idade_min = EXCLUDED.idade_min, idade_max = EXCLUDED.idade_max,
      melhores = EXCLUDED.melhores, atualizado_em = now()`;
  return { fotos: ids.map(urlMidia), recusadas };
}
