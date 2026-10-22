// Banco Postgres compartilhado pelas funções (contas e moderação). Cria e atualiza as tabelas na primeira chamada.
import { neon } from "@neondatabase/serverless";

const URL_BANCO = process.env.DATABASE_URL || process.env.POSTGRES_URL;
export const sql = URL_BANCO ? neon(URL_BANCO) : null;

let pronto = null;
export function prepararBanco() {
  if (!pronto) pronto = (async () => {
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
    await sql`CREATE TABLE IF NOT EXISTS sessoes (
      token_hash text PRIMARY KEY, usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, expira_em timestamptz NOT NULL)`;
    await sql`CREATE TABLE IF NOT EXISTS codigos (
      id bigserial PRIMARY KEY, usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      finalidade text NOT NULL, codigo_hash text NOT NULL, expira_em timestamptz NOT NULL,
      tentativas int NOT NULL DEFAULT 0, criado_em timestamptz NOT NULL DEFAULT now())`;
    await sql`CREATE TABLE IF NOT EXISTS denuncias (
      id bigserial PRIMARY KEY, denunciante_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
      alvo text NOT NULL, motivo text NOT NULL, texto text, status text NOT NULL DEFAULT 'aberta',
      criado_em timestamptz NOT NULL DEFAULT now(), resolvido_em timestamptz)`;
    // Pessoas reais: perfil público, fotos e áudios, curtidas, matches e mensagens.
    await sql`CREATE TABLE IF NOT EXISTS perfis (
      usuario_id uuid PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
      nome text, idade int, sexo text, interesse text, cidade text, bio text, foto_id uuid,
      lat double precision, lng double precision,
      nivel numeric NOT NULL DEFAULT 0, ver_min numeric NOT NULL DEFAULT 0, vis_min numeric NOT NULL DEFAULT 0, raio int,
      atualizado_em timestamptz NOT NULL DEFAULT now())`;
    await sql`CREATE TABLE IF NOT EXISTS midias (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), dono_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      tipo text NOT NULL, mime text NOT NULL, dados text NOT NULL, criado_em timestamptz NOT NULL DEFAULT now())`;
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
  })().catch(e => { pronto = null; throw e; });
  return pronto;
}
