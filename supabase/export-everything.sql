-- ============================================================================
-- DigiOne — Export EVERYTHING from Supabase (public schema)
-- Paste each block into Supabase Dashboard → SQL Editor and run.
-- Run them one at a time and copy the results, OR run all at once and read
-- each result set. These are read-only — they change nothing.
-- ============================================================================


-- ============================================================================
-- 1. ALL TABLES + COLUMNS (data types, nullability, defaults)
-- ============================================================================
select
  c.table_name,
  c.ordinal_position as pos,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default
from information_schema.columns c
join information_schema.tables t
  on t.table_schema = c.table_schema and t.table_name = c.table_name
where c.table_schema = 'public'
  and t.table_type = 'BASE TABLE'
order by c.table_name, c.ordinal_position;


-- ============================================================================
-- 2. ALL RLS POLICIES (this is what you asked for)
--    cmd = which operation (SELECT/INSERT/UPDATE/DELETE/ALL)
--    qual = USING expression, with_check = WITH CHECK expression
-- ============================================================================
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual          as using_expression,
  with_check    as with_check_expression
from pg_policies
where schemaname = 'public'
order by tablename, policyname;


-- ============================================================================
-- 3. WHICH TABLES HAVE RLS ENABLED
-- ============================================================================
select
  n.nspname  as schema,
  c.relname  as table,
  c.relrowsecurity   as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;


-- ============================================================================
-- 4. ALL INDEXES (full CREATE INDEX statements)
-- ============================================================================
select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;


-- ============================================================================
-- 5. ALL CONSTRAINTS (PK, FK, UNIQUE, CHECK)
-- ============================================================================
select
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name  as foreign_table,
  ccu.column_name as foreign_column
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
left join information_schema.constraint_column_usage ccu
  on tc.constraint_name = ccu.constraint_name and tc.table_schema = ccu.table_schema
where tc.table_schema = 'public'
order by tc.table_name, tc.constraint_type, tc.constraint_name;


-- ============================================================================
-- 6. ALL FUNCTIONS / RPCs (full source)
-- ============================================================================
select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_functiondef(p.oid) as full_definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname;


-- ============================================================================
-- 7. ALL TRIGGERS
-- ============================================================================
select
  event_object_table as table_name,
  trigger_name,
  action_timing,
  event_manipulation,
  action_statement
from information_schema.triggers
where trigger_schema = 'public'
order by event_object_table, trigger_name;


-- ============================================================================
-- 8. ALL ENUM TYPES + values
-- ============================================================================
select
  t.typname as enum_name,
  string_agg(e.enumlabel, ', ' order by e.enumsortorder) as values
from pg_type t
join pg_enum e on e.enumtypid = t.oid
join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public'
group by t.typname
order by t.typname;


-- ============================================================================
-- 9. ALL SEQUENCES
-- ============================================================================
select sequence_name, data_type, start_value, increment
from information_schema.sequences
where sequence_schema = 'public'
order by sequence_name;


-- ============================================================================
-- 10. STORAGE BUCKETS + their RLS policies
-- ============================================================================
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
order by name;

select policyname, cmd, qual as using_expression, with_check
from pg_policies
where schemaname = 'storage'
order by policyname;
