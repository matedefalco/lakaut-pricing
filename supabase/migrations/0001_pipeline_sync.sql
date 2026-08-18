-- ─── Sincronización con el pipeline de Google Sheets ────────────────────────
-- Extiende la tabla `clients` con los campos que vienen del Sheet "DB Empresas"
-- (Sales Pipeline V2) para que la cotizadora deje de tener un master manual y
-- pase a alimentarse desde el Sheet. Ver docs/sync-pipeline-sheet.md.
--
-- Clave de indexación: `empresa_id` (LK-E-2026-XXXX). Es el ID que ya existe en
-- el Sheet, único por empresa y siempre presente, así que sirve de clave técnica
-- estable para el upsert. El CUIT / razón social ARCA se guardan aparte y se usan
-- como nombre canónico cuando existen (antes de eso manda `name`, el nombre que
-- definís vos en el Sheet).
--
-- Todas las columnas son nullable: los clientes creados a mano antes de esta
-- migración siguen funcionando sin tocar nada. La importación los reconcilia por
-- nombre (les completa `empresa_id` en vez de duplicarlos).

alter table public.clients
	add column if not exists empresa_id        text,
	add column if not exists razon_social       text,
	add column if not exists cuit               text,
	add column if not exists tipo               text,   -- DIR / DIS / PAR (tipo de cliente en la cotizadora)
	add column if not exists tipo_pipeline      text,   -- valor crudo del Sheet: Cliente / Distribuidor / Partner / Interno
	add column if not exists etapa              text,   -- etapa del pipeline (Prospecto, Calificado, Negociación, …)
	add column if not exists probabilidad       numeric,
	add column if not exists industria          text,
	add column if not exists dri                text,
	add column if not exists tag                text,
	add column if not exists origen             text,
	add column if not exists notas              text,
	add column if not exists pipeline_synced_at timestamptz;

-- `empresa_id` es la clave natural del upsert desde el Sheet: única cuando está
-- presente, pero permite NULL para los clientes cargados a mano que todavía no se
-- reconciliaron. Un índice único parcial cubre exactamente ese caso.
create unique index if not exists clients_empresa_id_key
	on public.clients (empresa_id)
	where empresa_id is not null;

-- La Edge Function importa con la service role key (bypassa RLS), así que no
-- necesita policies nuevas. Las columnas quedan cubiertas por el SELECT que ya
-- usan los usuarios autenticados.
