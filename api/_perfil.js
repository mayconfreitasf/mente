// Perfil público de cada pessoa, montado a partir do progresso salvo pelo app.
import { sql } from "./_banco.js";

const MAX_FOTO = 400000, MAX_AUDIO = 300000;
export const urlMidia = id => id ? "/api/midia?id=" + id : null;
const curto = (x, max) => typeof x === "string" ? x.trim().slice(0, max) : null;
const numero = (x, min, max, padrao) => { const n = Number(x); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : padrao; };

// Guarda um arquivo enviado como data URL ("data:image/jpeg;base64,...") e devolve o id.
export async function guardarMidia(donoId, dataUrl, tipo) {
  const m = typeof dataUrl === "string" && dataUrl.match(/^data:([a-z]+\/[a-z0-9.+;=-]+);base64,([A-Za-z0-9+/=]+)$/i);
  if (!m) return null;
  const mime = m[1].split(";")[0].toLowerCase();
  if (tipo === "foto" && (!/^image\/(jpeg|png|webp)$/.test(mime) || dataUrl.length > MAX_FOTO)) return null;
  if (tipo === "audio" && (!mime.startsWith("audio/") || dataUrl.length > MAX_AUDIO)) return null;
  const [r] = await sql`INSERT INTO midias (dono_id, tipo, mime, dados) VALUES (${donoId}, ${tipo}, ${mime}, ${m[2]}) RETURNING id`;
  return r.id;
}

// Atualiza a linha em "perfis". Uma foto nova (data URL) vira mídia no servidor e o app recebe o endereço dela.
export async function sincronizarPerfil(u, estado, local) {
  const p = estado && estado.perfil;
  if (!p || typeof p !== "object") return {};
  const [atual] = await sql`SELECT foto_id FROM perfis WHERE usuario_id = ${u.id}`;
  let fotoId = atual ? atual.foto_id : null, fotoNova = null;
  if (typeof p.foto === "string" && p.foto.startsWith("data:image/")) {
    const id = await guardarMidia(u.id, p.foto, "foto");
    if (id) {
      if (fotoId) await sql`DELETE FROM midias WHERE id = ${fotoId} AND dono_id = ${u.id}`;
      fotoId = id; fotoNova = urlMidia(id);
    }
  } else if (!p.foto && fotoId) {
    await sql`DELETE FROM midias WHERE id = ${fotoId} AND dono_id = ${u.id}`;
    fotoId = null;
  }
  const f = estado.filtros || {};
  const lat = local && Number.isFinite(Number(local.lat)) ? numero(local.lat, -90, 90, null) : null;
  const lng = local && Number.isFinite(Number(local.lng)) ? numero(local.lng, -180, 180, null) : null;
  const interesse = ["F", "M", "T", "N"].includes(p.interesse) ? p.interesse : "N";
  const sexo = ["F", "M", "O"].includes(p.sexo) ? p.sexo : "O";
  const nivel = numero(estado.nivel, 0, 1e6, 0);
  const raio = f.raio == null ? null : Math.round(numero(f.raio, 1, 20000, 0)) || null;
  await sql`INSERT INTO perfis (usuario_id, nome, idade, sexo, interesse, cidade, bio, foto_id, lat, lng, nivel, ver_min, vis_min, raio, atualizado_em)
    VALUES (${u.id}, ${curto(p.nome, 30)}, ${Math.round(numero(p.idade, 18, 120, 18))}, ${sexo}, ${interesse}, ${curto(p.cidade, 40)}, ${curto(p.bio, 140)}, ${fotoId},
      ${lat}, ${lng}, ${nivel}, ${numero(f.verMin, 0, 1e6, 0)}, ${numero(f.visMin, 0, 1e6, 0)}, ${raio}, now())
    ON CONFLICT (usuario_id) DO UPDATE SET nome = EXCLUDED.nome, idade = EXCLUDED.idade, sexo = EXCLUDED.sexo, interesse = EXCLUDED.interesse,
      cidade = EXCLUDED.cidade, bio = EXCLUDED.bio, foto_id = EXCLUDED.foto_id, lat = EXCLUDED.lat, lng = EXCLUDED.lng, nivel = EXCLUDED.nivel,
      ver_min = EXCLUDED.ver_min, vis_min = EXCLUDED.vis_min, raio = EXCLUDED.raio, atualizado_em = now()`;
  return fotoNova ? { foto: fotoNova } : {};
}
