-- ============================================================
-- ESQUEMA DE ROLES, CONFIGURACIÓN Y PERMISOS AUTOMÁTICOS
-- Ejecutar en Supabase: SQL Editor -> New query -> RUN
-- ============================================================

-- 1. TABLA DE PERFILES: vincula cada usuario con su rol ('admin' o 'invitado')
create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  rol text not null default 'invitado' check (rol in ('admin', 'invitado')),
  creado_en timestamptz default now()
);

-- 2. TABLAS DE VISIBILIDAD (esquema grados-informaticos, diseño 1:N normalizado)

-- TABLA PADRE: filas/temas completos
create table "grados-informaticos".filas (
  id serial primary key,
  rama text not null,
  asignatura text not null,
  trimestre text not null default '',
  seccion text not null check (seccion in ('apuntes', 'practicas')),
  nombre text not null,
  visible boolean not null default false,
  actualizado_en timestamptz default now(),
  unique (rama, asignatura, trimestre, seccion, nombre)
);

-- TABLA HIJA: archivos individuales dentro de cada fila
create table "grados-informaticos".archivos (
  id serial primary key,
  fila_id integer not null references "grados-informaticos".filas(id) on delete cascade,
  nombre text not null,
  visible boolean not null default true,
  actualizado_en timestamptz default now(),
  unique (fila_id, nombre)
);

-- 3. TABLA DE CONFIGURACIÓN DINÁMICA (Tokens en BD, sin archivos .js públicos)
create table if not exists public.configuracion (
  clave text primary key,
  valor text not null
);

-- 4. FUNCIÓN AUXILIAR: obtiene el rol del usuario autenticado
create or replace function public.rol_actual()
returns text
language sql
stable
security definer
as $$
  select coalesce(
    (select rol from public.perfiles where id = auth.uid() limit 1),
    'invitado'
  );
$$;

-- 5. TRIGGER AUTOMÁTICO: Asigna rol 'admin' automáticamente a la dueña y 'invitado' al resto
create or replace function public.manejar_nuevo_usuario()
returns trigger
language plpgsql
security definer
as $$
declare
  rol_asignar text := 'invitado';
begin
  if new.email ilike '%nataliagbarea%' or new.email ilike '%nataliagamezbarea%' or new.email ilike '%natalia%' then
    rol_asignar := 'admin';
  end if;

  insert into public.perfiles (id, email, rol)
  values (new.id, new.email, rol_asignar)
  on conflict (id) do update set 
    email = excluded.email, 
    rol = case when excluded.email ilike '%nataliagbarea%' or excluded.email ilike '%nataliagamezbarea%' or excluded.email ilike '%natalia%' then 'admin' else public.perfiles.rol end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.manejar_nuevo_usuario();

-- 6. ROW LEVEL SECURITY (RLS)
alter table public.perfiles enable row level security;
alter table "grados-informaticos".configuracion enable row level security;
alter table "grados-informaticos".filas enable row level security;
alter table "grados-informaticos".archivos enable row level security;

-- Perfiles: cada usuario lee su propio perfil
drop policy if exists "leer perfil propio" on public.perfiles;
create policy "leer perfil propio" on public.perfiles for select to authenticated using (auth.uid() = id);

-- Configuración: lectura pública, escritura solo admin
drop policy if exists "leer configuracion de la app" on "grados-informaticos".configuracion;
create policy "leer configuracion de la app" on "grados-informaticos".configuracion for select to public using (true);

drop policy if exists "solo admin inserta configuracion" on "grados-informaticos".configuracion;
create policy "solo admin inserta configuracion" on "grados-informaticos".configuracion for insert to authenticated with check (public.rol_actual() = 'admin');

drop policy if exists "solo admin actualiza configuracion" on "grados-informaticos".configuracion;
create policy "solo admin actualiza configuracion" on "grados-informaticos".configuracion for update to authenticated using (public.rol_actual() = 'admin') with check (public.rol_actual() = 'admin');

-- Filas: lectura pública, escritura solo autenticados
drop policy if exists "leer filas" on "grados-informaticos".filas;
create policy "leer filas" on "grados-informaticos".filas for select to public using (true);

drop policy if exists "escribir filas" on "grados-informaticos".filas;
create policy "escribir filas" on "grados-informaticos".filas for all to authenticated using (true) with check (true);

-- Archivos: lectura pública, escritura solo autenticados
drop policy if exists "leer archivos" on "grados-informaticos".archivos;
create policy "leer archivos" on "grados-informaticos".archivos for select to public using (true);

drop policy if exists "escribir archivos" on "grados-informaticos".archivos;
create policy "escribir archivos" on "grados-informaticos".archivos for all to authenticated using (true) with check (true);

-- Grants
grant usage on schema "grados-informaticos" to anon, authenticated, service_role;
grant all on all tables in schema "grados-informaticos" to anon, authenticated, service_role;
grant all on all sequences in schema "grados-informaticos" to anon, authenticated, service_role;

-- 7. GUARDAR REPOSITORIO EN LA BASE DE DATOS
insert into public.configuracion (clave, valor)
values 
  ('gh_repo', 'nataliagamezbarea/GRADOS_INFORMATICOS')
on conflict (clave) do update set valor = excluded.valor;

-- 8. ACTUALIZAR USUARIOS EXISTENTES (email de la dueña => admin)
--    También crea la fila en perfiles si el usuario ya existía antes del trigger.
insert into public.perfiles (id, email, rol)
select id, email,
       case when email ilike '%nataliagbarea%' or email ilike '%nataliagamezbarea%' or email ilike '%natalia%' then 'admin' else 'invitado' end
from auth.users
on conflict (id) do update set
  email = excluded.email,
  rol = case when excluded.email ilike '%nataliagbarea%' or excluded.email ilike '%nataliagamezbarea%' or excluded.email ilike '%natalia%' then 'admin' else public.perfiles.rol end;

-- 9. Los datos de filas y archivos se gestionan desde la app o el panel de Supabase.
