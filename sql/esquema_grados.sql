-- ============================================================
-- ESQUEMA DE GRADOS INFORMÁTICOS
-- Compatible con la estructura que utiliza actualmente el código.
-- ============================================================
--
-- TABLAS UTILIZADAS POR LA APLICACIÓN:
--   public.perfiles
--   "grados-informaticos".filas
--   "grados-informaticos".archivos
--   "grados-informaticos".configuracion_privada
--   "grados-informaticos".configuracion_publica
--
-- El código actual NO utiliza:
--   "grados-informaticos".configuracion
-- para la configuración de GitHub/ajustes.
--
-- ============================================================

-- ============================================================
-- 1. ESQUEMA
-- ============================================================

create schema if not exists "grados-informaticos";


-- ============================================================
-- 2. PERFILES / ROLES
-- ============================================================

create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  rol text not null default 'invitado'
    check (rol in ('admin', 'invitado')),
  creado_en timestamptz not null default now()
);


-- ============================================================
-- 3. FILAS
--    Una fila representa un tema/contenido completo.
-- ============================================================

create table if not exists "grados-informaticos".filas (
  id serial primary key,
  rama text not null,
  asignatura text not null,
  trimestre text not null default '',
  seccion text not null
    check (seccion in ('apuntes', 'practicas')),
  nombre text not null,
  visible boolean not null default false,
  actualizado_en timestamptz not null default now(),

  unique (rama, asignatura, trimestre, seccion, nombre)
);


-- ============================================================
-- 4. ARCHIVOS
--    Cada archivo pertenece a una fila mediante fila_id.
-- ============================================================

create table if not exists "grados-informaticos".archivos (
  id serial primary key,
  fila_id integer not null
    references "grados-informaticos".filas(id)
    on delete cascade,
  nombre text not null,
  visible boolean not null default true,
  actualizado_en timestamptz not null default now(),

  unique (fila_id, nombre)
);


-- ============================================================
-- 5. CONFIGURACIÓN PRIVADA
--    La utiliza actualmente el código del ADMIN.
--
-- Claves utilizadas por el código:
--   gh_repo
--   gh_repo_general
--   gh_repo_publico
--   gh_repo_apuntes (Repositorio público worker para compilar LaTeX gratis)
--   gh_token
--   modo_oscuro
--   invitados_activos
--   descargar_curso
--   descargar_todas_clases
--   descargar_asignatura_todos
--   descargar_asignatura
-- ============================================================

create table if not exists "grados-informaticos".configuracion_privada (
  clave text primary key,
  valor text not null
);


-- ============================================================
-- 6. CONFIGURACIÓN PÚBLICA
--    La utiliza el Service Worker para los INVITADOS.
--
-- Claves utilizadas actualmente:
--   gh_repo_invitados
--   gh_token_invitados
-- ============================================================

create table if not exists "grados-informaticos".configuracion_publica (
  clave text primary key,
  valor text not null
);


-- ============================================================
-- 7. FUNCIÓN PARA OBTENER EL ROL DEL USUARIO ACTUAL
-- ============================================================

create or replace function public.rol_actual()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.rol
      from public.perfiles p
      where p.id = auth.uid()
      limit 1
    ),
    'invitado'
  );
$$;


-- ============================================================
-- 8. TRIGGER DE CREACIÓN DE PERFIL
-- ============================================================

create or replace function public.manejar_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- SEGURIDAD: ninguna cuenta obtiene admin por su email.
  -- El rol de administrador debe asignarse explícitamente en public.perfiles.
  insert into public.perfiles (id, email, rol)
  values (new.id, new.email, 'invitado')
  on conflict (id) do update
  set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.manejar_nuevo_usuario();


-- ============================================================
-- 9. RLS
-- ============================================================

alter table public.perfiles enable row level security;
alter table "grados-informaticos".filas enable row level security;
alter table "grados-informaticos".archivos enable row level security;
alter table "grados-informaticos".configuracion_privada enable row level security;
alter table "grados-informaticos".configuracion_publica enable row level security;


-- ============================================================
-- 10. POLÍTICAS DE PERFILES
-- ============================================================

drop policy if exists "leer perfil propio" on public.perfiles;

create policy "leer perfil propio"
on public.perfiles
for select
to authenticated
using (auth.uid() = id);


-- ============================================================
-- 11. POLÍTICAS DE FILAS
--
-- Lectura:
--   pública, para que la aplicación pueda consultar la visibilidad.
--
-- Escritura:
--   usuarios autenticados.
-- ============================================================

drop policy if exists "leer filas" on "grados-informaticos".filas;

create policy "leer filas"
on "grados-informaticos".filas
for select
to public
using (true);

drop policy if exists "escribir filas" on "grados-informaticos".filas;

create policy "escribir filas"
on "grados-informaticos".filas
for all
to authenticated
using (true)
with check (true);


-- ============================================================
-- 12. POLÍTICAS DE ARCHIVOS
-- ============================================================

drop policy if exists "leer archivos" on "grados-informaticos".archivos;

create policy "leer archivos"
on "grados-informaticos".archivos
for select
to public
using (true);

drop policy if exists "escribir archivos" on "grados-informaticos".archivos;

