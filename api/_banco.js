// Banco Postgres compartilhado pelas funções (contas e moderação). Cria e atualiza as tabelas na primeira chamada.
import crypto from "node:crypto";
import { neon } from "@neondatabase/serverless";

const URL_BANCO = process.env.DATABASE_URL || process.env.POSTGRES_URL;
export const sql = URL_BANCO ? neon(URL_BANCO) : null;

// Segredos das assinaturas (endereços de fotos e perguntas da IA). Eram calculados a partir do endereço do banco;
// agora ficam guardados na tabela "segredos" com esse mesmo valor, e continuam valendo se a senha do banco mudar.
// MIDIA_SEGREDO e PONTOS_SEGREDO na Vercel, se existirem, têm prioridade.
const derivado = nome => crypto.createHash("sha256").update(`jingar-${nome}:` + (URL_BANCO || "")).digest("hex");
const segredos = {};
export const segredo = nome => process.env[nome === "midia" ? "MIDIA_SEGREDO" : "PONTOS_SEGREDO"] || segredos[nome] || derivado(nome);

let pronto = null;
// Na primeira chamada de cada instância, uma consulta só: se o esquema gravado no banco é o deste código, pula a criação
// das tabelas (são umas 40 idas ao banco, que deixavam lentos o login e as fotos). Mudou o código das tabelas, roda de novo.
export function prepararBanco() {
  if (!pronto) pronto = (async () => {
    let linhas = [];
    try { linhas = await sql`SELECT nome, valor FROM segredos`; } catch {}
    if (!linhas.some(r => r.nome === "esquema" && r.valor === VERSAO_ESQUEMA)) {
      await criarTabelas();
      await sql`INSERT INTO segredos (nome, valor) VALUES ('esquema', ${VERSAO_ESQUEMA}) ON CONFLICT (nome) DO UPDATE SET valor = EXCLUDED.valor`;
      linhas = await sql`SELECT nome, valor FROM segredos`;
    }
    for (const r of linhas) segredos[r.nome] = r.valor;
  })().catch(e => { pronto = null; throw e; });
  return pronto;
}
async function criarTabelas() {
    await sql`CREATE TABLE IF NOT EXISTS usuarios (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      usuario text UNIQUE, email text UNIQUE, senha_hash text,
      google_sub text UNIQUE, apple_sub text UNIQUE,
      estado jsonb, falhas int NOT NULL DEFAULT 0, bloqueado_ate timestamptz,
      criado_em timestamptz NOT NULL DEFAULT now())`;
    // Colunas novas: contas antigas continuam valendo como verificadas.
    await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefone text UNIQUE`;
    await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nascimento date`;
    await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS verificado boolean NOT NULL DEFAULT true`;
    await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS banido boolean NOT NULL DEFAULT false`;
    // Contas de teste (revisão das lojas): só enxergam e só são vistas por outras contas de teste.
    await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS teste boolean NOT NULL DEFAULT false`;
    // Nível calculado no servidor (as respostas são conferidas aqui) e avisos de match e mensagem ligados ou não.
    await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nivel numeric`;
    await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS avisos boolean NOT NULL DEFAULT true`;
    // Tipos de aviso que a pessoa desligou no Perfil: "match", "mensagem", "desafio", "prova".
    await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS avisos_desligados jsonb NOT NULL DEFAULT '[]'::jsonb`;
    await sql`CREATE TABLE IF NOT EXISTS sessoes (
      token_hash text PRIMARY KEY, usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, expira_em timestamptz NOT NULL)`;
    await sql`CREATE TABLE IF NOT EXISTS codigos (
      id bigserial PRIMARY KEY, usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      finalidade text NOT NULL, codigo_hash text NOT NULL, expira_em timestamptz NOT NULL,
      tentativas int NOT NULL DEFAULT 0, criado_em timestamptz NOT NULL DEFAULT now())`;
    await sql`ALTER TABLE codigos ADD COLUMN IF NOT EXISTS destino text`;
    await sql`CREATE TABLE IF NOT EXISTS denuncias (
      id bigserial PRIMARY KEY, denunciante_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
      alvo text NOT NULL, motivo text NOT NULL, texto text, status text NOT NULL DEFAULT 'aberta',
      criado_em timestamptz NOT NULL DEFAULT now(), resolvido_em timestamptz)`;
    // Cópia das últimas mensagens da conversa denunciada (a conversa é apagada ao denunciar; a moderação lê esta cópia).
    await sql`ALTER TABLE denuncias ADD COLUMN IF NOT EXISTS conversa jsonb`;
    // Pessoas reais: perfil público, fotos e áudios, curtidas, matches e mensagens.
    await sql`CREATE TABLE IF NOT EXISTS perfis (
      usuario_id uuid PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
      nome text, idade int, sexo text, interesse text, cidade text, bio text, foto_id uuid,
      lat double precision, lng double precision,
      nivel numeric NOT NULL DEFAULT 0, ver_min numeric NOT NULL DEFAULT 0, vis_min numeric NOT NULL DEFAULT 0, raio int,
      atualizado_em timestamptz NOT NULL DEFAULT now())`;
    // Até 5 fotos por perfil (ids de midias, na ordem); foto_id continua sendo a principal.
    await sql`ALTER TABLE perfis ADD COLUMN IF NOT EXISTS fotos jsonb`;
    await sql`ALTER TABLE perfis ADD COLUMN IF NOT EXISTS idade_min int`;
    // Quando a pessoa autorizou usar quem ela quer conhecer (dado sensível, art. 11 da LGPD). Sem autorização, o match fica desligado.
    await sql`ALTER TABLE perfis ADD COLUMN IF NOT EXISTS consentimento_em timestamptz`;
    await sql`ALTER TABLE perfis ADD COLUMN IF NOT EXISTS idade_max int`;
    await sql`ALTER TABLE perfis ADD COLUMN IF NOT EXISTS melhores jsonb`;
    // Cada pergunta respondida (primeira tentativa); repetida não soma nível.
    await sql`CREATE TABLE IF NOT EXISTS respostas (
      usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, chave text NOT NULL,
      criado_em timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (usuario_id, chave))`;
    // Limites por endereço de IP (guardado só como hash), por exemplo cadastros por hora.
    await sql`CREATE TABLE IF NOT EXISTS limites (
      id bigserial PRIMARY KEY, chave text NOT NULL, criado_em timestamptz NOT NULL DEFAULT now())`;
    await sql`CREATE TABLE IF NOT EXISTS ia_uso (
      id bigserial PRIMARY KEY, usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, criado_em timestamptz NOT NULL DEFAULT now())`;
    await sql`CREATE TABLE IF NOT EXISTS midias (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), dono_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      tipo text NOT NULL, mime text NOT NULL, dados text NOT NULL, criado_em timestamptz NOT NULL DEFAULT now())`;
    // Mídias novas ficam no Vercel Blob (url); as antigas continuam em "dados" (base64).
    await sql`ALTER TABLE midias ADD COLUMN IF NOT EXISTS url text`;
    await sql`CREATE TABLE IF NOT EXISTS avaliacoes (
      de_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, para_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      tipo text NOT NULL, criado_em timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (de_id, para_id))`;
    await sql`CREATE TABLE IF NOT EXISTS matches (
      id bigserial PRIMARY KEY, a_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      b_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, criado_em timestamptz NOT NULL DEFAULT now(), UNIQUE (a_id, b_id))`;
    await sql`CREATE TABLE IF NOT EXISTS mensagens (
      id bigserial PRIMARY KEY, match_id bigint NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      de_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, texto text, midia_id uuid, dur int,
      apagada boolean NOT NULL DEFAULT false, lida boolean NOT NULL DEFAULT false, criado_em timestamptz NOT NULL DEFAULT now())`;
    await sql`CREATE TABLE IF NOT EXISTS dispositivos (
      token text PRIMARY KEY, usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      plataforma text NOT NULL, atualizado_em timestamptz NOT NULL DEFAULT now())`;
    await sql`CREATE TABLE IF NOT EXISTS bloqueios (
      usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, alvo text NOT NULL,
      criado_em timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (usuario_id, alvo))`;
    // Categorias criadas pela IA, guardadas para todo mundo: quem pede o mesmo tema (e dificuldade) recebe as
    // perguntas prontas (as perguntas ficam em categoria_partes).
    await sql`CREATE TABLE IF NOT EXISTS categorias (
      id bigserial PRIMARY KEY, tema_norm text NOT NULL, dificuldade text NOT NULL, tema text, titulo text, titulo_norm text,
      aprovado boolean NOT NULL DEFAULT true, motivo text, sugestoes jsonb, peso numeric, subtemas jsonb,
      criador_id uuid REFERENCES usuarios(id) ON DELETE SET NULL, usos int NOT NULL DEFAULT 1,
      criado_em timestamptz NOT NULL DEFAULT now(), UNIQUE (tema_norm, dificuldade))`;
    // Perguntas de cada subtema numa linha própria: as partes chegam ao mesmo tempo e uma não apaga a outra.
    await sql`CREATE TABLE IF NOT EXISTS categoria_partes (
      categoria_id bigint NOT NULL REFERENCES categorias(id) ON DELETE CASCADE, subtema text NOT NULL, perguntas jsonb NOT NULL,
      criado_em timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (categoria_id, subtema))`;
    // Registro das ações da área admin (quem foi banido, desbanido, quando), para auditoria.
    await sql`CREATE TABLE IF NOT EXISTS admin_log (
      id bigserial PRIMARY KEY, acao text NOT NULL, alvo text, detalhe text, criado_em timestamptz NOT NULL DEFAULT now())`;
    // Prova pedida num match: quem pede (de_id) escolhe assunto, tamanho e mínimo de acertos; a outra pessoa (para_id)
    // só conversa depois de passar. Tentativas livres, sem repetir perguntas (usadas).
    await sql`CREATE TABLE IF NOT EXISTS provas (
      id bigserial PRIMARY KEY, match_id bigint NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      de_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, para_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      assunto text NOT NULL, qtd int NOT NULL, minimo int NOT NULL, status text NOT NULL DEFAULT 'pendente',
      usadas jsonb NOT NULL DEFAULT '[]', atual jsonb, tentativas int NOT NULL DEFAULT 0, ultima int, melhor int,
      criado_em timestamptz NOT NULL DEFAULT now(), aprovada_em timestamptz, UNIQUE (match_id, de_id))`;
    // Desafios por link curto (jingar.com.br/Ab3x) e o ranking de quem respondeu cada um.
    await sql`CREATE TABLE IF NOT EXISTS desafios (
      codigo text PRIMARY KEY, criador_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
      dados jsonb NOT NULL, ip_hash text, criado_em timestamptz NOT NULL DEFAULT now())`;
    // Desafio mandado num match: o resultado de cada tentativa aparece na conversa.
    await sql`ALTER TABLE desafios ADD COLUMN IF NOT EXISTS match_id bigint`;
    await sql`CREATE TABLE IF NOT EXISTS desafio_respostas (
      id bigserial PRIMARY KEY, codigo text NOT NULL REFERENCES desafios(codigo) ON DELETE CASCADE,
      jogador text NOT NULL, usuario_id uuid REFERENCES usuarios(id) ON DELETE CASCADE, nome text NOT NULL,
      acertos int NOT NULL, total int NOT NULL, criado_em timestamptz NOT NULL DEFAULT now(), UNIQUE (codigo, jogador))`;
    await sql`CREATE TABLE IF NOT EXISTS segredos (nome text PRIMARY KEY, valor text NOT NULL)`;
    for (const nome of ["midia", "pontos"]) await sql`INSERT INTO segredos (nome, valor) VALUES (${nome}, ${derivado(nome)}) ON CONFLICT (nome) DO NOTHING`;
}
const VERSAO_ESQUEMA = crypto.createHash("sha256").update(criarTabelas.toString()).digest("hex").slice(0, 16);
