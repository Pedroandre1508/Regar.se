create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)))
  on conflict do nothing;
  if lower(new.email) = 'pedroandre1508@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin') on conflict do nothing;
    update public.profiles set display_name = 'Pedro' where id = new.id;
  else
    insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  end if;
  return new;
end; $$;

insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where lower(email) = 'pedroandre1508@gmail.com'
on conflict do nothing;
update public.profiles set display_name = 'Pedro'
where id in (select id from auth.users where lower(email) = 'pedroandre1508@gmail.com');