create policy "escribir archivos"
on "grados-informaticos".archivos
for all
to authenticated
using (true)
with check (true);


-- ============================================================
-- 13. POLÍTICAS DE CONFIGURACIÓN PRIVADA
--
-- SOLO un admin autenticado puede leer/escribir esta tabla.
-- anon no tiene permisos.
-- ============================================================

drop policy if exists "admin autenticado lee privada"
on "grados-informaticos".configuracion_privada;

create policy "admin autenticado lee privada"
on "grados-informaticos".configuracion_privada
for select
to authenticated
using (public.rol_actual() = 'admin');

drop policy if exists "admin autenticado escribe privada"
on "grados-informaticos".configuracion_privada;

create policy "admin autenticado escribe privada"
on "grados-informaticos".configuracion_privada
for all
to authenticated
using (public.rol_actual() = 'admin')
with check (public.rol_actual() = 'admin');


-- ============================================================
-- 14. POLÍTICAS DE CONFIGURACIÓN PÚBLICA
--
-- El Service Worker utiliza la anon key para leer:
--   gh_repo_invitados
--   gh_token_invitados
--
-- El admin autenticado puede escribirla.
-- ============================================================

drop policy if exists "anon lee configuracion publica"
on "grados-informaticos".configuracion_publica;

create policy "anon lee configuracion publica"
on "grados-informaticos".configuracion_publica
for select
to anon
using (true);

drop policy if exists "authenticated lee configuracion publica"
on "grados-informaticos".configuracion_publica;

create policy "authenticated lee configuracion publica"
on "grados-informaticos".configuracion_publica
for select
to authenticated
using (true);

drop policy if exists "admin autenticado escribe publica"
on "grados-informaticos".configuracion_publica;

create policy "admin autenticado escribe publica"
on "grados-informaticos".configuracion_publica
for all
to authenticated
using (public.rol_actual() = 'admin')
with check (public.rol_actual() = 'admin');


-- ============================================================
-- 15. GRANTS
-- ============================================================

grant usage on schema "grados-informaticos"
to anon, authenticated, service_role;

grant select on "grados-informaticos".filas
to anon, authenticated, service_role;

grant insert, update, delete
on "grados-informaticos".filas
to authenticated, service_role;

grant select on "grados-informaticos".archivos
to anon, authenticated, service_role;

grant insert, update, delete
on "grados-informaticos".archivos
to authenticated, service_role;

grant select, insert, update, delete
on "grados-informaticos".configuracion_privada
to authenticated, service_role;

grant select
on "grados-informaticos".configuracion_publica
to anon;

grant select, insert, update, delete
on "grados-informaticos".configuracion_publica
to authenticated, service_role;

grant usage, select
on all sequences in schema "grados-informaticos"
to authenticated, service_role;


-- ============================================================
-- 16. DATOS INICIALES DE CONFIGURACIÓN
--
-- NO se inventa ningún token.
-- Sustituye únicamente los valores *_AQUI por los reales.
-- ============================================================

insert into "grados-informaticos".configuracion_publica
  (clave, valor)
values
  ('gh_repo',
   'nataliagamezbarea/REPO_PUBLICO_AQUI'),
  ('gh_repo_general',
   'nataliagamezbarea/GRADOS_INFORMATICOS'),
  ('gh_token',
   'TOKEN_SOLO_LECTURA_LIMITADO_A_ESE_REPO_AQUI')
on conflict (clave) do update
set valor = excluded.valor;


insert into "grados-informaticos".configuracion_privada
  (clave, valor)
values
  ('gh_repo',
   'nataliagamezbarea/REPO_PUBLICO_AQUI'),
  ('gh_repo_general',
   'nataliagamezbarea/GRADOS_INFORMATICOS_GENERAL'),
  ('gh_repo_publico',
   'nataliagamezbarea/REPO_PUBLICO_AQUI'),
  ('gh_repo_apuntes',
   'nataliagamezbarea/REPO_APUNTES_PUBLICO_AQUI'),
  ('gh_token',
   'TOKEN_SOLO_LECTURA_LIMITADO_A_ESE_REPO_AQUI'),
  ('modo_oscuro', 'true'),
  ('invitados_activos', 'true'),
  ('descargar_curso', 'true'),
  ('descargar_todas_clases', 'true'),
  ('descargar_asignatura_todos', 'true'),
  ('descargar_asignatura', 'true')
on conflict (clave) do update
set valor = excluded.valor;


-- ============================================================
-- 17. SINCRONIZAR USUARIOS EXISTENTES
-- ============================================================

insert into public.perfiles (id, email, rol)
select id, email, 'invitado'
from auth.users
on conflict (id) do update
set email = excluded.email;


-- ============================================================
-- 18. ACTUALIZAR SECUENCIAS
-- ============================================================

select setval(
  pg_get_serial_sequence('"grados-informaticos".filas', 'id'),
  coalesce((select max(id) from "grados-informaticos".filas), 1)
);

select setval(
  pg_get_serial_sequence('"grados-informaticos".archivos', 'id'),
  coalesce((select max(id) from "grados-informaticos".archivos), 1)
);


-- ============================================================
-- FIN
-- ============================================================
