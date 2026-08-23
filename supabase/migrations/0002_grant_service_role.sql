-- DocuMind — grant service_role table privileges
--
-- Tables created via a raw SQL migration (as opposed to Supabase Studio's
-- Table Editor, which auto-grants) do not automatically pick up
-- SELECT/INSERT/UPDATE/DELETE for service_role — only a handful of lower-
-- sensitivity privileges (REFERENCES/TRIGGER/TRUNCATE) are broadly
-- pre-granted by the local stack's bootstrap. service_role already has
-- rolbypassrls=true (confirmed via `select rolbypassrls from pg_roles`),
-- so RLS was never the blocker here — this was a plain missing GRANT,
-- surfaced as Postgres error 42501 "permission denied for table documents"
-- on the very first ingestion upsert.
--
-- service_role is the trusted, server-only backend role (never exposed to
-- the browser); anon/authenticated intentionally receive no additional
-- grants here — RLS on all four tables (see 0001_init.sql) already denies
-- them regardless, and this migration doesn't touch that.

grant select, insert, update, delete on public.documents to service_role;
grant select, insert, update, delete on public.document_chunks to service_role;
grant select, insert, update, delete on public.chat_sessions to service_role;
grant select, insert, update, delete on public.chat_messages to service_role;
