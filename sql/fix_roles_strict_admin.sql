-- CORRECCIÓN DE SEGURIDAD DE ROLES
-- Nuevos usuarios: invitado por defecto.
-- Admin SOLO si public.perfiles.rol = 'admin' se asigna explícitamente.

create or replace function public.manejar_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, email, rol)
  values (new.id, new.email, 'invitado')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

-- El trigger existente conserva su nombre; se recrea para usar la función estricta.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.manejar_nuevo_usuario();

-- IMPORTANTE: no se cambia automáticamente quién es admin.
-- Para designar al administrador, hazlo explícitamente, por ejemplo:
-- update public.perfiles set rol = 'admin' where id = 'UUID_DEL_ADMIN';
